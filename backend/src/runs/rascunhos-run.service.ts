import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma, type StatusRascunhoRun, type Usuario } from "@prisma/client";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { ehViolacaoUnicidade } from "../comum/filtro-prisma.js";
import { CONFIGURACAO, type Configuracao } from "../configuracao.js";
import { PrismaService, type Tx } from "../prisma/prisma.service.js";
import {
  type EntradaParticipanteRascunho,
  type EntradaRascunhoRun,
  lerConfirmacao,
  type ReferenciaOrigem,
} from "./entrada-rascunho-run.js";
import { type ResultadoRegistro, RunsService } from "./runs.service.js";

/** Origem dos rascunhos recebidos pela integração com o bot. */
export const ORIGEM_NAG4EYES = "nag4eyes";

/** Por que um participante do rascunho ainda não pode entrar na run. */
export const PENDENCIAS = [
  "USUARIO_DESCONHECIDO",
  "SEM_VINCULO",
  "PERSONAGEM_NAO_ENCONTRADO",
  "PERSONAGEM_INATIVO",
  "PERSONAGEM_REPETIDO",
  "CLASSE_NAO_ENCONTRADA",
] as const;
export type Pendencia = (typeof PENDENCIAS)[number];

/**
 * Nomes de classe que o nag4eyes escreve diferente do catálogo LATAM (classes-latam.ts), já
 * normalizados. Fora daqui, a classe só é resolvida pelo nome exato (sem acento e maiúsculas).
 */
const APELIDOS_CLASSE: ReadonlyMap<string, string> = new Map([["falcao do vento", "falcao dos ventos"]]);

/** Compara nomes sem acento, maiúsculas nem espaços repetidos. */
export function normalizarNome(nome: string): string {
  return nome.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");
}

/** Nome de personagem: único sem diferenciar maiúsculas, mas acentos contam. */
const chavePersonagem = (nome: string) => nome.normalize("NFC").toLowerCase().trim();

interface IndiceClasses {
  oficial: Map<string, string | null>;
  apelido: Map<string, string | null>;
}

interface ParticipanteResolvido {
  ordem: number;
  discordId: string;
  personagemNome: string;
  classeNome: string | null;
  classeNomeIngles: string | null;
  classeSlug: string | null;
  jogadorId: string | null;
  personagemId: string | null;
  classeId: string | null;
  pendencia: Pendencia | null;
}

const SELECAO_DETALHE = {
  id: true,
  origem: true,
  idOrigem: true,
  partyId: true,
  data: true,
  status: true,
  recebidoEm: true,
  instanciaOrigem: true,
  instancia: { select: { id: true, nome: true } },
  runId: true,
  decididoPor: { select: { id: true, discordUsername: true } },
  decididoEm: true,
  motivoDescarte: true,
  participantes: {
    orderBy: { ordem: "asc" as const },
    select: {
      id: true,
      ordem: true,
      discordId: true,
      personagemNome: true,
      classeNome: true,
      pendencia: true,
      jogador: { select: { id: true, apelido: true } },
      personagem: { select: { id: true, nome: true } },
      classe: { select: { id: true, nomeOficial: true, apelidoGrupo: true } },
    },
  },
} satisfies Prisma.RascunhoRunSelect;

/**
 * Rascunhos de run vindos do nag4eyes: quem jogou já vem preenchido, casado pelo Discord id
 * (usuário → jogador vinculado → personagem). Nada pontua aqui; a confirmação passa pelo registro
 * normal (`RunsService.registrar`), na mesma transação que marca o rascunho como confirmado.
 */
@Injectable()
export class RascunhosRunService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly runs: RunsService,
    private readonly auditoria: AuditoriaService,
    @Inject(CONFIGURACAO) private readonly config: Configuracao,
  ) {}

  /** Instância cujo nome bate com o nome (ou o nome em inglês) da origem. Só resolve se houver uma. */
  private async resolverInstancia(tx: Tx, ref: ReferenciaOrigem | null): Promise<string | null> {
    if (ref === null) return null;
    const nomes = new Set([ref.nome, ref.nomeIngles].flatMap((n) => (n === null ? [] : [normalizarNome(n)])));
    const instancias = await tx.instancia.findMany({ select: { id: true, nome: true } });
    const [unica, ...outras] = instancias.filter((i) => nomes.has(normalizarNome(i.nome)));
    return unica !== undefined && outras.length === 0 ? unica.id : null;
  }

  /** Índices nome normalizado → classe, pelo nome oficial e pelo apelido do grupo (nulo se ambíguo). */
  private async indiceClasses(tx: Tx): Promise<IndiceClasses> {
    const classes = await tx.classe.findMany({ select: { id: true, nomeOficial: true, apelidoGrupo: true } });
    const indexar = (pares: [string, string][]) => {
      const indice = new Map<string, string | null>();
      for (const [nome, id] of pares) {
        const chave = normalizarNome(nome);
        const atual = indice.get(chave);
        indice.set(chave, atual === undefined || atual === id ? id : null);
      }
      return indice;
    };
    return {
      oficial: indexar(classes.map((c) => [c.nomeOficial, c.id])),
      apelido: indexar(classes.flatMap((c) => (c.apelidoGrupo === null ? [] : [[c.apelidoGrupo, c.id]]))),
    };
  }

  /**
   * Classe pelo nome em português (com os apelidos do nag4eyes) no nome oficial, depois pelo nome em
   * inglês no nome oficial e, por último, pelo nome em português no apelido do grupo. O nome em
   * inglês nunca é comparado com apelidos: "Sorcerer", por exemplo, é o apelido do Elementalista.
   */
  private static classeDe(indice: IndiceClasses, ref: ReferenciaOrigem | null): string | null {
    if (ref === null) return null;
    const pt = normalizarNome(ref.nome);
    const candidatos = [
      indice.oficial.get(APELIDOS_CLASSE.get(pt) ?? pt),
      ref.nomeIngles === null ? undefined : indice.oficial.get(normalizarNome(ref.nomeIngles)),
      indice.apelido.get(pt),
    ];
    return candidatos.find((id): id is string => typeof id === "string") ?? null;
  }

  /**
   * Casa cada participante pelo Discord id: usuário → jogador vinculado → personagem pelo nome.
   * A classe é a que a origem informou (a jogada no grupo); sem ela, a do cadastro do personagem.
   * Nada é adivinhado: o que não bater fica com a pendência e os dados crus.
   */
  private async resolverParticipantes(
    tx: Tx,
    lista: EntradaParticipanteRascunho[],
  ): Promise<ParticipanteResolvido[]> {
    const usuarios = await tx.usuario.findMany({
      where: { discordId: { in: [...new Set(lista.map((p) => p.discordId))] } },
      select: {
        discordId: true,
        jogador: {
          select: {
            id: true,
            personagens: { select: { id: true, nome: true, ativo: true, classeId: true } },
          },
        },
      },
    });
    const usuarioPorDiscord = new Map(usuarios.map((u) => [u.discordId, u]));
    const classes = await this.indiceClasses(tx);
    const usados = new Set<string>();

    return lista.map((p, ordem): ParticipanteResolvido => {
      const base = {
        ordem,
        discordId: p.discordId,
        personagemNome: p.personagem,
        classeNome: p.classe?.nome ?? null,
        classeNomeIngles: p.classe?.nomeIngles ?? null,
        classeSlug: p.classe?.slug ?? null,
      };
      const classeOrigem = RascunhosRunService.classeDe(classes, p.classe);
      const pendente = (
        pendencia: Pendencia,
        jogadorId: string | null = null,
        personagemId: string | null = null,
      ) => ({
        ...base,
        jogadorId,
        personagemId,
        classeId: classeOrigem,
        pendencia,
      });
      const usuario = usuarioPorDiscord.get(p.discordId);
      if (usuario === undefined) return pendente("USUARIO_DESCONHECIDO");
      if (usuario.jogador === null) return pendente("SEM_VINCULO");
      const jogador = usuario.jogador;
      const personagem = jogador.personagens.find(
        (x) => chavePersonagem(x.nome) === chavePersonagem(p.personagem),
      );
      if (personagem === undefined) return pendente("PERSONAGEM_NAO_ENCONTRADO", jogador.id);
      if (usados.has(personagem.id)) return pendente("PERSONAGEM_REPETIDO", jogador.id);
      usados.add(personagem.id);
      if (!personagem.ativo) return pendente("PERSONAGEM_INATIVO", jogador.id, personagem.id);
      const classeId = classeOrigem ?? personagem.classeId;
      return {
        ...base,
        jogadorId: jogador.id,
        personagemId: personagem.id,
        classeId,
        pendencia: classeId === null ? "CLASSE_NAO_ENCONTRADA" : null,
      };
    });
  }

  private resumo(r: {
    id: string;
    status: StatusRascunhoRun;
    participantes: { pendencia: string | null }[];
  }) {
    return {
      id: r.id,
      status: r.status,
      participantes: r.participantes.length,
      pendentes: r.participantes.filter((p) => p.pendencia !== null).length,
    };
  }

  /**
   * Recebe o rascunho da integração. Idempotente por `idOrigem`: um reenvio devolve o rascunho que
   * já existe (`criado: false`) sem mexer nele, qualquer que seja o status.
   */
  async receber(entrada: EntradaRascunhoRun) {
    if (this.config.guildId !== null && entrada.guildId !== this.config.guildId) {
      throw new UnprocessableEntityException("Este sistema atende outro servidor do Discord.");
    }
    const chave = { origem_idOrigem: { origem: ORIGEM_NAG4EYES, idOrigem: entrada.idOrigem } };
    const selecao = { id: true, status: true, participantes: { select: { pendencia: true } } } as const;
    const existente = await this.prisma.rascunhoRun.findUnique({ where: chave, select: selecao });
    if (existente !== null) return { ...this.resumo(existente), criado: false };
    try {
      const criado = await this.prisma.$transaction(async (tx) => {
        const instanciaId = await this.resolverInstancia(tx, entrada.instancia);
        const participantes = await this.resolverParticipantes(tx, entrada.participantes);
        const r = await tx.rascunhoRun.create({
          data: {
            origem: ORIGEM_NAG4EYES,
            idOrigem: entrada.idOrigem,
            partyId: entrada.partyId,
            data: entrada.data,
            instanciaId,
            instanciaOrigem: entrada.instancia === null ? Prisma.DbNull : { ...entrada.instancia },
            participantes: { create: participantes },
          },
          select: selecao,
        });
        await this.auditoria.registrar(
          {
            usuarioId: null,
            acao: "RASCUNHO_RUN_RECEBIDO",
            entidade: "rascunho_run",
            entidadeId: r.id,
            depois: { origem: ORIGEM_NAG4EYES, idOrigem: entrada.idOrigem, ...this.resumo(r) },
          },
          tx,
        );
        return r;
      });
      return { ...this.resumo(criado), criado: true };
    } catch (erro) {
      if (!ehViolacaoUnicidade(erro)) throw erro;
      const corrida = await this.prisma.rascunhoRun.findUniqueOrThrow({ where: chave, select: selecao });
      return { ...this.resumo(corrida), criado: false };
    }
  }

  async listar(status?: StatusRascunhoRun) {
    const rascunhos = await this.prisma.rascunhoRun.findMany({
      where: status === undefined ? {} : { status },
      orderBy: { recebidoEm: "desc" },
      take: 100,
      select: {
        id: true,
        origem: true,
        partyId: true,
        data: true,
        status: true,
        recebidoEm: true,
        instanciaOrigem: true,
        instancia: { select: { id: true, nome: true } },
        runId: true,
        participantes: { select: { pendencia: true } },
      },
    });
    return rascunhos.map(({ participantes, ...r }) => ({
      ...r,
      participantes: participantes.length,
      pendentes: participantes.filter((p) => p.pendencia !== null).length,
    }));
  }

  async detalhe(id: string, tx: Tx | PrismaService = this.prisma) {
    const r = await tx.rascunhoRun.findUnique({ where: { id }, select: SELECAO_DETALHE });
    if (r === null) throw new NotFoundException("Rascunho não encontrado.");
    return r;
  }

  /** Trava o rascunho e exige que ainda esteja pendente. */
  private async travarPendente(tx: Tx, id: string) {
    await tx.$queryRaw`SELECT id FROM rascunho_run WHERE id = ${id}::uuid FOR UPDATE`;
    const r = await tx.rascunhoRun.findUnique({ where: { id }, include: { participantes: true } });
    if (r === null) throw new NotFoundException("Rascunho não encontrado.");
    if (r.status !== "PENDENTE")
      throw new ConflictException("Este rascunho já foi confirmado ou descartado.");
    return r;
  }

  /**
   * Refaz o casamento dos participantes e da instância com o cadastro atual (ex.: depois de aprovar
   * um vínculo ou cadastrar o personagem que faltava). Só para rascunhos pendentes.
   */
  resolver(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const r = await this.travarPendente(tx, id);
      const instanciaOrigem = r.instanciaOrigem as ReferenciaOrigem | null;
      const instanciaId = r.instanciaId ?? (await this.resolverInstancia(tx, instanciaOrigem));
      const participantes = await this.resolverParticipantes(
        tx,
        r.participantes
          .sort((a, b) => a.ordem - b.ordem)
          .map((p) => ({
            discordId: p.discordId,
            personagem: p.personagemNome,
            classe:
              p.classeNome === null
                ? null
                : { nome: p.classeNome, nomeIngles: p.classeNomeIngles, slug: p.classeSlug },
          })),
      );
      await tx.rascunhoRun.update({ where: { id }, data: { instanciaId } });
      for (const p of participantes) {
        await tx.rascunhoRunParticipante.update({
          where: { rascunhoId_ordem: { rascunhoId: id, ordem: p.ordem } },
          data: {
            jogadorId: p.jogadorId,
            personagemId: p.personagemId,
            classeId: p.classeId,
            pendencia: p.pendencia,
          },
        });
      }
      return this.detalhe(id, tx);
    });
  }

  descartar(id: string, motivo: string | null, admin: Usuario) {
    return this.prisma.$transaction(async (tx) => {
      await this.travarPendente(tx, id);
      await tx.rascunhoRun.update({
        where: { id },
        data: {
          status: "DESCARTADO",
          decididoPorId: admin.id,
          decididoEm: new Date(),
          motivoDescarte: motivo,
        },
      });
      await this.auditoria.registrar(
        {
          usuarioId: admin.id,
          acao: "RASCUNHO_RUN_DESCARTADO",
          entidade: "rascunho_run",
          entidadeId: id,
          antes: { status: "PENDENTE" },
          depois: { status: "DESCARTADO", motivo },
        },
        tx,
      );
      return this.detalhe(id, tx);
    });
  }

  /**
   * Confirma o rascunho registrando a run pelo fluxo normal (mesma validação e cálculo). A run e a
   * marcação do rascunho são uma transação só: se outra confirmação chegar antes, nada é gravado.
   */
  async confirmar(
    id: string,
    corpo: unknown,
    admin: Usuario,
  ): Promise<ResultadoRegistro & { rascunhoId: string }> {
    const r = await this.prisma.rascunhoRun.findUnique({ where: { id }, include: { participantes: true } });
    if (r === null) throw new NotFoundException("Rascunho não encontrado.");
    if (r.status !== "PENDENTE")
      throw new ConflictException("Este rascunho já foi confirmado ou descartado.");
    const entrada = lerConfirmacao(corpo, {
      data: r.data,
      instanciaId: r.instanciaId,
      participantes: [...r.participantes].sort((a, b) => a.ordem - b.ordem),
    });
    const resultado = await this.runs.registrar(entrada, admin, async (tx, registro) => {
      const marcados = await tx.rascunhoRun.updateMany({
        where: { id, status: "PENDENTE" },
        data: {
          status: "CONFIRMADO",
          runId: registro.runId,
          decididoPorId: admin.id,
          decididoEm: new Date(),
        },
      });
      if (marcados.count !== 1) throw new ConflictException("Este rascunho já foi confirmado ou descartado.");
      await this.auditoria.registrar(
        {
          usuarioId: admin.id,
          acao: "RASCUNHO_RUN_CONFIRMADO",
          entidade: "rascunho_run",
          entidadeId: id,
          antes: { status: "PENDENTE" },
          depois: { status: "CONFIRMADO", runId: registro.runId },
        },
        tx,
      );
    });
    return { ...resultado, rascunhoId: id };
  }
}
