import { BadGatewayException, BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { ELEMENTOS, type Elemento } from "@betel/simulador";
import lzString from "lz-string";
import { DivinePrideService } from "../farm/divine-pride.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  ATRIBUTOS,
  type AtributosFicha,
  type EncaixeFicha,
  ENCAIXES_MAXIMOS,
  GRAUS,
  type Grau,
  REFINO_MAXIMO,
  TALENTOS,
  TOKEN_BUILD_MAXIMO,
} from "./ficha-build.js";

/** Resposta mínima do encurtador do simulador (o `fetch` global cumpre este contrato). */
export interface RespostaLinkCurto {
  status: number;
  json(): Promise<unknown>;
}
export type BuscadorLinkCurto = (url: string, init: RequestInit) => Promise<RespostaLinkCurto>;
export const BUSCADOR_LINK_CURTO = Symbol("BUSCADOR_LINK_CURTO");

const SIMULADOR = "simulador.latam-tools.com.br";
const ENCURTADOR = "short.latam-tools.com.br";
const TIMEOUT_MS = 5_000;
/** Tempo total para buscar na Divine Pride os nomes de uma build; o que não couber fica sem nome. */
const PRAZO_NOMES_MS = 8_000;
/** Maior link aceito e maior build descompactada (o simulador recusa acima de 512 KiB). */
const LINK_MAXIMO = 64 * 1024;
const BUILD_MAXIMA = 512 * 1024;
const TOKEN = /^[A-Za-z0-9.\-$]{8,}$/;
const SLUG = /^[A-Za-z0-9_-]{1,64}$/;

/** Slot da ficha (D55) → campo do equipamento na build do simulador. */
export const SLOTS_SIMULADOR = {
  topo: "headUpper",
  meio: "headMiddle",
  baixo: "headLower",
  arma: "weapon",
  armadura: "armor",
  escudo: "shield",
  capa: "garment",
  calcado: "boot",
  acessorio1: "accLeft",
  acessorio2: "accRight",
} as const;
export type SlotFicha = keyof typeof SLOTS_SIMULADOR;

/** Classe do simulador (número interno dele) → nome em português, como ele mesmo mostra. */
export const CLASSES_SIMULADOR: Readonly<Record<number, string>> = {
  1: "Insurgente",
  2: "Sentinela",
  3: "Ceifador de Almas",
  4: "Renegado",
  5: "Sicário",
  6: "Arcano",
  7: "Arcebispo",
  8: "Feiticeiro",
  9: "Bioquímico",
  10: "Mecânico",
  11: "Guardião Real",
  12: "Cavaleiro Rúnico",
  13: "Shura",
  17: "Oboro",
  18: "Kagerou",
  21: "Trovador",
  22: "Musa",
  24: "Justiceiro",
  25: "Ninja",
  30: "Superaprendiz",
  31: "Invocador",
  33: "Mestre Estelar",
  4008: "Lorde",
  4009: "Sumo Sacerdote",
  4010: "Arquimago",
  4011: "Mestre-Ferreiro",
  4012: "Atirador de Elite",
  4013: "Algoz",
  4015: "Paladino",
  4016: "Mestre",
  4017: "Professor",
  4018: "Desordeiro",
  4019: "Criador",
  4020: "Menestrel",
  4021: "Cigana",
  4046: "Taekwon",
  4047: "Mestre Taekwon",
  4049: "Espiritualista",
  4252: "Cavaleiro Draconiano",
  4253: "Engenheiro",
  4254: "Executor",
  4255: "Magus",
  4256: "Cardeal",
  4257: "Falcão dos Ventos",
  4258: "Guardião Imperial",
  4259: "Cientista",
  4260: "Mandraque",
  4261: "Elementalista",
  4262: "Inquisidor",
  4263: "Maestro",
  4264: "Diva",
  4302: "Mestre Celestial",
  4303: "Asceta das Almas",
  4304: "Shinkiro",
  4305: "Shiranui",
  4306: "Guerrilheiro",
  4307: "Hiperaprendiz",
  4308: "Animista",
};

export type LinkSimulador = { tipo: "token"; token: string } | { tipo: "curto"; slug: string };

/** Equipamento de um slot como vem na build: só IDs do jogo. */
export interface ItemBuild {
  id: number;
  refino?: number;
  grau?: Grau;
  cartas?: number[];
  encantamentos?: number[];
}

export interface BuildSimulador {
  /** Número da classe no simulador; null se a build não trouxer um número válido. */
  classe: number | null;
  nivelBase: number | null;
  /** Equipamento de cada slot preenchido, com refino, grau, cartas e encantamentos (D57). */
  equipamentos: Partial<Record<SlotFicha, ItemBuild>>;
  /** Atributos, talentos, nível de classe e habilidade de ataque (D57). */
  atributos: AtributosFicha;
}

export interface EquipamentoImportado {
  id: number;
  nome: string | null;
  refino?: number;
  grau?: Grau;
  cartas?: EncaixeFicha[];
  encantamentos?: EncaixeFicha[];
}

export interface BuildImportada {
  classeId: string | null;
  /** Nome da classe no simulador, mesmo quando o grupo não tem uma classe ativa com esse nome. */
  classeNome: string | null;
  nivelBase: number | null;
  equipamentos: Partial<Record<SlotFicha, EquipamentoImportado>>;
  atributos: AtributosFicha;
}

/**
 * Reconhece um link do simulador: o completo (`/s/<token>/` ou `?b=<token>`) ou o curto do encurtador.
 * Só aceita os dois domínios do simulador; qualquer outro endereço devolve null.
 */
export function lerLinkSimulador(texto: string): LinkSimulador | null {
  const limpo = texto.trim().replace(/^<(.*)>$/, "$1");
  if (limpo === "" || limpo.length > LINK_MAXIMO) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.hostname === ENCURTADOR) {
    const slug = url.pathname.split("/")[1] ?? "";
    return SLUG.test(slug) ? { tipo: "curto", slug } : null;
  }
  if (url.hostname !== SIMULADOR) return null;
  const noCaminho = /^\/s\/([^/]+)/.exec(url.pathname)?.[1];
  const naBusca = url.searchParams.get("b") ?? /[?&]b=([^&#]+)/.exec(url.hash)?.[1];
  const token = noCaminho ?? naBusca?.replace(/ /g, "+");
  return token !== undefined && TOKEN.test(token) ? { tipo: "token", token } : null;
}

function inteiroEntre(valor: unknown, min: number, max: number): number | null {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= min && valor <= max ? valor : null;
}

const ID_MAXIMO = 2_147_483_647;

/** Nome que o simulador dá a cada propriedade (`propertyAtk`) → propriedade da simulação. */
const PROPRIEDADES_SIMULADOR: Readonly<Record<string, Elemento>> = {
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

function idsDe(build: Record<string, unknown>, campos: string[]): number[] | undefined {
  const ids = campos
    .map((campo) => inteiroEntre(build[campo], 1, ID_MAXIMO))
    .filter((id): id is number => id !== null)
    .slice(0, ENCAIXES_MAXIMOS);
  return ids.length > 0 ? ids : undefined;
}

/** Refino, grau, cartas e encantamentos de um slot. A arma numera as cartas; os outros slots têm uma. */
function itemDaBuild(build: Record<string, unknown>, campo: string, id: number): ItemBuild {
  const refino = inteiroEntre(build[`${campo}Refine`], 0, REFINO_MAXIMO);
  const grauBruto = build[`${campo}Grade`];
  const grau = typeof grauBruto === "string" ? GRAUS.find((g) => g === grauBruto.toUpperCase()) : undefined;
  const cartas = idsDe(build, [`${campo}Card`, ...[1, 2, 3, 4].map((n) => `${campo}Card${n}`)]);
  const encantamentos = idsDe(
    build,
    [0, 1, 2, 3].map((n) => `${campo}Enchant${n}`),
  );
  return {
    id,
    ...(refino === null ? {} : { refino }),
    ...(grau === undefined ? {} : { grau }),
    ...(cartas === undefined ? {} : { cartas }),
    ...(encantamentos === undefined ? {} : { encantamentos }),
  };
}

function pontosDe<Chave extends string>(
  build: Record<string, unknown>,
  chaves: readonly Chave[],
  campoDe: (chave: Chave) => string,
  min: number,
): Partial<Record<Chave, number>> | undefined {
  const pontos: Partial<Record<Chave, number>> = {};
  for (const chave of chaves) {
    const ponto = inteiroEntre(build[campoDe(chave)], min, 999);
    if (ponto !== null) pontos[chave] = ponto;
  }
  return Object.keys(pontos).length > 0 ? pontos : undefined;
}

const comMaiuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * Atributos, talentos, nível de classe, habilidade ("Nome==nível") e propriedade do ataque. Com a
 * D59 vão junto o número da classe no simulador e o token do link, que a simulação lê de novo.
 */
function atributosDaBuild(build: Record<string, unknown>, token: string): AtributosFicha {
  const classeSimulador = inteiroEntre(build["class"], 1, 99_999);
  const nivelClasse = inteiroEntre(build["jobLevel"], 1, 250);
  const base = pontosDe(build, ATRIBUTOS, (a) => a, 1);
  const bonusClasse = pontosDe(build, ATRIBUTOS, (a) => `job${comMaiuscula(a)}`, 0);
  const talentos = pontosDe(build, TALENTOS, (t) => t, 0);
  const escolhida = build["selectedAtkSkill"];
  let habilidade: AtributosFicha["habilidade"];
  if (typeof escolhida === "string") {
    const [nomeBruto = "", nivelBruto] = escolhida.split("==");
    const nome = nomeBruto.trim().replace(/\s+/g, " ").slice(0, 80);
    const nivel = inteiroEntre(Number(nivelBruto), 1, 999);
    if (nome !== "") habilidade = { nome, ...(nivel === null ? {} : { nivel }) };
  }
  const propriedade = build["propertyAtk"];
  const elementoAtaque =
    typeof propriedade === "string" ? PROPRIEDADES_SIMULADOR[propriedade.toLowerCase()] : undefined;
  return {
    ...(nivelClasse === null ? {} : { nivelClasse }),
    ...(base === undefined ? {} : { base }),
    ...(bonusClasse === undefined ? {} : { bonusClasse }),
    ...(talentos === undefined ? {} : { talentos }),
    ...(habilidade === undefined ? {} : { habilidade }),
    ...(elementoAtaque === undefined || !ELEMENTOS.includes(elementoAtaque) ? {} : { elementoAtaque }),
    ...(classeSimulador === null ? {} : { classeSimulador }),
    ...(token.length > TOKEN_BUILD_MAXIMO ? {} : { token }),
  };
}

/**
 * Abre o token de um link do simulador (JSON compactado com lz-string, com "." no lugar de "+")
 * e devolve só o que a ficha guarda. Devolve null se o token não for uma build.
 */
export function decodificarBuild(token: string): BuildSimulador | null {
  let dados: unknown;
  try {
    const json = lzString.decompressFromEncodedURIComponent(token.replace(/\./g, "+"));
    if (!json || json.length > BUILD_MAXIMA) return null;
    dados = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof dados !== "object" || dados === null || Array.isArray(dados)) return null;
  const build = dados as Record<string, unknown>;
  const equipamentos: BuildSimulador["equipamentos"] = {};
  for (const [slot, campo] of Object.entries(SLOTS_SIMULADOR) as [SlotFicha, string][]) {
    const id = inteiroEntre(build[campo], 1, ID_MAXIMO);
    if (id !== null) equipamentos[slot] = itemDaBuild(build, campo, id);
  }
  return {
    classe: inteiroEntre(build["class"], 1, 99_999),
    nivelBase: inteiroEntre(build["level"], 1, 250),
    equipamentos,
    atributos: atributosDaBuild(build, token.replace(/\+/g, ".")),
  };
}

const semAcentos = (nome: string) =>
  nome
    .normalize("NFD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * D55: importa para a ficha a classe, o nível e os equipamentos de um link do simulador de dano
 * do RO LATAM. Com a D57 vêm também refino, grau, cartas, encantamentos, atributos, talentos e a
 * habilidade. Nada é gravado aqui: a resposta preenche o formulário, e o membro revisa e salva.
 */
@Injectable()
export class BuildSimuladorService {
  private readonly log = new Logger(BuildSimuladorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly divinePride: DivinePrideService,
    @Inject(BUSCADOR_LINK_CURTO) private readonly buscar: BuscadorLinkCurto,
  ) {}

  async importar(texto: string): Promise<BuildImportada> {
    const link = lerLinkSimulador(texto);
    if (link === null) {
      throw new BadRequestException("Cole um link do simulador (simulador.latam-tools.com.br).");
    }
    const token = link.tipo === "token" ? link.token : await this.tokenDoLinkCurto(link.slug);
    const build = decodificarBuild(token);
    if (build === null) throw new BadRequestException("Esse link não traz uma build do simulador.");

    const classeNome = build.classe === null ? null : (CLASSES_SIMULADOR[build.classe] ?? null);
    const itens = Object.values(build.equipamentos);
    const [classeId, nomes] = await Promise.all([
      classeNome === null ? null : this.classeDoGrupo(classeNome),
      this.nomesDe([
        ...itens.map((item) => item.id),
        ...itens.flatMap((item) => [...(item.cartas ?? []), ...(item.encantamentos ?? [])]),
      ]),
    ]);
    const comNome = (ids: number[] | undefined): EncaixeFicha[] | undefined =>
      ids?.map((id) => ({ id, nome: nomes.get(id) ?? null }));
    const equipamentos: BuildImportada["equipamentos"] = {};
    for (const [slot, item] of Object.entries(build.equipamentos) as [SlotFicha, ItemBuild][]) {
      const cartas = comNome(item.cartas);
      const encantamentos = comNome(item.encantamentos);
      equipamentos[slot] = {
        id: item.id,
        nome: nomes.get(item.id) ?? null,
        ...(item.refino === undefined ? {} : { refino: item.refino }),
        ...(item.grau === undefined ? {} : { grau: item.grau }),
        ...(cartas === undefined ? {} : { cartas }),
        ...(encantamentos === undefined ? {} : { encantamentos }),
      };
    }
    return { classeId, classeNome, nivelBase: build.nivelBase, equipamentos, atributos: build.atributos };
  }

  /**
   * Nome de cada ID na Divine Pride, um pedido por vez (ela não aceita pedidos em paralelo) e na
   * ordem recebida: os equipamentos vêm antes das cartas. Passado o prazo, o resto fica sem nome.
   */
  private async nomesDe(ids: number[]): Promise<Map<number, string | null>> {
    const nomes = new Map<number, string | null>();
    const limite = Date.now() + PRAZO_NOMES_MS;
    for (const id of new Set(ids)) {
      if (Date.now() > limite) break;
      nomes.set(id, await this.divinePride.nomePorId(id));
    }
    return nomes;
  }

  /** O encurtador guarda o link completo; só o token dele interessa. */
  private async tokenDoLinkCurto(slug: string): Promise<string> {
    let resposta: RespostaLinkCurto;
    try {
      resposta = await this.buscar(`https://${ENCURTADOR}/api/links/${slug}`, {
        headers: { Accept: "application/json", "User-Agent": "EmptyVariable/1.0 (importar build)" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      this.log.warn("Encurtador do simulador indisponível.");
      throw new BadGatewayException("Não foi possível abrir o link curto agora. Tente o link completo.");
    }
    if (resposta.status === 404) throw new BadRequestException("Link curto não encontrado.");
    if (resposta.status !== 200) {
      this.log.warn(`Encurtador do simulador respondeu ${resposta.status}.`);
      throw new BadGatewayException("Não foi possível abrir o link curto agora. Tente o link completo.");
    }
    let corpo: unknown;
    try {
      corpo = await resposta.json();
    } catch {
      corpo = null;
    }
    const destino = (corpo as { url?: unknown } | null)?.url;
    const link = typeof destino === "string" ? lerLinkSimulador(destino) : null;
    if (link?.tipo !== "token") throw new BadRequestException("Esse link curto não leva a uma build.");
    return link.token;
  }

  /** Classe ativa do grupo com o mesmo nome, sem diferenciar acentos, maiúsculas ou pontuação. */
  private async classeDoGrupo(nome: string): Promise<string | null> {
    const classes = await this.prisma.classe.findMany({
      where: { ativa: true },
      select: { id: true, nomeOficial: true },
    });
    const chave = semAcentos(nome);
    return classes.find((classe) => semAcentos(classe.nomeOficial) === chave)?.id ?? null;
  }
}
