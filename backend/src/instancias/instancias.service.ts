import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { DificuldadeInstancia, ModoInstancia, Prisma, RetornoInstancia, Usuario } from "@prisma/client";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { ehViolacaoUnicidade } from "../comum/filtro-prisma.js";
import { PrismaService, type Tx } from "../prisma/prisma.service.js";

/** A Torre da Constelação: a instância criada na migração do M15, com os dados de antes. */
export const CODIGO_TORRE = "TORRE_CONSTELACAO";
/** Prefixo do código das instâncias que vêm do catálogo da browiki (D56). */
export const PREFIXO_BROWIKI = "BROWIKI_";

export interface DadosInstancia {
  nome?: string;
  ativa?: boolean;
  nivelMinimo?: number | null;
  retorno?: RetornoInstancia | null;
  modo?: ModoInstancia | null;
  dificuldade?: DificuldadeInstancia | null;
  requisito?: string | null;
  premiacao?: string | null;
}

export interface NovoEncontro {
  nome: string;
  multiplicadorCentesimos: number;
}

export interface NovaFuncao {
  classeId: string;
  nome: string;
  rank: number;
  padrao: boolean;
}

const INCLUIR_VERSAO = {
  instancia: { select: { id: true, nome: true } },
  encontros: { orderBy: { ordem: "asc" as const } },
  funcoes: {
    include: { classe: { select: { id: true, nomeOficial: true, apelidoGrupo: true, ativa: true } } },
    orderBy: [{ rank: "desc" as const }, { nome: "asc" as const }],
  },
  criadaPor: { select: { discordUsername: true } },
} satisfies Prisma.VersaoInstanciaInclude;

export type VersaoCompleta = Prisma.VersaoInstanciaGetPayload<{ include: typeof INCLUIR_VERSAO }>;

/**
 * T-59 (D43 a D46): instâncias cadastradas pelo gestor, cada uma com encontros (multiplicador) e
 * funções e ranks próprios, versionados. Uma versão nunca muda: alterar é criar a seguinte.
 */
@Injectable()
export class InstanciasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  /** Versão vigente (a de número maior) com encontros e funções. */
  async vigente(tx: Tx | PrismaService, instanciaId: string): Promise<VersaoCompleta | null> {
    return tx.versaoInstancia.findFirst({
      where: { instanciaId },
      orderBy: { versao: "desc" },
      include: INCLUIR_VERSAO,
    });
  }

  /** A Torre (instância padrão de quem não informa instância, como os clientes antigos). */
  async torre(tx: Tx | PrismaService = this.prisma) {
    const t = await tx.instancia.findUnique({ where: { codigo: CODIGO_TORRE } });
    if (t === null) throw new NotFoundException("Torre da Constelação não cadastrada.");
    return t;
  }

  private formatar(i: Prisma.InstanciaGetPayload<object>, v: VersaoCompleta | null) {
    return {
      ...i,
      vigente:
        v === null
          ? null
          : {
              id: v.id,
              versao: v.versao,
              vigenteDesde: v.vigenteDesde,
              criadaPor: v.criadaPor,
              encontros: v.encontros.map((e) => ({
                id: e.id,
                nome: e.nome,
                codigo: e.codigo,
                multiplicadorCentesimos: e.multiplicadorCentesimos,
              })),
              funcoes: v.funcoes.map((f) => ({
                id: f.id,
                nome: f.nome,
                rank: f.rank,
                padrao: f.padrao,
                classe: f.classe,
              })),
            },
    };
  }

  async listar() {
    const instancias = await this.prisma.instancia.findMany({
      orderBy: [{ ativa: "desc" }, { nome: "asc" }],
    });
    const r = [];
    for (const i of instancias) r.push(this.formatar(i, await this.vigente(this.prisma, i.id)));
    return r;
  }

  async detalhe(id: string) {
    const i = await this.prisma.instancia.findUnique({ where: { id } });
    if (i === null) throw new NotFoundException("Instância não encontrada.");
    return this.formatar(i, await this.vigente(this.prisma, id));
  }

  async historico(id: string) {
    await this.detalhe(id);
    const versoes = await this.prisma.versaoInstancia.findMany({
      where: { instanciaId: id },
      orderBy: { versao: "desc" },
      include: { ...INCLUIR_VERSAO, _count: { select: { runs: true } } },
    });
    return versoes.map((v) => ({
      id: v.id,
      versao: v.versao,
      vigenteDesde: v.vigenteDesde,
      criadaPor: v.criadaPor,
      runs: v._count.runs,
      encontros: v.encontros.map((e) => ({
        nome: e.nome,
        multiplicadorCentesimos: e.multiplicadorCentesimos,
      })),
      funcoes: v.funcoes.map((f) => ({
        nome: f.nome,
        rank: f.rank,
        padrao: f.padrao,
        classe: f.classe.apelidoGrupo ?? f.classe.nomeOficial,
      })),
    }));
  }

  private validarEncontros(encontros: NovoEncontro[]): void {
    if (encontros.length === 0) throw new BadRequestException("Informe ao menos um encontro (D44).");
    const nomes = encontros.map((e) => e.nome.toLowerCase());
    if (new Set(nomes).size !== nomes.length) throw new BadRequestException("Encontros com nomes repetidos.");
  }

  private async validarFuncoes(tx: Tx, funcoes: NovaFuncao[]): Promise<void> {
    const chaves = funcoes.map((f) => `${f.classeId}:${f.nome.toLowerCase()}`);
    if (new Set(chaves).size !== chaves.length) {
      throw new BadRequestException("Uma classe não pode ter duas funções com o mesmo nome.");
    }
    const padroes = funcoes.filter((f) => f.padrao).map((f) => f.classeId);
    if (new Set(padroes).size !== padroes.length) {
      throw new BadRequestException("Só pode haver uma função padrão por classe (D16).");
    }
    const ids = [...new Set(funcoes.map((f) => f.classeId))];
    const existentes = await tx.classe.count({ where: { id: { in: ids } } });
    if (existentes !== ids.length) throw new BadRequestException("Classe não encontrada.");
  }

  /**
   * D56: instância do catálogo da browiki com esse nome que ainda não tem versão. Cadastrá-la é
   * configurar a que já existe, em vez de recusar pelo nome repetido.
   */
  private async doCatalogoSemVersao(tx: Tx, nome: string) {
    return tx.instancia.findFirst({
      where: {
        nome: { equals: nome, mode: "insensitive" },
        codigo: { startsWith: PREFIXO_BROWIKI },
        versoes: { none: {} },
      },
      select: { id: true },
    });
  }

  /** D43/D45: nasce inativa, com os encontros informados e sem funções. */
  async criar(dados: DadosInstancia & { nome: string }, encontros: NovoEncontro[], usuario: Usuario) {
    this.validarEncontros(encontros);
    try {
      const id = await this.prisma.$transaction(async (tx) => {
        const doCatalogo = await this.doCatalogoSemVersao(tx, dados.nome);
        const i =
          doCatalogo === null
            ? await tx.instancia.create({ data: { ...dados, ativa: false } })
            : await tx.instancia.update({ where: { id: doCatalogo.id }, data: { ...dados, ativa: false } });
        await tx.versaoInstancia.create({
          data: {
            instanciaId: i.id,
            versao: 1,
            criadaPorId: usuario.id,
            encontros: { create: encontros.map((e, n) => ({ ...e, ordem: n + 1 })) },
          },
        });
        await this.auditoria.registrar(
          {
            usuarioId: usuario.id,
            acao: "INSTANCIA_CRIADA",
            entidade: "instancia",
            entidadeId: i.id,
            depois: { ...dados, encontros },
          },
          tx,
        );
        return i.id;
      });
      return this.detalhe(id);
    } catch (e) {
      if (ehViolacaoUnicidade(e)) throw new ConflictException("Já existe uma instância com esse nome.");
      throw e;
    }
  }

  /** Nome, ativa e campos de referência. Ativar exige funções na versão vigente (CT-146). */
  async alterar(id: string, dados: DadosInstancia, usuario: Usuario) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const antes = await tx.instancia.findUnique({ where: { id } });
        if (antes === null) throw new NotFoundException("Instância não encontrada.");
        if (dados.ativa === true) {
          const v = await this.vigente(tx, id);
          if (v === null || v.funcoes.length === 0) {
            throw new ConflictException("Cadastre as funções e ranks antes de ativar a instância (D45).");
          }
        }
        await tx.instancia.update({ where: { id }, data: dados });
        await this.auditoria.registrar(
          {
            usuarioId: usuario.id,
            acao: "INSTANCIA_ALTERADA",
            entidade: "instancia",
            entidadeId: id,
            antes,
            depois: { ...dados },
          },
          tx,
        );
      });
    } catch (e) {
      if (ehViolacaoUnicidade(e)) throw new ConflictException("Já existe uma instância com esse nome.");
      throw e;
    }
    return this.detalhe(id);
  }

  /**
   * D46: nova versão com a tabela inteira (encontros e funções). Vale para as runs seguintes; as já
   * registradas mantêm a versão delas. Encontros com o mesmo nome herdam o código da versão anterior
   * (assim a Torre continua reconhecendo Naght 25 e Betelgeuse 50/75).
   */
  async novaVersao(id: string, encontros: NovoEncontro[], funcoes: NovaFuncao[], usuario: Usuario) {
    this.validarEncontros(encontros);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM instancia WHERE id = ${id}::uuid FOR UPDATE`;
      const instancia = await tx.instancia.findUnique({ where: { id } });
      if (instancia === null) throw new NotFoundException("Instância não encontrada.");
      await this.validarFuncoes(tx, funcoes);
      const anterior = await this.vigente(tx, id);
      if (instancia.ativa && funcoes.length === 0) {
        throw new UnprocessableEntityException("Uma instância ativa precisa de funções. Desative-a antes.");
      }
      const codigoPorNome = new Map(
        (anterior?.encontros ?? []).map((e) => [e.nome.toLowerCase(), e.codigo] as const),
      );
      const versao = await tx.versaoInstancia.create({
        data: {
          instanciaId: id,
          versao: (anterior?.versao ?? 0) + 1,
          criadaPorId: usuario.id,
          encontros: {
            create: encontros.map((e, n) => ({
              ...e,
              ordem: n + 1,
              codigo: codigoPorNome.get(e.nome.toLowerCase()) ?? null,
            })),
          },
          funcoes: { create: funcoes },
        },
      });
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          acao: "INSTANCIA_NOVA_VERSAO",
          entidade: "instancia",
          entidadeId: id,
          depois: { versao: versao.versao, encontros, funcoes: funcoes.length },
        },
        tx,
      );
    });
    return this.detalhe(id);
  }
}
