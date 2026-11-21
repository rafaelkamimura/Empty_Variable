import { HttpException, HttpStatus, Inject, Injectable, Logger } from "@nestjs/common";
import type { Monstro } from "@prisma/client";
import { ELEMENTOS, type Elemento, RACAS, type Raca, TAMANHOS, type Tamanho } from "@betel/simulador";
import { CONFIGURACAO, type Configuracao } from "../configuracao.js";
import { BUSCADOR_DIVINE_PRIDE, type BuscadorDivinePride } from "../farm/divine-pride.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

const API = "https://www.divine-pride.net/api/database/Monster";
const TIMEOUT_MS = 5_000;
/** Um ID que a Divine Pride não conhece é conferido de novo depois de uma semana. */
const REVISAR_AUSENTE_MS = 7 * 86_400_000;
const INT_MAXIMO = 2_147_483_647;
/** Teto de buscas novas na Divine Pride por hora, somando todos os membros: ninguém varre IDs. */
export const BUSCAS_POR_HORA = 60;
const HORA_MS = 3_600_000;

export type OrigemMonstro = "DIVINE_PRIDE" | "REFERENCIA";

/** Atributos de um monstro para a simulação. null é o que a fonte não trouxe: a tela pede o valor. */
export interface MonstroAlvo {
  idJogo: number;
  nome: string | null;
  origem: OrigemMonstro;
  servidor: string | null;
  fonte: string | null;
  nivel: number | null;
  hp: number | null;
  def: number | null;
  mdef: number | null;
  vit: number | null;
  int: number | null;
  res: number | null;
  mres: number | null;
  raca: Raca | null;
  tamanho: Tamanho | null;
  elemento: Elemento | null;
  nivelElemento: number | null;
  chefe: boolean | null;
  danoRecebidoPct: number | null;
  buscadoEm: Date;
}

export type DadosMonstro = Omit<MonstroAlvo, "idJogo" | "origem" | "servidor" | "fonte" | "buscadoEm">;

const NOMES_RACA: Readonly<Record<string, Raca>> = {
  formless: "AMORFO",
  undead: "MORTO_VIVO",
  brute: "BRUTO",
  plant: "PLANTA",
  insect: "INSETO",
  fish: "PEIXE",
  demon: "DEMONIO",
  demihuman: "HUMANOIDE",
  human: "HUMANOIDE",
  angel: "ANJO",
  dragon: "DRAGAO",
};
const NOMES_TAMANHO: Readonly<Record<string, Tamanho>> = {
  small: "PEQUENO",
  medium: "MEDIO",
  large: "GRANDE",
};
const NOMES_ELEMENTO: Readonly<Record<string, Elemento>> = {
  neutral: "NEUTRO",
  water: "AGUA",
  earth: "TERRA",
  fire: "FOGO",
  wind: "VENTO",
  poison: "VENENO",
  holy: "SAGRADO",
  dark: "SOMBRIO",
  shadow: "SOMBRIO",
  ghost: "FANTASMA",
  undead: "MALDITO",
};

const chave = (texto: string) => texto.toLowerCase().replace(/[^a-z]/g, "");

function numero(max: number, ...valores: unknown[]): number | null {
  for (const valor of valores) {
    const n = typeof valor === "string" && valor.trim() !== "" ? Number(valor) : valor;
    if (typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= max) return Math.trunc(n);
  }
  return null;
}

function daLista<T>(lista: readonly T[], nomes: Readonly<Record<string, T>>, valor: unknown): T | null {
  if (typeof valor === "number" && Number.isInteger(valor)) return lista[valor] ?? null;
  return typeof valor === "string" ? (nomes[chave(valor)] ?? null) : null;
}

/**
 * Lê a resposta de `/api/database/Monster/{id}` da Divine Pride. Aceita os dois formatos conhecidos:
 * campos soltos com texto (`race: "Plant"`, `size`, `element` + `elementLevel`, `def`, `mDef`), como
 * a documentação pública mostra, e o objeto `stats` com números (`race`, `scale`, `element` no código
 * do cliente, nível × 20 + propriedade). O que não der para ler fica null.
 * @param corpo JSON devolvido pela API
 */
export function lerMonstroDivinePride(corpo: unknown): DadosMonstro | null {
  if (typeof corpo !== "object" || corpo === null || Array.isArray(corpo)) return null;
  const raiz = corpo as Record<string, unknown>;
  const bruto = raiz["stats"];
  const stats = (typeof bruto === "object" && bruto !== null ? bruto : {}) as Record<string, unknown>;
  const nomeBruto = raiz["name"];
  const nome = typeof nomeBruto === "string" ? nomeBruto.trim().replace(/\s+/g, " ").slice(0, 80) : "";

  const codigo = stats["element"];
  let elemento: Elemento | null;
  let nivelElemento: number | null;
  if (typeof codigo === "number" && Number.isInteger(codigo) && codigo >= 20) {
    elemento = ELEMENTOS[codigo % 20] ?? null;
    nivelElemento = Math.trunc(codigo / 20);
  } else {
    elemento = daLista(ELEMENTOS, NOMES_ELEMENTO, raiz["element"] ?? codigo);
    nivelElemento = numero(4, raiz["elementLevel"], stats["elementLevel"]);
  }
  if (nivelElemento !== null && (nivelElemento < 1 || nivelElemento > 4)) nivelElemento = null;

  const tipo = typeof raiz["type"] === "string" ? chave(raiz["type"]) : null;
  const mvp = stats["mvp"];
  const classe = stats["class"];
  const chefe =
    tipo !== null
      ? tipo !== "normal"
      : typeof mvp === "number" || typeof classe === "number"
        ? mvp === 1 || classe === 1
        : null;

  const dados: DadosMonstro = {
    nome: nome === "" ? null : nome,
    nivel: numero(999, stats["level"], raiz["level"]),
    hp: numero(Number.MAX_SAFE_INTEGER, stats["health"], raiz["health"]),
    def: numero(INT_MAXIMO, stats["defense"], raiz["def"], raiz["defense"]),
    mdef: numero(INT_MAXIMO, stats["magicDefense"], raiz["mDef"], raiz["mdef"], raiz["magicDefense"]),
    vit: numero(INT_MAXIMO, stats["vit"], raiz["vit"]),
    int: numero(INT_MAXIMO, stats["int"], raiz["int"]),
    res: numero(INT_MAXIMO, stats["res"], raiz["res"]),
    mres: numero(INT_MAXIMO, stats["mres"], raiz["mRes"], raiz["mres"]),
    raca: daLista(RACAS, NOMES_RACA, stats["race"] ?? raiz["race"]),
    tamanho: daLista(TAMANHOS, NOMES_TAMANHO, stats["scale"] ?? raiz["size"] ?? raiz["scale"]),
    elemento,
    nivelElemento,
    chefe,
    danoRecebidoPct: null,
  };
  return dados.nome === null && dados.nivel === null && dados.hp === null ? null : dados;
}

function daLinha(linha: Monstro): MonstroAlvo {
  const de = <T extends string>(lista: readonly T[], valor: string | null): T | null =>
    lista.find((item) => item === valor) ?? null;
  return {
    idJogo: linha.idJogo,
    nome: linha.nome,
    origem: linha.origem === "DIVINE_PRIDE" ? "DIVINE_PRIDE" : "REFERENCIA",
    servidor: linha.servidor,
    fonte: linha.fonte,
    nivel: linha.nivel,
    hp: linha.hp === null ? null : Number(linha.hp),
    def: linha.def,
    mdef: linha.mdef,
    vit: linha.vit,
    int: linha.inteligencia,
    res: linha.res,
    mres: linha.mres,
    raca: de(RACAS, linha.raca),
    tamanho: de(TAMANHOS, linha.tamanho),
    elemento: de(ELEMENTOS, linha.elemento),
    nivelElemento: linha.nivelElemento,
    chefe: linha.chefe,
    danoRecebidoPct: linha.danoRecebidoPct,
    buscadoEm: linha.buscadoEm,
  };
}

/**
 * D57: atributos de um monstro pelo ID do jogo, pela API da Divine Pride. Como nos nomes de itens
 * (D53), cada ID é buscado uma vez e guardado: a Divine Pride pede cache, não aceita pedidos em
 * paralelo e proíbe varrer IDs, então os pedidos saem um por vez e há um teto por hora. Sem a chave (DIVINE_PRIDE_API_KEY)
 * nada sai para a internet, e só os monstros de referência (citados no código) têm atributos.
 */
@Injectable()
export class MonstrosService {
  private readonly log = new Logger(MonstrosService.name);
  private readonly emAndamento = new Map<number, Promise<MonstroAlvo | null>>();
  private fila: Promise<unknown> = Promise.resolve();
  private buscasRecentes: number[] = [];

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONFIGURACAO) private readonly config: Configuracao,
    @Inject(BUSCADOR_DIVINE_PRIDE) private readonly buscar: BuscadorDivinePride,
  ) {}

  get configurada(): boolean {
    return this.config.divinePride !== null;
  }

  /** Monstros já guardados, sem buscar nada. */
  async guardados(ids: number[]): Promise<Map<number, MonstroAlvo>> {
    if (ids.length === 0) return new Map();
    const linhas = await this.prisma.monstro.findMany({ where: { idJogo: { in: ids }, existe: true } });
    return new Map(linhas.map((linha) => [linha.idJogo, daLinha(linha)]));
  }

  /**
   * Atributos do monstro, ou null (sem chave, ID desconhecido ou Divine Pride fora do ar).
   * Atingido o teto de buscas da hora, devolve o que já está guardado ou recusa com 429.
   */
  async porId(idJogo: number): Promise<MonstroAlvo | null> {
    const cache = await this.prisma.monstro.findUnique({ where: { idJogo } });
    const guardado = cache?.existe ? daLinha(cache) : null;
    if (cache?.origem === "DIVINE_PRIDE") {
      if (cache.existe) return guardado;
      if (Date.now() - cache.buscadoEm.getTime() < REVISAR_AUSENTE_MS) return null;
    }
    const acesso = this.config.divinePride;
    if (acesso === null) return guardado;

    let busca = this.emAndamento.get(idJogo);
    if (busca === undefined) {
      if (!this.contarBusca()) {
        if (guardado !== null) return guardado;
        throw new HttpException(
          "Muitas buscas de monstros na última hora. Tente mais tarde ou informe os atributos do alvo.",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      const naVez = this.fila.then(() => this.buscarEGuardar(idJogo, acesso, guardado));
      this.fila = naVez.catch(() => undefined);
      busca = naVez.finally(() => this.emAndamento.delete(idJogo));
      this.emAndamento.set(idJogo, busca);
    }
    return busca;
  }

  /** Registra uma busca nova; false quando o teto da última hora já foi atingido. */
  private contarBusca(): boolean {
    const agora = Date.now();
    this.buscasRecentes = this.buscasRecentes.filter((quando) => agora - quando < HORA_MS);
    if (this.buscasRecentes.length >= BUSCAS_POR_HORA) return false;
    this.buscasRecentes.push(agora);
    return true;
  }

  /** Busca na API e guarda. A URL leva a chave, então os avisos no log dizem só o ID. */
  private async buscarEGuardar(
    idJogo: number,
    { chave: chaveApi, servidor }: { chave: string; servidor: string },
    guardado: MonstroAlvo | null,
  ): Promise<MonstroAlvo | null> {
    let resposta: Awaited<ReturnType<BuscadorDivinePride>>;
    try {
      resposta = await this.buscar(`${API}/${idJogo}?apiKey=${encodeURIComponent(chaveApi)}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "EmptyVariable/1.0 (simulacao de dano)",
          "x-server": servidor,
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      this.log.warn(`Divine Pride indisponível ao buscar o monstro ${idJogo}.`);
      return guardado;
    }
    if (resposta.status === 404) {
      if (guardado === null) await this.guardarAusente(idJogo, servidor);
      return guardado;
    }
    if (resposta.status !== 200) {
      this.log.warn(`Divine Pride respondeu ${resposta.status} ao buscar o monstro ${idJogo}.`);
      return guardado;
    }
    let corpo: unknown;
    try {
      corpo = await resposta.json();
    } catch {
      return guardado;
    }
    const dados = lerMonstroDivinePride(corpo);
    if (dados === null) {
      this.log.warn(`Resposta da Divine Pride para o monstro ${idJogo} fora do formato esperado.`);
      return guardado;
    }
    const linha = {
      nome: dados.nome ?? guardado?.nome ?? null,
      existe: true,
      origem: "DIVINE_PRIDE",
      servidor,
      fonte: `https://www.divine-pride.net/database/monster/${idJogo}`,
      nivel: dados.nivel,
      hp: dados.hp === null ? null : BigInt(dados.hp),
      def: dados.def,
      mdef: dados.mdef,
      vit: dados.vit ?? guardado?.vit ?? null,
      inteligencia: dados.int ?? guardado?.int ?? null,
      res: dados.res ?? guardado?.res ?? null,
      mres: dados.mres ?? guardado?.mres ?? null,
      raca: dados.raca,
      tamanho: dados.tamanho,
      elemento: dados.elemento,
      nivelElemento: dados.nivelElemento,
      chefe: dados.chefe,
      danoRecebidoPct: guardado?.danoRecebidoPct ?? null,
      buscadoEm: new Date(),
    };
    return daLinha(
      await this.prisma.monstro.upsert({ where: { idJogo }, create: { idJogo, ...linha }, update: linha }),
    );
  }

  private async guardarAusente(idJogo: number, servidor: string): Promise<void> {
    const dados = { existe: false, origem: "DIVINE_PRIDE", servidor, buscadoEm: new Date() };
    await this.prisma.monstro.upsert({ where: { idJogo }, create: { idJogo, ...dados }, update: dados });
  }
}
