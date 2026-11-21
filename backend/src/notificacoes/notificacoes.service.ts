import { Inject, Injectable } from "@nestjs/common";
import type { Prisma, StatusNotificacao } from "@prisma/client";
import { CONFIGURACAO, type Configuracao } from "../configuracao.js";
import { PrismaService, type Tx } from "../prisma/prisma.service.js";
import type { DadosRunPontos, Destinatario, EventoNotificacao, ResumoRun } from "./eventos.js";

/** Tamanho do lote quando o nag4eyes não informa um. */
export const LOTE_PADRAO = 50;
/** Maior lote aceito por chamada. */
export const LOTE_MAXIMO = 100;
/** Por quanto tempo um lote fica reservado antes de voltar a ser entregue sem confirmação. */
export const RESERVA_MINUTOS = 5;
/** Entregas sem confirmação toleradas antes de a notificação ser dada como falha. */
export const MAXIMO_TENTATIVAS = 10;
/** Pendentes mais antigas que isso não interessam mais: viram falha ("expirada") sem envio. */
export const EXPIRA_PENDENTE_DIAS = 7;
/** Confirmadas (entregues ou falhas) são apagadas depois deste prazo. */
export const RETENCAO_DIAS = 30;

/** Uma notificação como sai no lote para o nag4eyes. */
export interface NotificacaoReservada {
  id: string;
  discordId: string;
  tipo: string;
  dados: unknown;
  criadaEm: string;
  /** 1 na primeira entrega; maior quando a anterior não foi confirmada a tempo. */
  tentativa: number;
}

/** Desfecho informado pelo nag4eyes para uma notificação. */
export interface ResultadoEntrega {
  id: string;
  status: Exclude<StatusNotificacao, "PENDENTE">;
  motivo: string | null;
}

/** Pontos de um jogador numa run, separados por origem. */
interface PontosRun {
  participacao: number;
  emprestimosPagos: number;
  emprestimosRecebidos: number;
}

/** Saldo líquido de uma run para o jogador. */
function liquido(p: PontosRun): number {
  return p.participacao - p.emprestimosPagos + p.emprestimosRecebidos;
}

/**
 * Caixa de saída das notificações por DM (contrato em ./eventos.ts).
 *
 * As gravações acontecem dentro da transação da mudança de negócio: se ela for desfeita, a
 * notificação também é. Com a integração desligada (sem INTEGRACAO_TOKEN) nada é gravado, porque
 * ninguém viria buscar. A entrega é "pelo menos uma vez": o nag4eyes reserva um lote, envia as DMs e
 * confirma; o que não for confirmado volta a ser entregue quando a reserva vence.
 */
@Injectable()
export class NotificacoesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONFIGURACAO) private readonly config: Configuracao,
  ) {}

  /** true quando há quem busque as notificações (INTEGRACAO_TOKEN configurado). */
  get ativa(): boolean {
    return this.config.tokenIntegracao !== null;
  }

  /**
   * Grava as notificações na transação `tx`. Destinatários sem usuário ativo vinculado são ignorados,
   * assim como o próprio autor da ação (`autorUsuarioId`). Devolve quantas foram gravadas.
   */
  async registrar(
    tx: Tx,
    itens: { destinatario: Destinatario; evento: EventoNotificacao }[],
    autorUsuarioId: string | null = null,
  ): Promise<number> {
    if (!this.ativa || itens.length === 0) return 0;
    const jogadorIds = itens.flatMap((i) =>
      "jogadorId" in i.destinatario ? [i.destinatario.jogadorId] : [],
    );
    const usuarioIds = itens.flatMap((i) =>
      "usuarioId" in i.destinatario ? [i.destinatario.usuarioId] : [],
    );
    const usuarios = await tx.usuario.findMany({
      where: { ativo: true, OR: [{ id: { in: usuarioIds } }, { jogador: { id: { in: jogadorIds } } }] },
      select: { id: true, discordId: true, jogador: { select: { id: true } } },
    });
    const porUsuario = new Map(usuarios.map((u) => [u.id, u]));
    const porJogador = new Map(usuarios.flatMap((u) => (u.jogador ? [[u.jogador.id, u] as const] : [])));

    const linhas = itens.flatMap(({ destinatario, evento }) => {
      const usuario =
        "jogadorId" in destinatario
          ? porJogador.get(destinatario.jogadorId)
          : porUsuario.get(destinatario.usuarioId);
      if (usuario === undefined || usuario.id === autorUsuarioId) return [];
      return [
        {
          discordId: usuario.discordId,
          tipo: evento.tipo,
          dados: evento.dados as unknown as Prisma.InputJsonObject,
        },
      ];
    });
    if (linhas.length === 0) return 0;
    await tx.notificacao.createMany({ data: linhas });
    return linhas.length;
  }

  /** Avisa cada jogador que teve lançamentos na run recém-registrada (RUN_PONTOS). */
  async registrarRun(tx: Tx, runId: string): Promise<number> {
    if (!this.ativa) return 0;
    const resumo = await this.resumoRun(tx, runId);
    const pontos = await this.pontosDaRun(tx, runId);
    return this.registrar(
      tx,
      [...pontos].map(([jogadorId, p]) => {
        const dados: DadosRunPontos = { ...resumo, ...p, pontos: liquido(p) };
        return { destinatario: { jogadorId }, evento: { tipo: "RUN_PONTOS" as const, dados } };
      }),
    );
  }

  /**
   * Avisa quem teve o saldo alterado pela correção (RUN_CORRIGIDA). Chamar depois de estornar a
   * original e gravar a nova, na mesma transação.
   */
  async registrarCorrecao(tx: Tx, runOriginalId: string, runNovaId: string): Promise<number> {
    if (!this.ativa) return 0;
    const resumo = await this.resumoRun(tx, runNovaId);
    const antes = await this.pontosDaRun(tx, runOriginalId);
    const depois = await this.pontosDaRun(tx, runNovaId);
    const jogadores = new Set([...antes.keys(), ...depois.keys()]);
    const itens = [...jogadores].flatMap((jogadorId) => {
      const a = antes.get(jogadorId);
      const d = depois.get(jogadorId);
      const pontosAntes = a === undefined ? 0 : liquido(a);
      const pontosDepois = d === undefined ? 0 : liquido(d);
      if (pontosAntes === pontosDepois) return [];
      return [
        {
          destinatario: { jogadorId },
          evento: {
            tipo: "RUN_CORRIGIDA" as const,
            dados: { ...resumo, runOriginalId, pontosAntes, pontosDepois },
          },
        },
      ];
    });
    return this.registrar(tx, itens);
  }

  private async resumoRun(tx: Tx, runId: string): Promise<ResumoRun> {
    const run = await tx.run.findUniqueOrThrow({
      where: { id: runId },
      select: {
        data: true,
        status: true,
        encontro: { select: { nome: true } },
        versaoInstancia: { select: { instancia: { select: { nome: true } } } },
      },
    });
    if (run.status === "ESTORNADA") throw new Error("Resumo de notificação pedido para uma run estornada.");
    return {
      runId,
      data: run.data.toISOString().slice(0, 10),
      instancia: run.versaoInstancia.instancia.nome,
      encontro: run.encontro.nome,
      status: run.status,
    };
  }

  /** Lançamentos originais da run (sem os estornos), somados por jogador. */
  private async pontosDaRun(tx: Tx, runId: string): Promise<Map<string, PontosRun>> {
    const lancamentos = await tx.lancamentoPontos.findMany({
      where: { runId, tipo: { in: ["PARTICIPACAO", "EMPRESTIMO_DEBITO", "EMPRESTIMO_CREDITO"] } },
      select: { jogadorId: true, tipo: true, valor: true },
      orderBy: { criadoEm: "asc" },
    });
    const porJogador = new Map<string, PontosRun>();
    for (const l of lancamentos) {
      const p = porJogador.get(l.jogadorId) ?? {
        participacao: 0,
        emprestimosPagos: 0,
        emprestimosRecebidos: 0,
      };
      if (l.tipo === "PARTICIPACAO") p.participacao += l.valor;
      else if (l.tipo === "EMPRESTIMO_DEBITO") p.emprestimosPagos += -l.valor;
      else p.emprestimosRecebidos += l.valor;
      porJogador.set(l.jogadorId, p);
    }
    return porJogador;
  }

  /**
   * Reserva até `limite` pendentes, das mais antigas para as mais novas, e as devolve. Cada uma fica
   * reservada por RESERVA_MINUTOS; sem confirmação nesse prazo, volta no lote seguinte. Antes, faz a
   * manutenção da fila (ver `manutencao`).
   */
  async reservar(limite: number): Promise<NotificacaoReservada[]> {
    await this.manutencao();
    const linhas = await this.prisma.$queryRaw<
      { id: string; discord_id: string; tipo: string; dados: unknown; criada_em: Date; tentativas: number }[]
    >`
      UPDATE notificacao n
      SET tentativas = n.tentativas + 1,
          reservada_ate = now() + make_interval(mins => ${RESERVA_MINUTOS}::int)
      FROM (
        SELECT id FROM notificacao
        WHERE status = 'PENDENTE' AND (reservada_ate IS NULL OR reservada_ate <= now())
        ORDER BY criada_em, id
        LIMIT ${limite}::int
        FOR UPDATE SKIP LOCKED
      ) alvo
      WHERE n.id = alvo.id
      RETURNING n.id, n.discord_id, n.tipo, n.dados, n.criada_em, n.tentativas`;
    return linhas
      .sort((a, b) => a.criada_em.getTime() - b.criada_em.getTime() || a.id.localeCompare(b.id))
      .map((l) => ({
        id: l.id,
        discordId: l.discord_id,
        tipo: l.tipo,
        dados: l.dados,
        criadaEm: l.criada_em.toISOString(),
        tentativa: l.tentativas,
      }));
  }

  /**
   * Registra o desfecho de cada notificação. Só muda as que ainda estão pendentes: repetir uma
   * confirmação, ou confirmar um ID desconhecido, não faz nada e o ID volta em `ignoradas`.
   */
  async confirmar(resultados: ResultadoEntrega[]): Promise<{ confirmadas: number; ignoradas: string[] }> {
    return this.prisma.$transaction(async (tx) => {
      let confirmadas = 0;
      const ignoradas: string[] = [];
      for (const r of resultados) {
        const { count } = await tx.notificacao.updateMany({
          where: { id: r.id, status: "PENDENTE" },
          data: { status: r.status, motivoFalha: r.motivo, confirmadaEm: new Date(), reservadaAte: null },
        });
        if (count === 1) confirmadas += 1;
        else ignoradas.push(r.id);
      }
      return { confirmadas, ignoradas };
    });
  }

  /**
   * Retenção da fila, feita a cada busca do nag4eyes (este sistema não tem agendador):
   * - pendente com mais de EXPIRA_PENDENTE_DIAS vira falha "expirada" (aviso velho não é enviado);
   * - pendente que já foi entregue MAXIMO_TENTATIVAS vezes sem confirmação vira falha;
   * - confirmada há mais de RETENCAO_DIAS é apagada.
   */
  async manutencao(): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE notificacao
      SET status = 'FALHOU', motivo_falha = 'expirada', confirmada_em = now(), reservada_ate = NULL
      WHERE status = 'PENDENTE' AND criada_em < now() - make_interval(days => ${EXPIRA_PENDENTE_DIAS}::int)`;
    await this.prisma.$executeRaw`
      UPDATE notificacao
      SET status = 'FALHOU', motivo_falha = 'sem confirmação', confirmada_em = now(), reservada_ate = NULL
      WHERE status = 'PENDENTE' AND tentativas >= ${MAXIMO_TENTATIVAS}::int AND reservada_ate <= now()`;
    await this.prisma.$executeRaw`
      DELETE FROM notificacao
      WHERE status <> 'PENDENTE' AND confirmada_em < now() - make_interval(days => ${RETENCAO_DIAS}::int)`;
  }
}
