// D59: simulação de dano com os efeitos dos equipamentos, pelo motor do simulador da latam-tools
// (https://simulador.latam-tools.com.br/).
//
// Origem: https://github.com/adsonpleal/latam-ro-calc, licença MIT, Copyright (c) 2026 Adson Leal.
// O código do motor está copiado sem alteração em `vendor/latam-ro-calc/` (com a licença em
// `vendor/latam-ro-calc/LICENSE`; a configuração do site não é copiada, ver `ambiente.ts`) e os dados dele em `dados/latam-ro-calc.json.gz`; o commit de
// origem fica gravado nos dados (`origem.commit`). `scripts/sincronizar.mjs` refaz as duas cópias.
// Este arquivo é a única parte escrita aqui: abre o link da build, aplica o que a ficha mudou e
// devolve o resultado em português. `resolver` porta `mcp/src/engine/solve.ts` e `build-input.ts`
// do mesmo projeto (mesma licença), sem a validação com zod.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { ClassRegistry } from "../vendor/latam-ro-calc/mcp/src/data/class-registry";
import {
  applyJobBonus,
  applySkillMaps,
  clampLevels,
  resolveAtkSkill,
} from "../vendor/latam-ro-calc/mcp/src/engine/derive";
import { applyPreset } from "../vendor/latam-ro-calc/mcp/src/engine/preset";
import {
  ItemTypeEnum,
  MainItemWithRelations,
} from "../vendor/latam-ro-calc/src/app/constants/item-type.enum";
import { JobBuffs } from "../vendor/latam-ro-calc/src/app/constants/job-buffs";
import { bonusKeyLabel, resolveSkillKey } from "../vendor/latam-ro-calc/src/app/core/bonus-key-label";
import { Calculator } from "../vendor/latam-ro-calc/src/app/core/calculator";
import {
  applyGuaranaCandy,
  CalculatorController,
  collectBuffBonuses,
  collectConsumables,
} from "../vendor/latam-ro-calc/src/app/core/calculator-controller";
import { customOptionScripts } from "../vendor/latam-ro-calc/src/app/core/custom-attachments";
import { parseOptionScripts } from "../vendor/latam-ro-calc/src/app/core/option-scripts";
import { decodeShared, encodeBuild } from "../vendor/latam-ro-calc/src/app/core/share-codec";
import { SKILL_ID_BY_NAME, SKILL_META } from "../vendor/latam-ro-calc/src/app/skills";
import {
  calcDmgDpsDetailed,
  createMainModel,
  toRawOptionTxtList,
} from "../vendor/latam-ro-calc/src/app/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- o motor de origem não tipa itens, monstros nem o modelo da build
type Bruto = any;

export const ELEMENTOS_MOTOR = [
  "NEUTRO",
  "AGUA",
  "TERRA",
  "FOGO",
  "VENTO",
  "VENENO",
  "SAGRADO",
  "SOMBRIO",
  "FANTASMA",
  "MALDITO",
] as const;
export type ElementoMotor = (typeof ELEMENTOS_MOTOR)[number];
export const RACAS_MOTOR = [
  "AMORFO",
  "MORTO_VIVO",
  "BRUTO",
  "PLANTA",
  "INSETO",
  "PEIXE",
  "DEMONIO",
  "HUMANOIDE",
  "ANJO",
  "DRAGAO",
] as const;
export type RacaMotor = (typeof RACAS_MOTOR)[number];
export const TAMANHOS_MOTOR = ["PEQUENO", "MEDIO", "GRANDE"] as const;
export type TamanhoMotor = (typeof TAMANHOS_MOTOR)[number];

/** Slots de equipamento que a ficha guarda (D55). */
export const SLOTS_FICHA_MOTOR = [
  "topo",
  "meio",
  "baixo",
  "arma",
  "armadura",
  "escudo",
  "capa",
  "calcado",
  "acessorio1",
  "acessorio2",
] as const;
export type SlotFichaMotor = (typeof SLOTS_FICHA_MOTOR)[number];

export interface EquipamentoMotor {
  id: number;
  refino?: number;
  grau?: string;
  cartas?: number[];
  encantamentos?: number[];
}

/** O que a ficha guarda da build. Cada campo informado substitui o do link. */
export interface FichaMotor {
  /** Número da classe no simulador. */
  classe?: number;
  nivelBase?: number;
  nivelClasse?: number;
  /** Pontos distribuídos em cada atributo (str, agi, vit, int, dex, luk). */
  base?: Record<string, number>;
  /** Pontos de talento (pow, sta, wis, spl, con, crt). */
  talentos?: Record<string, number>;
  /** Habilidade de ataque, com o nome que o simulador usa. */
  habilidade?: { nome: string; nivel?: number };
  elementoAtaque?: ElementoMotor;
  /** Os dez slots da ficha. Informado, vale no lugar dos do link: slot ausente fica vazio. */
  equipamentos?: Partial<Record<SlotFichaMotor, EquipamentoMotor>>;
}

/** Bônus digitados pelo membro, somados aos efeitos lidos dos itens. */
export interface BonusExtrasMotor {
  atk?: number;
  atkPct?: number;
  matk?: number;
  matkPct?: number;
  pAtk?: number;
  sMatk?: number;
  fisicoRacaPct?: number;
  fisicoTamanhoPct?: number;
  fisicoElementoPct?: number;
  fisicoClassePct?: number;
  magicoRacaPct?: number;
  magicoTamanhoPct?: number;
  magicoElementoAlvoPct?: number;
  magicoElementoHabilidadePct?: number;
  magicoClassePct?: number;
  /** Dano físico a distância e corpo a corpo, o que valer para o ataque. */
  distanciaPct?: number;
  /** Dano da habilidade escolhida. */
  habilidadePct?: number;
  ignorarDefPct?: number;
  ignorarMdefPct?: number;
  ignorarResPct?: number;
  ignorarMresPct?: number;
  ignoraPenalidadeDeTamanho?: boolean;
  /** Multiplica o dano no fim da conta. */
  danoFinalPct?: number;
}

export interface AlvoMotor {
  /** ID do monstro no jogo. Com ele o motor aplica o que sabe do monstro (aura, redução de dano). */
  id?: number;
  nome?: string;
  nivel: number;
  hp?: number;
  def: number;
  mdef: number;
  vit: number;
  int: number;
  res: number;
  mres: number;
  raca?: RacaMotor;
  tamanho: TamanhoMotor;
  elemento: ElementoMotor;
  nivelElemento: number;
  chefe?: boolean;
  /** Quanto do dano o alvo recebe, em %. Só vale quando o motor não tem uma redução para o monstro. */
  danoRecebidoPct?: number;
}

export interface EntradaMotor {
  /** Token do link de compartilhamento do simulador (a build inteira). */
  token?: string;
  ficha?: FichaMotor;
  bonus?: BonusExtrasMotor;
  alvo: AlvoMotor;
  /** Data usada nos bônus de evento com prazo; o padrão é agora. */
  agora?: Date;
}

export type TipoEncaixe = "EQUIPAMENTO" | "CARTA" | "ENCANTAMENTO";

export interface EfeitoLido {
  rotulo: string;
  valor: number;
}

export interface ItemLido {
  /** Onde o item está (ex.: "Arma", "Sombrio: armadura"). */
  slot: string;
  tipo: TipoEncaixe;
  id: number;
  nome: string;
  refino?: number;
  grau?: string;
  /** Bônus que o item deu nesta build, contra este alvo. Vazio se nenhum efeito dele valeu. */
  efeitos: EfeitoLido[];
}

export interface ItemIgnorado {
  slot: string;
  tipo: TipoEncaixe;
  id: number;
  nome: string | null;
  motivo: string;
}

export interface ConjuntoAtivo {
  /** Item que traz o efeito de conjunto. */
  item: string;
  /** Itens que o conjunto exige junto. */
  com: string[];
}

export interface FaixaDeDano {
  minimo: number;
  maximo: number;
}

export interface ResultadoMotor {
  classe: { id: number; nome: string };
  nivelBase: number;
  nivelClasse: number;
  habilidade: {
    /** Como o simulador a identifica ("Nome==nível"). */
    valor: string;
    nome: string;
    nivel: number | null;
    tipo: "FISICO" | "MAGICO" | "OUTRO";
    elemento: ElementoMotor | null;
    acertos: number;
    /** % base da habilidade nesta build. */
    pct: number | null;
    precisaoPct: number | null;
  };
  /** Habilidades de ataque que a classe tem no simulador, para trocar a escolhida. */
  habilidadesDisponiveis: { valor: string; nome: string }[];
  /** Faixa de dano que o simulador mostra para a habilidade (um acerto, nas de vários acertos). */
  dano: FaixaDeDano;
  /**
   * Dano de um uso, com todos os acertos. A média é a do simulador ("Por uso"): pesa precisão e
   * crítico e arredonda para baixo antes de multiplicar pelos acertos.
   */
  porUso: FaixaDeDano & { medio: number };
  /** Ataque básico. */
  basico: FaixaDeDano & { criticoMinimo: number; criticoMaximo: number };
  atributos: {
    ataque: number;
    ataqueMagico: number;
    precisao: number;
    critico: number;
    velocidadeDeAtaque: number;
    hpMaximo: number;
    spMaximo: number;
  };
  alvo: {
    nome: string;
    /** Redução de dano que o motor aplica a este monstro, em % (0 se não houver). */
    reducaoPct: number;
    /** Vezes que a DEF publicada é multiplicada na instância (1 se não houver). */
    multiplicadorDef: number;
  };
  itens: ItemLido[];
  conjuntos: ConjuntoAtivo[];
  ignorados: ItemIgnorado[];
  /** Consumíveis da build que entraram na conta. */
  consumiveis: string[];
  /** Buffs, habilidades ativas e passivas da build com nível acima de zero, como "Nome nv. 5". */
  habilidadesEBuffs: string[];
  /** Soma dos bônus de todos os itens, buffs e do que foi digitado. */
  bonusTotais: EfeitoLido[];
  avisos: string[];
  origem: { repositorio: string; commit: string };
}

/** Dados do motor: itens, monstros, tabela de HP/SP e classes lançadas no LATAM. */
export interface DadosMotor {
  origem: { repositorio: string; commit: string };
  itens: Record<string, Bruto>;
  monstros: Record<string, Bruto>;
  hpSp: Bruto;
  classes: number[];
  /** Itens do LATAM que o motor ainda não tem: só o nome. */
  itensSemRegistro: Record<string, { name: string }>;
}

/** Erro de entrada: a build não pôde ser calculada, e a mensagem diz o porquê. */
export class ErroDoMotor extends Error {}

const ARQUIVO_DE_DADOS = "../dados/latam-ro-calc.json.gz";
/** Maior build aberta de um token (o simulador recusa acima de 512 KiB). */
const BUILD_MAXIMA = 512 * 1024;
const EFEITOS_POR_ITEM = 60;

const NOMES_ELEMENTO: Record<ElementoMotor, string> = {
  NEUTRO: "Neutral",
  AGUA: "Water",
  TERRA: "Earth",
  FOGO: "Fire",
  VENTO: "Wind",
  VENENO: "Poison",
  SAGRADO: "Holy",
  SOMBRIO: "Dark",
  FANTASMA: "Ghost",
  MALDITO: "Undead",
};
const NOMES_RACA: Record<RacaMotor, string> = {
  AMORFO: "Formless",
  MORTO_VIVO: "Undead",
  BRUTO: "Brute",
  PLANTA: "Plant",
  INSETO: "Insect",
  PEIXE: "Fish",
  DEMONIO: "Demon",
  HUMANOIDE: "DemiHuman",
  ANJO: "Angel",
  DRAGAO: "Dragon",
};
const NOMES_TAMANHO: Record<TamanhoMotor, string> = { PEQUENO: "Small", MEDIO: "Medium", GRANDE: "Large" };

/** Slot da ficha → campo do equipamento no modelo do motor. */
const CAMPOS_DA_FICHA: Record<SlotFichaMotor, string> = {
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
};

const ROTULOS_DE_SLOT: Record<string, string> = {
  weapon: "Arma",
  leftWeapon: "Arma da mão esquerda",
  ammo: "Munição",
  shield: "Escudo",
  headUpper: "Topo",
  headMiddle: "Meio",
  headLower: "Baixo",
  armor: "Armadura",
  garment: "Capa",
  boot: "Calçado",
  accLeft: "Acessório 1",
  accRight: "Acessório 2",
  pet: "Mascote",
  costumeUpper: "Visual: topo",
  costumeMiddle: "Visual: meio",
  costumeLower: "Visual: baixo",
  costumeGarment: "Visual: capa",
  costumeEnchantUpper: "Visual: pedra do topo",
  costumeEnchantMiddle: "Visual: pedra do meio",
  costumeEnchantLower: "Visual: pedra do baixo",
  costumeEnchantGarment: "Visual: pedra da capa",
  costumeEnchantGarment2: "Visual: pedra da capa 2",
  costumeEnchantGarment4: "Visual: pedra da capa 4",
  shadowWeapon: "Sombrio: arma",
  shadowShield: "Sombrio: escudo",
  shadowArmor: "Sombrio: armadura",
  shadowBoot: "Sombrio: calçado",
  shadowEarring: "Sombrio: brinco",
  shadowPendant: "Sombrio: colar",
};

const controlador = new CalculatorController();
const CAMPOS_DO_MODELO = Object.entries(createMainModel() as unknown as Record<string, unknown>);
const RELACOES = Object.entries(MainItemWithRelations) as [string, string[]][];

/**
 * Lê os dados do motor do arquivo compactado do pacote.
 * @param arquivo Caminho de outro arquivo de dados (o padrão é o do pacote)
 */
export function carregarDados(arquivo?: string): DadosMotor {
  const caminho = arquivo ?? fileURLToPath(new URL(ARQUIVO_DE_DADOS, import.meta.url));
  return JSON.parse(gunzipSync(readFileSync(caminho)).toString("utf8")) as DadosMotor;
}

/**
 * Mantém de um valor vindo do link só o que tem o mesmo formato do campo do modelo: número, texto
 * curto, lista de números ou textos e mapa de nome para número.
 * @param inicial Valor padrão do campo no modelo do motor
 * @param valor Valor recebido
 */
function valorSeguro(inicial: unknown, valor: unknown): unknown {
  const primitivo = (v: unknown) =>
    v === null || (typeof v === "number" && Number.isFinite(v)) || (typeof v === "string" && v.length <= 200);
  if (Array.isArray(inicial)) {
    return Array.isArray(valor) && valor.length <= 400 && valor.every(primitivo) ? valor : undefined;
  }
  if (typeof valor === "boolean") return valor;
  if (primitivo(valor)) return valor ?? undefined;
  if (typeof inicial !== "object" || inicial === null) return undefined;
  if (typeof valor !== "object" || Array.isArray(valor)) return undefined;
  const entradas = Object.entries(valor as Record<string, unknown>);
  if (entradas.length > 400) return undefined;
  const mapa: Record<string, unknown> = {};
  for (const [chave, item] of entradas) {
    if (chave.length <= 80 && (primitivo(item) || typeof item === "boolean")) mapa[chave] = item;
  }
  return mapa;
}

/**
 * Abre o token de um link do simulador e devolve só os campos que o modelo do motor conhece.
 * @param token Token do link (`/s/<token>/`)
 * @returns A build e se o link trazia itens personalizados; null se o token não for uma build
 */
export function abrirToken(
  token: string,
): { build: Record<string, unknown>; personalizados: boolean } | null {
  const aberto = decodeShared(token, BUILD_MAXIMA);
  if (aberto === null || Array.isArray(aberto.preset)) return null;
  const build: Record<string, unknown> = {};
  for (const [campo, inicial] of CAMPOS_DO_MODELO) {
    const seguro = valorSeguro(inicial, aberto.preset[campo]);
    if (seguro !== undefined) build[campo] = seguro;
  }
  return { build, personalizados: (aberto.items?.length ?? 0) > 0 };
}

/** Chave em que o simulador guarda os itens personalizados, no link e no rascunho do navegador. */
const CHAVE_PERSONALIZADOS = "__customItems";

/**
 * Fecha num token a build que a interface do simulador guarda no navegador. Só os campos do modelo
 * do simulador entram, com o valor que vier, mais os itens personalizados; o resultado é o mesmo
 * token do link de compartilhamento dele.
 * @param bruta Build como a interface salva (o modelo inteiro ou só o que mudou)
 * @returns O token, ou null se o valor não for uma build com classe ou não puder ser lido de volta
 */
export function fecharBuild(bruta: unknown): { token: string; personalizados: boolean } | null {
  if (typeof bruta !== "object" || bruta === null || Array.isArray(bruta)) return null;
  const recebida = bruta as Record<string, unknown>;
  if (typeof recebida["class"] !== "number") return null;
  const build: Record<string, unknown> = {};
  for (const [campo] of CAMPOS_DO_MODELO) {
    if (recebida[campo] !== undefined) build[campo] = recebida[campo];
  }
  const itens = recebida[CHAVE_PERSONALIZADOS];
  const personalizados = Array.isArray(itens) && itens.length > 0;
  let token: string;
  try {
    token = encodeBuild(build, null, personalizados ? (itens as never[]) : undefined);
  } catch {
    return null;
  }
  return decodeShared(token, BUILD_MAXIMA) === null ? null : { token, personalizados };
}

const tipoDoEncaixe = (campo: string): TipoEncaixe =>
  /Card\d?$/.test(campo) ? "CARTA" : /Enchant\d$/.test(campo) ? "ENCANTAMENTO" : "EQUIPAMENTO";

/**
 * Troca no modelo os dez slots da ficha: limpa item, refino, grau, cartas e encantamentos de cada
 * um e grava o que a ficha tem.
 * @param modelo Modelo do motor
 * @param equipamentos Slots preenchidos da ficha
 */
function aplicarEquipamentos(modelo: Record<string, Bruto>, equipamentos: FichaMotor["equipamentos"]): void {
  for (const slot of SLOTS_FICHA_MOTOR) {
    const campo = CAMPOS_DA_FICHA[slot];
    const relacoes = MainItemWithRelations[campo as ItemTypeEnum] as string[];
    for (const chave of [campo, `${campo}Refine`, `${campo}Grade`, ...relacoes]) modelo[chave] = undefined;
    const item = equipamentos?.[slot];
    if (!item) continue;
    modelo[campo] = item.id;
    if (item.refino !== undefined) modelo[`${campo}Refine`] = item.refino;
    if (item.grau !== undefined) modelo[`${campo}Grade`] = item.grau;
    const cartas = relacoes.filter((chave) => tipoDoEncaixe(chave) === "CARTA");
    const encantamentos = relacoes.filter((chave) => tipoDoEncaixe(chave) === "ENCANTAMENTO");
    (item.cartas ?? []).forEach((id, i) => {
      if (cartas[i]) modelo[cartas[i]] = id;
    });
    (item.encantamentos ?? []).forEach((id, i) => {
      if (encantamentos[i]) modelo[encantamentos[i]] = id;
    });
  }
}

/**
 * Junta a build do link com o que a ficha mudou, no formato esparso que o simulador salva.
 * @param build Build aberta do link (ou vazia)
 * @param ficha Campos da ficha
 */
function comAFicha(build: Record<string, unknown>, ficha: FichaMotor | undefined): Record<string, Bruto> {
  const modelo: Record<string, Bruto> = { ...build };
  if (!ficha) return modelo;
  if (ficha.classe !== undefined) modelo["class"] = ficha.classe;
  if (ficha.nivelBase !== undefined) modelo["level"] = ficha.nivelBase;
  if (ficha.nivelClasse !== undefined) modelo["jobLevel"] = ficha.nivelClasse;
  for (const [atributo, pontos] of Object.entries({ ...ficha.base, ...ficha.talentos })) {
    modelo[atributo] = pontos;
  }
  if (ficha.habilidade) {
    modelo["selectedAtkSkill"] =
      ficha.habilidade.nivel === undefined
        ? ficha.habilidade.nome
        : `${ficha.habilidade.nome}==${ficha.habilidade.nivel}`;
  }
  if (ficha.elementoAtaque) modelo["propertyAtk"] = NOMES_ELEMENTO[ficha.elementoAtaque];
  if (ficha.equipamentos) aplicarEquipamentos(modelo, ficha.equipamentos);
  return modelo;
}

/**
 * Monta o registro de monstro que o motor espera. Parte do monstro que ele conhece pelo ID (para
 * manter o que não está na tela, como AGI e SOR) e grava por cima os atributos informados.
 * @param alvo Alvo da simulação
 * @param monstros Monstros do motor
 */
function monstroDoAlvo(alvo: AlvoMotor, monstros: Record<string, Bruto>): Bruto {
  const conhecido = alvo.id === undefined ? undefined : monstros[alvo.id];
  const elemento = NOMES_ELEMENTO[alvo.elemento];
  const tamanho = NOMES_TAMANHO[alvo.tamanho];
  const chefe = alvo.chefe ?? (conhecido ? conhecido.stats.class !== 0 : false);
  return {
    id: alvo.id ?? 0,
    dbname: conhecido?.dbname ?? "",
    name: alvo.nome || conhecido?.name || "Alvo",
    spawn: conhecido?.spawn ?? "",
    stats: {
      str: 0,
      agi: 0,
      dex: 0,
      luk: 0,
      mvp: 0,
      ...conhecido?.stats,
      level: alvo.nivel,
      health: alvo.hp ?? conhecido?.stats.health ?? 0,
      defense: alvo.def,
      magicDefense: alvo.mdef,
      vit: alvo.vit,
      int: alvo.int,
      res: alvo.res,
      mres: alvo.mres,
      elementName: `${elemento} ${alvo.nivelElemento}`,
      elementShortName: elemento,
      scaleName: tamanho,
      raceName: alvo.raca ? NOMES_RACA[alvo.raca] : (conhecido?.stats.raceName ?? "Formless"),
      class: chefe ? 1 : 0,
    },
  };
}

/**
 * Traduz os bônus digitados para as chaves que o motor soma aos efeitos dos itens.
 * @param bonus Bônus digitados
 * @param nomeDaHabilidade Nome interno da habilidade escolhida
 */
function bonusDoMotor(
  bonus: BonusExtrasMotor | undefined,
  nomeDaHabilidade: string | undefined,
): Record<string, number> {
  if (!bonus) return {};
  const idDaHabilidade = nomeDaHabilidade === undefined ? undefined : SKILL_ID_BY_NAME[nomeDaHabilidade];
  const chaves: [string | undefined, number | undefined][] = [
    ["atk", bonus.atk],
    ["atkPercent", bonus.atkPct],
    ["matk", bonus.matk],
    ["matkPercent", bonus.matkPct],
    ["pAtk", bonus.pAtk],
    ["sMatk", bonus.sMatk],
    ["p_race_all", bonus.fisicoRacaPct],
    ["p_size_all", bonus.fisicoTamanhoPct],
    ["p_element_all", bonus.fisicoElementoPct],
    ["p_class_all", bonus.fisicoClassePct],
    ["m_race_all", bonus.magicoRacaPct],
    ["m_size_all", bonus.magicoTamanhoPct],
    ["m_element_all", bonus.magicoElementoAlvoPct],
    ["m_my_element_all", bonus.magicoElementoHabilidadePct],
    ["m_class_all", bonus.magicoClassePct],
    ["range", bonus.distanciaPct],
    ["melee", bonus.distanciaPct],
    [idDaHabilidade === undefined ? undefined : String(idDaHabilidade), bonus.habilidadePct],
    ["p_pene_race_all", bonus.ignorarDefPct],
    ["m_pene_race_all", bonus.ignorarMdefPct],
    ["pene_res", bonus.ignorarResPct],
    ["pene_mres", bonus.ignorarMresPct],
    ["ignore_size_penalty", bonus.ignoraPenalidadeDeTamanho ? 1 : 0],
  ];
  const extras: Record<string, number> = {};
  for (const [chave, valor] of chaves) {
    if (chave !== undefined && valor) extras[chave] = valor;
  }
  return extras;
}

/**
 * Bônus diferentes de zero de um resumo do motor, com o rótulo em português.
 * @param resumo Mapa chave → valor
 */
function efeitosDe(resumo: Record<string, unknown> | undefined): EfeitoLido[] {
  return Object.entries(resumo ?? {})
    .filter(([, valor]) => typeof valor === "number" && Number.isFinite(valor) && valor !== 0)
    .slice(0, EFEITOS_POR_ITEM)
    .map(([chave, valor]) => {
      const habilidade = resolveSkillKey(chave);
      return {
        rotulo: habilidade ? `Dano de ${habilidade.name} %` : bonusKeyLabel(chave),
        valor: valor as number,
      };
    });
}

/**
 * Nome da habilidade em português, como o cliente do jogo mostra.
 * @param habilidade Habilidade de ataque da classe
 */
function nomeDaHabilidade(habilidade: { name: string; label: string; labelSuffix?: string }): string {
  const nome = (SKILL_META as Record<string, { label?: string }>)[habilidade.name]?.label ?? habilidade.label;
  return habilidade.labelSuffix ? `${nome} (${habilidade.labelSuffix})` : nome;
}

/**
 * Habilidades de uma lista do motor que a build usa, com o valor escolhido.
 * @param definicoes Habilidades (buffs, ativas ou passivas), na ordem do motor
 * @param niveis Valor escolhido de cada uma, na mesma ordem
 */
function niveisAcimaDeZero(definicoes: { name: string; label: string }[], niveis: unknown): string[] {
  const lista = Array.isArray(niveis) ? niveis : [];
  return definicoes.flatMap((definicao, i) =>
    typeof lista[i] === "number" && lista[i] > 0 ? [`${nomeDaHabilidade(definicao)} nv. ${lista[i]}`] : [],
  );
}

/** Motor de dano com os efeitos dos equipamentos. Guarda os dados; cada simulação é independente. */
export class MotorLatam {
  private readonly classes: ClassRegistry;

  constructor(private readonly dados: DadosMotor) {
    this.classes = new ClassRegistry(dados.classes);
  }

  /** Projeto e commit de onde vieram o código e os dados do motor. */
  get origem(): DadosMotor["origem"] {
    return this.dados.origem;
  }

  /**
   * Diz se o motor tem a classe (as lançadas no LATAM).
   * @param classe Número da classe no simulador
   */
  temClasse(classe: number): boolean {
    return this.classes.has(classe);
  }

  /**
   * Diz se o simulador tem o monstro, para ele poder ser escolhido como alvo na interface.
   * @param id ID do monstro no jogo
   */
  temMonstro(id: number): boolean {
    return this.dados.monstros[id] !== undefined;
  }

  /**
   * Nome do item nos dados do simulador.
   * @param id ID do item no jogo
   * @returns O nome, ou null se o simulador não conhece o item
   */
  nomeDoItem(id: number): string | null {
    const nome = this.dados.itens[id]?.name ?? this.dados.itensSemRegistro[id]?.name;
    return typeof nome === "string" && nome !== "" ? nome : null;
  }

  /**
   * Monta a build para abrir na interface do simulador: a do link guardado na ficha, inteira (com
   * rotação, comparação à parte e itens personalizados), e por cima o que a ficha mostra.
   * @param entrada Token guardado e campos da ficha
   * @returns A build no formato que a interface guarda no navegador
   * @throws ErroDoMotor quando o token guardado não é uma build
   */
  buildDaFicha(entrada: Pick<EntradaMotor, "token" | "ficha">): Record<string, unknown> {
    let build: Record<string, unknown> = {};
    if (entrada.token !== undefined) {
      const aberto = decodeShared(entrada.token, BUILD_MAXIMA);
      if (aberto === null || Array.isArray(aberto.preset)) {
        throw new ErroDoMotor("O link guardado na ficha não traz uma build do simulador.");
      }
      for (const [campo] of CAMPOS_DO_MODELO) {
        if (aberto.preset[campo] !== undefined) build[campo] = aberto.preset[campo];
      }
      if (aberto.items?.length) build[CHAVE_PERSONALIZADOS] = aberto.items;
    }
    build = comAFicha(build, entrada.ficha);
    return JSON.parse(JSON.stringify(build)) as Record<string, unknown>;
  }

  /**
   * Calcula o dano da build contra o alvo. A conta é síncrona de ponta a ponta: o motor guarda
   * estado nas classes, e uma espera no meio deixaria duas simulações se misturarem.
   * @param entrada Build (link e ficha), bônus digitados e alvo
   * @throws ErroDoMotor quando a build não tem uma classe que o motor conheça ou o link é inválido
   */
  simular(entrada: EntradaMotor): ResultadoMotor {
    const avisos: string[] = [];
    let build: Record<string, unknown> = {};
    if (entrada.token !== undefined) {
      const aberto = abrirToken(entrada.token);
      if (aberto === null) throw new ErroDoMotor("O link guardado na ficha não traz uma build do simulador.");
      build = aberto.build;
      if (aberto.personalizados) {
        avisos.push("A build traz itens personalizados do simulador, que não entram na conta.");
      }
    }
    const juncao = comAFicha(build, entrada.ficha);
    const modelo = applyPreset(juncao) as Record<string, Bruto>;
    if (typeof juncao["class"] !== "number" || !this.classes.has(modelo["class"])) {
      throw new ErroDoMotor(
        "A build não tem uma classe que o simulador conheça. Importe o link do simulador na ficha.",
      );
    }
    const personagem = this.classes.newInstance(modelo["class"]);
    const pedida = modelo["selectedAtkSkill"];
    clampLevels(modelo as Bruto, personagem);
    applyJobBonus(modelo as Bruto, personagem);
    applySkillMaps(modelo as Bruto, personagem);
    resolveAtkSkill(modelo as Bruto, personagem);
    modelo["rawOptionTxts"] = toRawOptionTxtList(modelo as Bruto, this.dados.itens);
    const escolhida: string | undefined = modelo["selectedAtkSkill"];
    if (pedida && escolhida !== pedida) {
      avisos.push(`A habilidade "${pedida}" não existe para a classe: a conta usou "${escolhida}".`);
    }
    const habilidade = personagem.atkSkills.find(
      (h) =>
        h.value === escolhida ||
        h.values?.includes(escolhida) ||
        h.levelList?.some((nivel) => nivel.value === escolhida),
    );

    const calculadora = this.resolver(modelo, personagem, entrada, habilidade?.name);
    const resumo = calculadora.getTotalSummary() as Record<string, Bruto>;
    const porItem = calculadora.getItemSummary() as Record<string, Bruto>;
    const { itens, ignorados } = this.itensDaBuild(modelo, porItem);
    const dano = resumo["dmg"] ?? {};
    const conta = resumo["calc"] ?? {};
    const monstro = resumo["monster"] ?? {};
    const reducaoDoMotor = monstro.isRedAura ? 99.9 : (monstro.damageReduction ?? 0);
    const recebido = entrada.alvo.danoRecebidoPct ?? 100;
    let multiplicador = 1 + (entrada.bonus?.danoFinalPct ?? 0) / 100;
    if (reducaoDoMotor > 0) {
      if (recebido !== 100) {
        avisos.push(
          `O simulador já reduz em ${reducaoDoMotor}% o dano neste monstro: o "dano recebido" informado não foi aplicado de novo.`,
        );
      }
    } else if (recebido !== 100) {
      multiplicador *= recebido / 100;
    }
    const ajustar = (valor: unknown): number =>
      typeof valor === "number" && Number.isFinite(valor) ? Math.floor(valor * multiplicador) : 0;
    const numero = (valor: unknown): number =>
      typeof valor === "number" && Number.isFinite(valor) ? valor : 0;
    const tipo = dano.dmgType === "Magical" ? "MAGICO" : dano.dmgType === "Other" ? "OUTRO" : "FISICO";
    const elemento = ELEMENTOS_MOTOR.find((e) => NOMES_ELEMENTO[e] === dano.skillPropertyAtk) ?? null;
    const nivel = Number(String(escolhida ?? "").split("==")[1]);
    const acertos = numero(dano.skillTotalHit) || 1;
    return {
      classe: { id: modelo["class"], nome: this.classes.get(modelo["class"])?.name ?? "" },
      nivelBase: modelo["level"],
      nivelClasse: modelo["jobLevel"],
      habilidade: {
        valor: escolhida ?? "",
        nome: habilidade ? nomeDaHabilidade(habilidade) : "",
        nivel: Number.isInteger(nivel) ? nivel : null,
        tipo,
        elemento,
        acertos,
        pct: typeof dano.baseSkillDamage === "number" ? dano.baseSkillDamage : null,
        precisaoPct: typeof dano.skillAccuracy === "number" ? dano.skillAccuracy : null,
      },
      habilidadesDisponiveis: personagem.atkSkills.flatMap((h) => {
        const nome = nomeDaHabilidade(h);
        return h.levelList?.length
          ? h.levelList.map((n) => ({
              valor: String(n.value),
              nome: `${nome} nv. ${String(n.value).split("==")[1]}`,
            }))
          : [{ valor: h.value, nome: `${nome} nv. ${h.value.split("==")[1]}` }];
      }),
      dano: { minimo: ajustar(dano.skillMinDamage), maximo: ajustar(dano.skillMaxDamage) },
      porUso: {
        minimo: acertos * ajustar(numero(dano.skillMinDamage) + numero(dano.skillMinDamage2)),
        maximo: acertos * ajustar(numero(dano.skillMaxDamage) + numero(dano.skillMaxDamage2)),
        medio:
          acertos *
          ajustar(
            calcDmgDpsDetailed({
              min: numero(dano.skillDpsInputMin),
              max: numero(dano.skillDpsInputMax),
              cri: numero(dano.skillCriRateToMonster),
              criDmg: numero(dano.skillDpsInputCriDmg),
              hitsPerSec: 0,
              accRate: numero(dano.skillAccuracy),
            }).totalDamage,
          ),
      },
      basico: {
        minimo: ajustar(dano.basicMinDamage),
        maximo: ajustar(dano.basicMaxDamage),
        criticoMinimo: ajustar(dano.criMinDamage),
        criticoMaximo: ajustar(dano.criMaxDamage),
      },
      atributos: {
        ataque: numero(conta.totalStatusAtk),
        ataqueMagico: numero(conta.totalStatusMatk),
        precisao: numero(conta.totalHit),
        critico: numero(conta.totalCri),
        velocidadeDeAtaque: numero(conta.totalAspd),
        hpMaximo: numero(conta.maxHp),
        spMaximo: numero(conta.maxSp),
      },
      alvo: {
        nome: String(monstro.name ?? ""),
        reducaoPct: reducaoDoMotor,
        multiplicadorDef: numero(monstro.defMultiplier) || 1,
      },
      itens,
      conjuntos: this.conjuntosAtivos(modelo, calculadora),
      ignorados,
      consumiveis: [
        modelo["consumables"],
        modelo["consumables2"],
        modelo["aspdPotions"],
        [modelo["aspdPotion"]],
      ]
        .flat()
        .filter((id): id is number => typeof id === "number" && id > 0)
        .map((id) => this.dados.itens[id]?.name ?? `Item ${id}`),
      habilidadesEBuffs: [
        ...niveisAcimaDeZero(JobBuffs, modelo["skillBuffs"]),
        ...niveisAcimaDeZero(personagem.activeSkills, modelo["activeSkills"]),
        ...niveisAcimaDeZero(personagem.passiveSkills, modelo["passiveSkills"]),
      ],
      bonusTotais: efeitosDe(
        Object.fromEntries(
          Object.entries(resumo).filter(
            ([chave]) => !["monster", "calc", "calcSkill", "dmg"].includes(chave),
          ),
        ),
      ),
      avisos,
      origem: this.dados.origem,
    };
  }

  /**
   * Roda a cadeia de cálculo do motor (porte de `solve` em `mcp/src/engine/solve.ts`).
   * @param modelo Modelo já derivado (níveis, bônus de classe, habilidades)
   * @param personagem Instância nova da classe
   * @param entrada Alvo, bônus digitados e data
   * @param nomeDaHabilidade Nome interno da habilidade escolhida
   */
  private resolver(
    modelo: Record<string, Bruto>,
    personagem: ReturnType<ClassRegistry["newInstance"]>,
    entrada: EntradaMotor,
    nomeDaHabilidade: string | undefined,
  ): Calculator {
    const itens = this.dados.itens as Record<number, Bruto>;
    const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = personagem
      .setLearnSkills({ activeSkillIds: modelo["activeSkills"], passiveSkillIds: modelo["passiveSkills"] })
      .getSkillBonusAndName();
    const { scripts: consumiveis, usedHpL } = collectConsumables(modelo as Bruto, itens);
    const { aspdPotion, buffBonuses } = applyGuaranaCandy({
      consumables: modelo["consumables"],
      aspdPotion: modelo["aspdPotion"],
      buffDefs: JobBuffs,
      selectedBuffValues: modelo["skillBuffs"],
      activeSkillNames,
      buffBonuses: collectBuffBonuses(JobBuffs, modelo["skillBuffs"], activeSkillNames),
    });
    const digitados = bonusDoMotor(entrada.bonus, nomeDaHabilidade);
    const calculadora = new Calculator()
      .setMasterItems(itens)
      .setHpSpTable(this.dados.hpSp)
      .setClass(personagem);
    if (entrada.agora) calculadora.setClock(() => entrada.agora as Date);
    calculadora.loadItemFromModel(modelo);
    controlador.runChain(calculadora, {
      monster: monstroDoAlvo(entrada.alvo, this.dados.monstros),
      equipAtks,
      masteryAtks,
      buffEquips: buffBonuses.equipAtk,
      buffMasterys: buffBonuses.masteryAtk,
      consumeData: consumiveis,
      aspdPotion,
      extraOptionScripts: [
        ...parseOptionScripts([...modelo["rawOptionTxts"], ...customOptionScripts(modelo)]),
        ...(Object.keys(digitados).length > 0 ? [digitados] : []),
      ],
      activeSkillNames,
      learnedSkillMap,
      selectedAtkSkill: modelo["selectedAtkSkill"],
      selectedChances: [],
      usedHpL,
    });
    return calculadora;
  }

  /**
   * Separa os itens da build entre os que o motor leu (com os bônus de cada um) e os que ele não
   * conhece. Cartas e encantamentos de um equipamento desconhecido também ficam de fora.
   * @param modelo Modelo calculado
   * @param porItem Bônus por slot, como o motor devolve
   */
  private itensDaBuild(
    modelo: Record<string, Bruto>,
    porItem: Record<string, Bruto>,
  ): { itens: ItemLido[]; ignorados: ItemIgnorado[] } {
    const itens: ItemLido[] = [];
    const ignorados: ItemIgnorado[] = [];
    const vistosNaCabeca = new Set<number>();
    for (const [campo, relacoes] of RELACOES) {
      const id = modelo[campo];
      if (typeof id !== "number" || id <= 0) continue;
      const slot = ROTULOS_DE_SLOT[campo] ?? campo;
      if (campo.startsWith("head")) {
        if (vistosNaCabeca.has(id)) continue;
        vistosNaCabeca.add(id);
      }
      const equipado = this.dados.itens[id] !== undefined;
      for (const chave of [campo, ...relacoes]) {
        const idDoEncaixe = modelo[chave];
        if (typeof idDoEncaixe !== "number" || idDoEncaixe <= 0) continue;
        const tipo = tipoDoEncaixe(chave);
        const registro = this.dados.itens[idDoEncaixe];
        if (registro === undefined || !equipado) {
          ignorados.push({
            slot,
            tipo,
            id: idDoEncaixe,
            nome: registro?.name ?? this.dados.itensSemRegistro[idDoEncaixe]?.name ?? null,
            motivo:
              registro === undefined
                ? "o simulador da latam-tools ainda não tem os efeitos deste item"
                : "está num equipamento que o simulador não conhece",
          });
          continue;
        }
        const refino = chave === campo ? modelo[`${campo}Refine`] : undefined;
        const grau = chave === campo ? modelo[`${campo}Grade`] : undefined;
        itens.push({
          slot,
          tipo,
          id: idDoEncaixe,
          nome: registro.name,
          ...(typeof refino === "number" && refino > 0 ? { refino } : {}),
          ...(typeof grau === "string" && grau !== "" ? { grau: grau.toUpperCase() } : {}),
          efeitos: efeitosDe(porItem[chave]),
        });
      }
    }
    return { itens, ignorados };
  }

  /**
   * Conjuntos que valeram: linhas de efeito condicionadas a outros itens (`EQUIP[...]` e
   * `EQUIP_ID[...]`) que o motor considerou ativas nesta build.
   * @param modelo Modelo calculado
   * @param calculadora Calculadora já resolvida
   */
  private conjuntosAtivos(modelo: Record<string, Bruto>, calculadora: Calculator): ConjuntoAtivo[] {
    const conjuntos = new Map<string, ConjuntoAtivo>();
    for (const [campo, relacoes] of RELACOES) {
      if (this.dados.itens[modelo[campo]] === undefined) continue;
      const refino = typeof modelo[`${campo}Refine`] === "number" ? modelo[`${campo}Refine`] : 0;
      for (const chave of [campo, ...relacoes]) {
        const item = this.dados.itens[modelo[chave]];
        if (item === undefined || typeof item.script !== "object" || item.script === null) continue;
        for (const linhas of Object.values(item.script as Record<string, unknown>)) {
          for (const linha of Array.isArray(linhas) ? linhas : []) {
            const condicao = typeof linha === "string" ? /^EQUIP(_ID)?\[([^\]]+)\]/.exec(linha) : null;
            if (!condicao) continue;
            if (!calculadora.evaluateItemRule(chave as ItemTypeEnum, linha, refino).active) continue;
            const com = condicao[2]
              .split(/&&|\|\|/)
              .map((parte) => parte.trim())
              .filter((parte) => parte !== "")
              .map((parte) => (condicao[1] ? (this.dados.itens[parte]?.name ?? `Item ${parte}`) : parte));
            const assinatura = `${item.id}|${com.join("|")}`;
            conjuntos.set(assinatura, { item: item.name, com });
          }
        }
      }
    }
    return [...conjuntos.values()];
  }
}
