import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { PecaDoEstoque, StatusSolicitacaoNebula, Usuario } from "@prisma/client";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { LedgerService } from "../ledger/ledger.service.js";
import { NotificacoesService } from "../notificacoes/notificacoes.service.js";
import { PrismaService, type Tx } from "../prisma/prisma.service.js";
import { ReceitasService } from "./receitas.service.js";

const DIA_MS = 86_400_000;

/** Status que contam no limite do período (D35): as canceladas e rejeitadas não contam. */
const CONTAM_NO_LIMITE: StatusSolicitacaoNebula[] = ["PENDENTE", "ENTREGUE"];

interface LoteGrupo {
  id: string;
  itemId: string;
  quantidade: number;
}

const SELECAO = {
  id: true,
  trazPeca: true,
  pecaDoEstoque: true,
  preco: true,
  status: true,
  motivo: true,
  criadaEm: true,
  entregueEm: true,
  encerradaEm: true,
  receita: { select: { id: true, nome: true } },
  precoReceita: { select: { versao: true } },
  jogador: { select: { id: true, apelido: true } },
  entreguePor: { select: { discordUsername: true } },
  encerradaPor: { select: { discordUsername: true } },
  movimentos: {
    where: { tipo: "NEBULA" as const },
    select: {
      quantidade: true,
      lote: { select: { ordem: true, item: { select: { id: true, nome: true, idJogo: true } } } },
    },
    orderBy: { lote: { ordem: "asc" as const } },
  },
};

type Linha = {
  movimentos: { quantidade: number; lote: { ordem: number; item: { id: string; nome: string } } }[];
};

/** Materiais por item (somados) e por lote, para a fila do admin e o histórico do membro. */
function comMateriais<T extends Linha>(s: T) {
  const porItem = new Map<string, { itemId: string; item: string; quantidade: number }>();
  for (const m of s.movimentos) {
    const atual = porItem.get(m.lote.item.id) ?? {
      itemId: m.lote.item.id,
      item: m.lote.item.nome,
      quantidade: 0,
    };
    atual.quantidade += -m.quantidade;
    porItem.set(m.lote.item.id, atual);
  }
  const { movimentos, ...resto } = s;
  return {
    ...resto,
    materiais: [...porItem.values()],
    lotes: movimentos.map((m) => ({ item: m.lote.item.nome, lote: m.lote.ordem, quantidade: -m.quantidade })),
  };
}

/**
 * Épico III, M11 (T-43, T-44): solicitação de Nebula.
 *
 * - D30: o membro fabrica; o sistema entrega os MATERIAIS (a Nebulosa não passa pelo estoque).
 * - D31: a peça Astral o membro traz, ou sai do estoque: pronta, ou os materiais dela.
 * - D32: dois preços, conforme a peça; o preço e a versão ficam gravados na solicitação.
 * - D33: só lotes do grupo, incluindo a reserva mínima; consumo por ordem de chegada (D27).
 * - D34: o estoque é baixado na solicitação. D36: o membro cancela, o admin rejeita (com motivo).
 */
@Injectable()
export class NebulaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly auditoria: AuditoriaService,
    private readonly receitas: ReceitasService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  /** D12: só membro com vínculo aprovado. */
  private async jogadorDe(usuario: Usuario, tx: Tx | PrismaService = this.prisma): Promise<string> {
    const j = await tx.jogador.findUnique({ where: { usuarioId: usuario.id }, select: { id: true } });
    if (j === null) throw new ForbiddenException("Seu vínculo com um jogador ainda não foi aprovado.");
    return j.id;
  }

  private async noPeriodo(tx: Tx | PrismaService, jogadorId: string, receitaId: string, dias: number) {
    return tx.solicitacaoNebula.count({
      where: {
        jogadorId,
        receitaId,
        status: { in: CONTAM_NO_LIMITE },
        criadaEm: { gte: new Date(Date.now() - dias * DIA_MS) },
      },
    });
  }

  /** US-17: receitas abertas com disponibilidade, preços, limite restante e o saldo do membro. */
  async vitrine(usuario: Usuario) {
    const jogadorId = await this.jogadorDe(usuario);
    const receitas = await this.receitas.abertas();
    const comLimite = [];
    for (const r of receitas) {
      const limiteRestante =
        r.limitePorMembro === null || r.limitePeriodoDias === null
          ? null
          : Math.max(
              0,
              r.limitePorMembro - (await this.noPeriodo(this.prisma, jogadorId, r.id, r.limitePeriodoDias)),
            );
      comLimite.push({ ...r, limiteRestante });
    }
    return { saldo: await this.ledger.saldo(jogadorId), receitas: comLimite };
  }

  /** Lotes ativos do grupo dos itens, na ordem de chegada, com a quantidade atual. */
  private async lotesDoGrupo(tx: Tx, itens: string[]): Promise<LoteGrupo[]> {
    const linhas = await tx.$queryRaw<{ id: string; item_id: string; quantidade: bigint }[]>`
      SELECT l.id, l.item_id, COALESCE(SUM(m.quantidade), 0)::bigint AS quantidade
      FROM lote_estoque l LEFT JOIN movimento_estoque m ON m.lote_id = l.id
      WHERE l.item_id = ANY(${itens}::uuid[]) AND l.ativo AND l.dono_jogador_id IS NULL
      GROUP BY l.id ORDER BY l.ordem`;
    return linhas.map((l) => ({ id: l.id, itemId: l.item_id, quantidade: Number(l.quantidade) }));
  }

  /** US-18 (T-43): tudo numa transação, com o jogador e os lotes travados. */
  async solicitar(usuario: Usuario, receitaId: string, trazPecaPedido: boolean) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Vínculo e trava do jogador: duas solicitações dele passam uma de cada vez.
      const jogadorId = await this.jogadorDe(usuario, tx);
      await tx.$queryRaw`SELECT id FROM jogador WHERE id = ${jogadorId}::uuid FOR UPDATE`;

      // 2. Receita ativa, solicitável e com preço vigente (CT-120).
      const receita = await tx.receita.findUnique({
        where: { id: receitaId },
        include: {
          componentes: { include: { item: { select: { nome: true } } } },
          precos: { orderBy: { versao: "desc" }, take: 1 },
          pecaDe: { include: { receitaPeca: { include: { componentes: true } } } },
        },
      });
      if (receita === null) throw new NotFoundException("Receita não encontrada.");
      if (!receita.ativa || !receita.solicitavel) {
        throw new UnprocessableEntityException("Esta receita não está aberta para solicitação.");
      }
      const preco = receita.precos[0];
      if (preco === undefined) throw new UnprocessableEntityException("Esta receita ainda não tem preço.");

      // Sem peça-base na receita, não há peça a trazer: vale o preço "trazendo a peça".
      const peca = receita.componentes.find((c) => c.pecaBase) ?? null;
      const trazPeca = peca === null ? true : trazPecaPedido;
      const valor = trazPeca ? preco.precoTrazendoPeca : preco.precoComPeca;

      // 3. Limite do período (D35, CT-117).
      if (receita.limitePorMembro !== null && receita.limitePeriodoDias !== null) {
        const ja = await this.noPeriodo(tx, jogadorId, receitaId, receita.limitePeriodoDias);
        if (ja >= receita.limitePorMembro) {
          throw new ConflictException(
            `Limite de ${receita.limitePorMembro} a cada ${receita.limitePeriodoDias} dia(s) atingido para ${receita.nome}.`,
          );
        }
      }

      // 4. Trava os lotes do grupo de todos os itens possíveis, em ordem de item (sem impasse, CT-126).
      const materiais = receita.componentes.filter((c) => !c.pecaBase);
      const daPeca = receita.pecaDe?.receitaPeca.componentes ?? [];
      const itens = [
        ...new Set([
          ...materiais.map((c) => c.itemId),
          ...(trazPeca || peca === null ? [] : [peca.itemId, ...daPeca.map((c) => c.itemId)]),
        ]),
      ].sort();
      await tx.$queryRaw`
        SELECT id FROM lote_estoque
        WHERE item_id = ANY(${itens}::uuid[]) AND ativo AND dono_jogador_id IS NULL
        ORDER BY item_id, ordem FOR UPDATE`;
      const lotes = await this.lotesDoGrupo(tx, itens);
      const tenho = new Map<string, number>();
      for (const l of lotes) tenho.set(l.itemId, (tenho.get(l.itemId) ?? 0) + Math.max(0, l.quantidade));

      // O que sai do estoque: os materiais e, se a peça vem do estoque, a peça pronta ou os materiais dela (D31).
      const precisa = new Map<string, number>();
      const somar = (itemId: string, q: number) => precisa.set(itemId, (precisa.get(itemId) ?? 0) + q);
      for (const c of materiais) somar(c.itemId, c.quantidade);
      let pecaDoEstoque: PecaDoEstoque | null = null;
      if (!trazPeca && peca !== null) {
        if ((tenho.get(peca.itemId) ?? 0) >= peca.quantidade) {
          pecaDoEstoque = "PRONTA";
          somar(peca.itemId, peca.quantidade);
        } else if (daPeca.length > 0) {
          pecaDoEstoque = "MATERIAIS";
          for (const c of daPeca) somar(c.itemId, c.quantidade * peca.quantidade);
        } else {
          throw new ConflictException(`Não há ${peca.item.nome} no estoque do grupo.`);
        }
      }
      const faltas = [...precisa].filter(([item, q]) => (tenho.get(item) ?? 0) < q);
      if (faltas.length > 0) {
        const nomes = new Map(
          (
            await tx.itemCatalogo.findMany({
              where: { id: { in: faltas.map(([i]) => i) } },
              select: { id: true, nome: true },
            })
          ).map((i) => [i.id, i.nome]),
        );
        throw new ConflictException(
          `Falta material no estoque do grupo: ${faltas
            .map(([i, q]) => `${nomes.get(i) ?? "?"} (tem ${tenho.get(i) ?? 0}, precisa ${q})`)
            .join("; ")}.`,
        );
      }

      // 5. Saldo nunca negativo (CT-116).
      const saldo = await this.ledger.saldoTx(tx, jogadorId);
      if (saldo < valor) {
        throw new UnprocessableEntityException(
          `Saldo insuficiente: a Nebula custa ${valor} e você tem ${saldo}.`,
        );
      }

      // 6. Grava a solicitação, a baixa por ordem de chegada e o débito.
      const s = await tx.solicitacaoNebula.create({
        data: { jogadorId, receitaId, trazPeca, pecaDoEstoque, preco: valor, precoReceitaId: preco.id },
      });
      for (const [itemId, q] of precisa) {
        let falta = q;
        for (const l of lotes) {
          if (falta === 0) break;
          if (l.itemId !== itemId || l.quantidade <= 0) continue;
          const tirar = Math.min(l.quantidade, falta);
          falta -= tirar;
          l.quantidade -= tirar;
          await tx.movimentoEstoque.create({
            data: {
              loteId: l.id,
              quantidade: -tirar,
              tipo: "NEBULA",
              solicitacaoNebulaId: s.id,
              criadoPorId: usuario.id,
            },
          });
        }
      }
      await this.ledger.lancar(tx, {
        jogadorId,
        valor: -valor,
        tipo: "NEBULA",
        criadoPorId: usuario.id,
        solicitacaoNebulaId: s.id,
        observacao: `${receita.nome}${trazPeca ? " (trazendo a peça)" : ""}`,
      });
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          acao: "NEBULA_SOLICITACAO",
          entidade: "solicitacao_nebula",
          entidadeId: s.id,
          depois: { receita: receita.nome, trazPeca, pecaDoEstoque, preco: valor, versaoPreco: preco.versao },
        },
        tx,
      );
      return { solicitacaoId: s.id, preco: valor, pecaDoEstoque, saldo: saldo - valor };
    });
  }

  /** US-20: as solicitações do próprio membro, das mais novas para as mais antigas. */
  async minhas(usuario: Usuario) {
    const jogadorId = await this.jogadorDe(usuario);
    const lista = await this.prisma.solicitacaoNebula.findMany({
      where: { jogadorId },
      orderBy: { criadaEm: "desc" },
      select: SELECAO,
    });
    return lista.map(comMateriais);
  }

  /** US-19: fila do admin. Pendentes das mais antigas para as mais novas; as demais, das mais novas. */
  async fila(status: StatusSolicitacaoNebula | null) {
    const lista = await this.prisma.solicitacaoNebula.findMany({
      where: status === null ? {} : { status },
      orderBy: { criadaEm: status === "PENDENTE" ? "asc" : "desc" },
      take: 200,
      select: SELECAO,
    });
    return lista.map(comMateriais);
  }

  private async detalhe(tx: Tx, id: string) {
    return comMateriais(await tx.solicitacaoNebula.findUniqueOrThrow({ where: { id }, select: SELECAO }));
  }

  /** Trava a solicitação e confere que ainda está pendente. */
  private async travarPendente(tx: Tx, id: string) {
    await tx.$queryRaw`SELECT id FROM solicitacao_nebula WHERE id = ${id}::uuid FOR UPDATE`;
    const s = await tx.solicitacaoNebula.findUnique({
      where: { id },
      include: { movimentos: { where: { tipo: "NEBULA" } }, receita: { select: { nome: true } } },
    });
    if (s === null) throw new NotFoundException("Solicitação não encontrada.");
    if (s.status !== "PENDENTE") {
      const r = { ENTREGUE: "já foi entregue", CANCELADA: "já foi cancelada", REJEITADA: "já foi rejeitada" };
      throw new ConflictException(`Esta solicitação ${r[s.status]}.`);
    }
    return s;
  }

  /** US-19: o admin entrega os materiais no jogo. O estoque já foi baixado na solicitação. */
  async entregar(id: string, admin: Usuario) {
    return this.prisma.$transaction(async (tx) => {
      const s = await this.travarPendente(tx, id);
      await tx.solicitacaoNebula.update({
        where: { id },
        data: { status: "ENTREGUE", entregueEm: new Date(), entreguePorId: admin.id },
      });
      await this.notificacoes.registrar(tx, [
        {
          destinatario: { jogadorId: s.jogadorId },
          evento: { tipo: "NEBULA_ENTREGUE", dados: { solicitacaoId: id, receita: s.receita.nome } },
        },
      ]);
      await this.auditoria.registrar(
        { usuarioId: admin.id, acao: "NEBULA_ENTREGA", entidade: "solicitacao_nebula", entidadeId: id },
        tx,
      );
      return this.detalhe(tx, id);
    });
  }

  /**
   * D36: o membro cancela a própria pendente; o admin rejeita qualquer pendente, com motivo.
   * Estorna o débito e devolve cada material ao lote de onde saiu (CT-114, CT-127).
   */
  async encerrar(id: string, usuario: Usuario, motivo: string | null, comoAdmin: boolean) {
    return this.prisma.$transaction(async (tx) => {
      const s = await this.travarPendente(tx, id);
      if (!comoAdmin) {
        const proprio = await this.jogadorDe(usuario, tx);
        if (s.jogadorId !== proprio) throw new ForbiddenException("Esta solicitação não é sua.");
      } else if (motivo === null) {
        throw new BadRequestException("Informe o motivo da rejeição.");
      }
      const rotulo = comoAdmin ? "rejeitada" : "cancelada";
      await this.ledger.estornarSolicitacaoNebula(
        tx,
        id,
        usuario.id,
        `Nebula ${rotulo}: ${s.receita.nome}${motivo ? ` (${motivo})` : ""}`,
      );
      for (const m of s.movimentos) {
        await tx.movimentoEstoque.create({
          data: {
            loteId: m.loteId,
            quantidade: -m.quantidade,
            tipo: "DEVOLUCAO",
            solicitacaoNebulaId: id,
            criadoPorId: usuario.id,
          },
        });
      }
      await tx.solicitacaoNebula.update({
        where: { id },
        data: {
          status: comoAdmin ? "REJEITADA" : "CANCELADA",
          motivo,
          encerradaEm: new Date(),
          encerradaPorId: usuario.id,
        },
      });
      if (comoAdmin) {
        await this.notificacoes.registrar(
          tx,
          [
            {
              destinatario: { jogadorId: s.jogadorId },
              evento: {
                tipo: "NEBULA_REJEITADA",
                dados: { solicitacaoId: id, receita: s.receita.nome, pontos: s.preco, motivo },
              },
            },
          ],
          usuario.id,
        );
      }
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          acao: comoAdmin ? "NEBULA_REJEICAO" : "NEBULA_CANCELAMENTO",
          entidade: "solicitacao_nebula",
          entidadeId: id,
          depois: { motivo },
        },
        tx,
      );
      return this.detalhe(tx, id);
    });
  }
}
