import { CLASSES_LATAM } from "./classes-latam.js";
import { Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { PARAMETROS_V1 } from "./config-pontuacao.service.js";
import type { Tx } from "../prisma/prisma.service.js";
import {
  CLASSES_INICIAIS,
  FONTE_RECEITAS,
  ITENS_EPICO3,
  ITENS_INICIAIS,
  RECEITAS_INICIAIS,
  RENOMEAR_POS,
} from "./dados-iniciais.js";
import { MULTIPLICADORES_TORRE_V1 } from "@betel/scoring";
import { CODIGO_TORRE, PREFIXO_BROWIKI } from "../instancias/instancias.service.js";
import { LOOT_BROWIKI } from "../instancias/loot-browiki.js";
import { REFERENCIA_BROWIKI } from "../instancias/referencia-browiki.js";
import { CHEFES_DE_REFERENCIA } from "../simulador/chefes-referencia.js";
import { FONTE_LATAM_TOOLS, MAPAS_TORRE, MONSTROS_LATAM_TOOLS } from "../simulador/monstros-latam-tools.js";

/** D22: a taxa da loja existe como parâmetro e começa em 0%. */
export const TAXA_CONSIGNACAO_V1_BP = 0;

export interface ResultadoSeed {
  config: boolean;
  /** Épico IV: a Torre da Constelação, com os encontros aprovados (D2/D3, D44). */
  torre: boolean;
  classes: boolean;
  itens: boolean;
  configLoja: boolean;
  /** Épico III: pós renomeados e itens novos garantidos no catálogo. */
  catalogoEpico3: boolean;
  receitas: boolean;
  instanciasBrowiki: boolean;
  /** D57: chefes de instância e monstros de referência da simulação de dano. */
  chefes: boolean;
  /** D58: monstros do simulador da latam-tools e os chefes da Torre que vêm de lá. */
  monstrosLatamTools: boolean;
  /** D60: chefes de cada instância do catálogo, pela página dela na browiki. */
  chefesBrowiki: boolean;
}

/** Código estável de uma instância do catálogo da browiki (ex.: "BROWIKI_GLASTHEIM_SOMBRIA"). */
export function codigoBrowiki(nome: string): string {
  const slug = nome
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return `${PREFIXO_BROWIKI}${slug}`;
}

/**
 * Seeds: config de pontuação v1, classes aprovadas, itens da Torre (M3) e config da loja v1 (Épico II).
 * Cada grupo só é inserido se a tabela estiver vazia, então rodar de novo nunca duplica nem
 * sobrescreve o que o admin alterou. Roda ao subir a API.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly log = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    const r = await this.aplicar();
    const feitos = Object.entries(r)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (feitos.length > 0) this.log.log(`Dados iniciais inseridos: ${feitos.join(", ")}.`);
  }

  /**
   * Épico III (análise §2.2): corrige os nomes dos pós para os oficiais e cadastra as peças Astrais e as
   * Nebulosas. Idempotente: só renomeia se o nome antigo existir e o novo não; só cria o que falta.
   */
  private async garantirCatalogoEpico3(tx: Tx): Promise<boolean> {
    let mudou = false;
    for (const [antigo, novo] of RENOMEAR_POS) {
      const existeNovo = await tx.itemCatalogo.count({
        where: { nome: { equals: novo, mode: "insensitive" } },
      });
      if (existeNovo > 0) continue;
      const r = await tx.itemCatalogo.updateMany({ where: { nome: antigo }, data: { nome: novo } });
      if (r.count > 0) mudou = true;
    }
    for (const item of ITENS_EPICO3) {
      const existe = await tx.itemCatalogo.count({
        where: { nome: { equals: item.nome, mode: "insensitive" } },
      });
      if (existe > 0) continue;
      await tx.itemCatalogo.create({ data: { ...item } });
      mudou = true;
    }
    return mudou;
  }

  /**
   * As receitas da fonte, INATIVAS ("a validar") e sem preço: o admin confere com o jogo e ativa.
   * Tudo ou nada: se algum item da fonte não estiver no catálogo (ex.: renomeado pelo admin), não semeia
   * e só avisa — nunca derruba o boot. A tabela segue vazia, então tenta de novo no próximo boot.
   */
  private async semearReceitas(tx: Tx): Promise<boolean> {
    const itens = await tx.itemCatalogo.findMany({ select: { id: true, nome: true } });
    const porNome = new Map(itens.map((x) => [x.nome.toLowerCase(), x.id]));
    const necessarios = new Set(
      RECEITAS_INICIAIS.flatMap((r) => [r.produz, ...r.componentes.map((c) => c.item)]),
    );
    const ausentes = [...necessarios].filter((n) => !porNome.has(n.toLowerCase()));
    if (ausentes.length > 0) {
      this.log.warn(`Receitas iniciais não semeadas: itens fora do catálogo: ${ausentes.join(", ")}.`);
      return false;
    }
    const idDe = (nome: string): string => porNome.get(nome.toLowerCase()) as string;
    const criadas = new Map<string, string>();
    for (const r of RECEITAS_INICIAIS) {
      const receita = await tx.receita.create({
        data: {
          nome: r.nome,
          itemProduzidoId: idDe(r.produz),
          solicitavel: r.solicitavel,
          ativa: false,
          fonte: FONTE_RECEITAS,
          componentes: {
            create: r.componentes.map((c) => ({
              itemId: idDe(c.item),
              quantidade: c.quantidade,
              pecaBase: c.pecaBase ?? false,
            })),
          },
        },
      });
      criadas.set(r.nome, receita.id);
    }
    for (const r of RECEITAS_INICIAIS) {
      if (r.receitaPeca === undefined) continue;
      const receitaId = criadas.get(r.nome);
      const receitaPecaId = criadas.get(r.receitaPeca);
      if (receitaId === undefined || receitaPecaId === undefined) continue;
      await tx.receitaPeca.create({ data: { receitaId, receitaPecaId } });
    }
    return true;
  }

  /**
   * A migração do M15 cria a Torre num banco existente. Aqui ela é garantida num banco vazio (ou
   * limpo pelos testes): instância ativa, v1 com Naght 25, Betelgeuse 50 e 75 nos multiplicadores
   * aprovados (D2/D3) e sem funções — as funções vêm logo depois, com as classes.
   */
  private async garantirTorre(tx: Tx): Promise<boolean> {
    if ((await tx.instancia.count({ where: { codigo: CODIGO_TORRE } })) > 0) return false;
    const t = await tx.instancia.create({
      data: {
        nome: "Torre da Constelação",
        codigo: CODIGO_TORRE,
        ativa: true,
        nivelMinimo: 240,
        retorno: "TRES_DIAS",
        modo: "GRUPO",
        dificuldade: "DIFICIL",
        premiacao: "Pó de Meteorito",
      },
    });
    await tx.versaoInstancia.create({
      data: {
        instanciaId: t.id,
        versao: 1,
        encontros: {
          create: [
            {
              nome: "Naght Sieger 25",
              codigo: "NAGHT_25",
              multiplicadorCentesimos: MULTIPLICADORES_TORRE_V1.NAGHT_25,
              ordem: 1,
            },
            {
              nome: "Betelgeuse 50",
              codigo: "BETELGEUSE_50",
              multiplicadorCentesimos: MULTIPLICADORES_TORRE_V1.BETELGEUSE_50,
              ordem: 2,
            },
            {
              nome: "Betelgeuse 75",
              codigo: "BETELGEUSE_75",
              multiplicadorCentesimos: MULTIPLICADORES_TORRE_V1.BETELGEUSE_75,
              ordem: 3,
            },
          ],
        },
      },
    });
    return true;
  }

  /**
   * D56: o catálogo da browiki entra no cadastro de instâncias ao subir a API, como o nag4eyes faz
   * com o catálogo dele. Cada instância nasce inativa e sem versão (o gestor define encontros e
   * funções antes de ativar) e ganha um código estável, para não voltar se o gestor a renomear.
   * Só cria o que falta: nunca altera uma instância já cadastrada.
   */
  private async garantirInstanciasBrowiki(tx: Tx): Promise<boolean> {
    const existentes = await tx.instancia.findMany({ select: { nome: true, codigo: true } });
    const nomes = new Set(existentes.map((i) => i.nome.toLowerCase()));
    const codigos = new Set(existentes.flatMap((i) => (i.codigo === null ? [] : [i.codigo])));
    const novas = REFERENCIA_BROWIKI.map((r) => ({ ...r, codigo: codigoBrowiki(r.nome) })).filter(
      (r) => !nomes.has(r.nome.toLowerCase()) && !codigos.has(r.codigo),
    );
    if (novas.length === 0) return false;
    await tx.instancia.createMany({
      data: novas.map((r) => ({
        nome: r.nome,
        codigo: r.codigo,
        ativa: false,
        nivelMinimo: r.nivelMinimo,
        retorno: r.retorno,
        modo: r.modo,
        dificuldade: r.dificuldade,
        requisito: r.requisito,
        premiacao: r.premiacao,
      })),
    });
    return true;
  }

  /**
   * D57: cadastra os chefes de referência nas instâncias que existem e guarda os atributos citados
   * de cada monstro. Só cria o que falta: um chefe que o gestor removeu fica desativado e não volta,
   * e atributos já guardados (da Divine Pride ou da própria referência) não são alterados.
   */
  private async garantirChefes(tx: Tx): Promise<boolean> {
    let mudou = false;
    for (const chefe of CHEFES_DE_REFERENCIA) {
      const instancia = await tx.instancia.findUnique({
        where: { codigo: chefe.instancia },
        select: { id: true },
      });
      if (instancia !== null) {
        const criado = await tx.chefeInstancia.createMany({
          data: [
            {
              instanciaId: instancia.id,
              idMonstro: chefe.idMonstro,
              nome: chefe.nome,
              observacao: chefe.observacao,
              fonte: chefe.fonte,
            },
          ],
          skipDuplicates: true,
        });
        if (criado.count > 0) mudou = true;
      }
      const { fonte, hp, int, ...atributos } = chefe.monstro;
      const guardado = await tx.monstro.createMany({
        data: [
          {
            idJogo: chefe.idMonstro,
            nome: chefe.nome,
            existe: true,
            origem: "REFERENCIA",
            fonte,
            hp: BigInt(hp),
            inteligencia: int,
            chefe: true,
            ...atributos,
            buscadoEm: new Date(),
          },
        ],
        skipDuplicates: true,
      });
      if (guardado.count > 0) mudou = true;
    }
    return mudou;
  }

  /**
   * D58: guarda os monstros do simulador da latam-tools e cadastra os da Torre da Constelação como
   * chefes dela. Só cria o que falta: monstro já guardado (referência ou Divine Pride) e chefe que o
   * gestor removeu ficam como estão.
   */
  private async garantirMonstrosLatamTools(tx: Tx): Promise<boolean> {
    const buscadoEm = new Date();
    const monstros = await tx.monstro.createMany({
      data: MONSTROS_LATAM_TOOLS.map(({ mapas: _mapas, int, hp, ...monstro }) => ({
        ...monstro,
        hp: BigInt(hp),
        inteligencia: int,
        existe: true,
        origem: "LATAM_TOOLS",
        servidor: "LATAM",
        fonte: FONTE_LATAM_TOOLS,
        buscadoEm,
      })),
      skipDuplicates: true,
    });
    const torre = await tx.instancia.findUnique({ where: { codigo: CODIGO_TORRE }, select: { id: true } });
    if (torre === null) return monstros.count > 0;
    const chefes = await tx.chefeInstancia.createMany({
      data: MONSTROS_LATAM_TOOLS.filter((m) => m.mapas.some((mapa) => MAPAS_TORRE.includes(mapa))).map(
        (m) => ({ instanciaId: torre.id, idMonstro: m.idJogo, nome: m.nome, fonte: FONTE_LATAM_TOOLS }),
      ),
      skipDuplicates: true,
    });
    return monstros.count > 0 || chefes.count > 0;
  }

  /**
   * D60: cadastra em cada instância do catálogo os chefes que a página dela na browiki nomeia.
   * Só cria o que falta: chefe que o gestor removeu fica desativado e não volta.
   */
  private async garantirChefesBrowiki(tx: Tx): Promise<boolean> {
    const instancias = await tx.instancia.findMany({
      where: { codigo: { in: Object.keys(LOOT_BROWIKI) } },
      select: { id: true, codigo: true },
    });
    const chefes = instancias.flatMap((instancia) => {
      const loot = instancia.codigo === null ? undefined : LOOT_BROWIKI[instancia.codigo];
      return (loot?.chefes ?? []).map(([idMonstro, nome]) => ({
        instanciaId: instancia.id,
        idMonstro,
        nome,
        fonte: loot?.fonte ?? null,
      }));
    });
    if (chefes.length === 0) return false;
    const criados = await tx.chefeInstancia.createMany({ data: chefes, skipDuplicates: true });
    return criados.count > 0;
  }

  async aplicar(): Promise<ResultadoSeed> {
    return this.prisma.$transaction(async (tx) => {
      // Trava para duas instâncias subindo juntas não semearem em dobro.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(4242001)`;
      const r: ResultadoSeed = {
        config: false,
        torre: false,
        classes: false,
        itens: false,
        configLoja: false,
        catalogoEpico3: false,
        receitas: false,
        instanciasBrowiki: false,
        chefes: false,
        monstrosLatamTools: false,
        chefesBrowiki: false,
      };

      if ((await tx.configPontuacao.count()) === 0) {
        await tx.configPontuacao.create({ data: { ...PARAMETROS_V1, versao: 1 } });
        r.config = true;
      }
      r.torre = await this.garantirTorre(tx);
      r.instanciasBrowiki = await this.garantirInstanciasBrowiki(tx);
      if ((await tx.classe.count()) === 0) {
        // D45: as funções e ranks iniciais são da versão vigente da Torre.
        const torre = await tx.instancia.findUniqueOrThrow({ where: { codigo: CODIGO_TORRE } });
        const versao = await tx.versaoInstancia.findFirstOrThrow({
          where: { instanciaId: torre.id },
          orderBy: { versao: "desc" },
        });
        for (const c of CLASSES_INICIAIS) {
          const classe = await tx.classe.create({
            data: { nomeOficial: c.nomeOficial, apelidoGrupo: c.apelidoGrupo },
          });
          await tx.funcaoClasse.createMany({
            data: c.funcoes.map((f) => ({ ...f, classeId: classe.id, versaoInstanciaId: versao.id })),
          });
        }
        r.classes = true;
      }
      const classesCadastradas = await tx.classe.findMany({ select: { nomeOficial: true } });
      const nomes = new Set(classesCadastradas.map((classe) => classe.nomeOficial.toLowerCase()));
      if (
        classesCadastradas.some((classe) => classe.nomeOficial === "Soul Ascetic") &&
        !nomes.has("asceta das almas")
      ) {
        await tx.classe.update({
          where: { nomeOficial: "Soul Ascetic" },
          data: { nomeOficial: "Asceta das Almas" },
        });
        nomes.add("asceta das almas");
      }
      const novasClasses = CLASSES_LATAM.filter((nome) => !nomes.has(nome.toLowerCase()));
      if (novasClasses.length) {
        await tx.classe.createMany({
          data: novasClasses.map((nomeOficial) => ({ nomeOficial })),
          skipDuplicates: true,
        });
      }
      if ((await tx.itemCatalogo.count()) === 0) {
        await tx.itemCatalogo.createMany({ data: ITENS_INICIAIS.map((i) => ({ ...i })) });
        r.itens = true;
      }
      if ((await tx.configLoja.count()) === 0) {
        await tx.configLoja.create({ data: { versao: 1, taxaConsignacaoBp: TAXA_CONSIGNACAO_V1_BP } });
        r.configLoja = true;
      }
      r.catalogoEpico3 = await this.garantirCatalogoEpico3(tx);
      if ((await tx.receita.count()) === 0) {
        r.receitas = await this.semearReceitas(tx);
      }
      r.chefes = await this.garantirChefes(tx);
      r.monstrosLatamTools = await this.garantirMonstrosLatamTools(tx);
      r.chefesBrowiki = await this.garantirChefesBrowiki(tx);
      return r;
    });
  }
}
