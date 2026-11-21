// Cálculo de dano (D57) pelas fórmulas públicas do RO Renewal, consultadas em 2026-11-21:
//   ATQ:    https://irowiki.org/wiki/ATK        ATQM:  https://irowiki.org/wiki/MATK
//   DEF:    https://irowiki.org/wiki/DEF        DEFM:  https://irowiki.org/wiki/MDEF
//   RES:    https://irowiki.org/wiki/RES        ordem: https://irowiki.org/wiki/Attacks
//   talentos (POD, FEI, CON): https://irowiki.org/wiki/Stats
// É uma implementação própria: nada aqui vem do código nem dos dados do simulador da latam-tools.
// O jogo não tem casas decimais, então cada etapa arredonda para baixo.
import {
  bonusRefinoArma,
  type Elemento,
  modificadorElemental,
  penalidadeDeTamanho,
  type Tamanho,
  type TipoArma,
  TIPOS_ARMA,
} from "./tabelas.js";

/** O que a simulação leva em conta. A tela mostra estas frases como estão. */
export const CONSIDERA: readonly string[] = [
  "ATQ e ATQM de atributos (nível base, FOR, DES, INT, SOR, POD e FEI)",
  "ATQ ou ATQM base da arma, variação por nível da arma e bônus de refino (fixo, acima do seguro e +16)",
  "penalidade de tamanho da arma e tabela de propriedades contra o alvo",
  "A.FÍS e A.MÁG de POD, FEI e CON, mais o que você informar",
  "DEF, DEFM, RES e RESM do alvo, com a DEF e a DEFM de atributos dele",
  "os bônus de equipamento que você digitar (ATQ, %, raça, tamanho, propriedade, classe, perfuração)",
];

/** O que a simulação deixa de fora. A tela mostra estas frases como estão. */
export const NAO_CONSIDERA: readonly string[] = [
  "efeitos de equipamentos, cartas, encantamentos, conjuntos, sombrios e visuais: nada é lido dos itens, só o que você digitar",
  "a fórmula de cada habilidade: informe a % da habilidade e o número de acertos",
  "buffs, consumíveis, munição, mascote e habilidades passivas, a não ser que você some nos bônus",
  "ajustes próprios do LATAM: as fórmulas são as públicas do Renewal",
  "crítico, precisão, esquiva, velocidade de ataque, conjuração e pós-conjuração (não há DPS)",
  "A.FÍS/A.MÁG do refino e bônus de grau das armas de nível 5",
  "mecânicas do chefe na instância (cura, invulnerabilidade, Aliviar, HP diferente do banco de dados)",
];

/** Pontos que seguem uma leitura das fontes que não foi conferida no jogo. */
export const NAO_CONFIRMADO: readonly string[] = [
  "a perfuração de RES e RESM é aplicada como a de DEF (reduz o RES do alvo em %); a fonte não detalha a conta",
  "o ATQ de atributos é tratado como Neutro e sofre a tabela de propriedades (pesa contra alvos Fantasma)",
  "a ordem entre RES, % da habilidade e DEF segue a wiki; diferenças de arredondamento são de poucos pontos",
];

export interface Alvo {
  nivel: number;
  def: number;
  mdef: number;
  vit: number;
  int: number;
  res: number;
  mres: number;
  tamanho: Tamanho;
  elemento: Elemento;
  nivelElemento: number;
  /** Quanto do dano o alvo recebe, em % (alguns chefes recebem só uma fração). */
  danoRecebidoPct: number;
}

export interface Atacante {
  nivelBase: number;
  /** Atributos totais (base + bônus de classe + equipamentos). */
  str: number;
  dex: number;
  int: number;
  luk: number;
  pow: number;
  spl: number;
  con: number;
}

export interface ArmaSimulada {
  tipo: TipoArma;
  /** ATQ base (simulação física) ou ATQM base (simulação mágica) da arma, sem refino. */
  ataque: number;
  nivel: number;
  refino: number;
}

export interface Habilidade {
  /** % da habilidade (100 = ataque básico). */
  pct: number;
  acertos: number;
}

/** Bônus de equipamento, cartas e buffs que o membro soma por conta própria. Tudo começa em 0. */
export interface BonusFisico {
  /** ATQ de equipamento, consumíveis e munição. */
  atkEquipamento: number;
  atkPct: number;
  racaPct: number;
  tamanhoPct: number;
  elementoPct: number;
  classePct: number;
  /** A.FÍS além do que vem de POD e CON. */
  patk: number;
  atkMaestria: number;
  /** Dano físico a distância ou corpo a corpo, o que valer para o ataque. */
  distanciaPct: number;
  /** Dano da habilidade aumentado por equipamento. */
  habilidadePct: number;
  ignorarDefPct: number;
  ignorarResPct: number;
  danoFinalPct: number;
  ignoraPenalidadeDeTamanho: boolean;
}

export interface BonusMagico {
  matkEquipamento: number;
  matkPct: number;
  racaPct: number;
  tamanhoPct: number;
  /** Dano mágico contra a propriedade do alvo. */
  elementoAlvoPct: number;
  /** Dano mágico da propriedade da habilidade. */
  elementoHabilidadePct: number;
  classePct: number;
  /** A.MÁG além do que vem de FEI e CON. */
  smatk: number;
  habilidadePct: number;
  ignorarMdefPct: number;
  ignorarMresPct: number;
  danoFinalPct: number;
}

export const BONUS_FISICO_ZERADO: BonusFisico = {
  atkEquipamento: 0,
  atkPct: 0,
  racaPct: 0,
  tamanhoPct: 0,
  elementoPct: 0,
  classePct: 0,
  patk: 0,
  atkMaestria: 0,
  distanciaPct: 0,
  habilidadePct: 0,
  ignorarDefPct: 0,
  ignorarResPct: 0,
  danoFinalPct: 0,
  ignoraPenalidadeDeTamanho: false,
};

export const BONUS_MAGICO_ZERADO: BonusMagico = {
  matkEquipamento: 0,
  matkPct: 0,
  racaPct: 0,
  tamanhoPct: 0,
  elementoAlvoPct: 0,
  elementoHabilidadePct: 0,
  classePct: 0,
  smatk: 0,
  habilidadePct: 0,
  ignorarMdefPct: 0,
  ignorarMresPct: 0,
  danoFinalPct: 0,
};

export interface EntradaFisica {
  atacante: Atacante;
  arma: ArmaSimulada;
  elementoAtaque: Elemento;
  bonus: BonusFisico;
  habilidade: Habilidade;
  alvo: Alvo;
}

export interface EntradaMagica {
  atacante: Atacante;
  arma: ArmaSimulada;
  elementoAtaque: Elemento;
  bonus: BonusMagico;
  habilidade: Habilidade;
  alvo: Alvo;
}

export interface Faixa {
  minimo: number;
  maximo: number;
  /** Média simples entre o mínimo e o máximo. */
  medio: number;
}

export interface ResultadoSimulacao {
  porAcerto: Faixa;
  total: Faixa;
  detalhe: {
    /** ATQ (ou ATQM) de atributos. */
    ataqueDeAtributos: number;
    /** ATQ (ou ATQM) da arma com refino; no físico, já com a penalidade de tamanho. */
    ataqueDaArma: { minimo: number; maximo: number };
    /** A.FÍS (ou A.MÁG) total. */
    amplificacao: number;
    /** Tabela de propriedades: ataque contra o alvo, em %. */
    modificadorElementalPct: number;
    /** Penalidade de tamanho aplicada, em % (100 no mágico). */
    penalidadeDeTamanhoPct: number;
    /** DEF (ou DEFM) do alvo depois da perfuração e quanto do dano passa por ela, em %. */
    defesa: number;
    passaPelaDefesaPct: number;
    /** DEF (ou DEFM) de atributos do alvo, descontada do dano. */
    defesaDeAtributos: number;
    /** RES (ou RESM) do alvo depois da perfuração e quanto do dano passa por ele, em %. */
    resistencia: number;
    passaPelaResistenciaPct: number;
  };
}

const piso = (valor: number): number => Math.floor(valor + 1e-6);
const naoNegativo = (valor: number): number => (Number.isFinite(valor) && valor > 0 ? valor : 0);
const mais = (valor: number, pct: number): number => piso((valor * (100 + pct)) / 100);
const arredondar = (pct: number): number => Math.round(pct * 100) / 100;

/**
 * ATQ de atributos. Arcos, armas de fogo, instrumentos e chicotes trocam FOR por DES.
 * @param atacante Nível base e atributos totais
 * @param tipoArma Tipo da arma equipada
 */
export function atkDeAtributos(atacante: Atacante, tipoArma: TipoArma): number {
  const [principal, secundario] = TIPOS_ARMA[tipoArma].usaDes
    ? [atacante.dex, atacante.str]
    : [atacante.str, atacante.dex];
  return (
    piso(atacante.nivelBase / 4) +
    piso(principal) +
    piso(secundario / 5) +
    piso(atacante.luk / 3) +
    5 * piso(atacante.pow)
  );
}

/**
 * ATQM de atributos.
 * @param atacante Nível base e atributos totais
 */
export function matkDeAtributos(atacante: Atacante): number {
  return (
    piso(atacante.nivelBase / 4) +
    piso(atacante.int) +
    piso(atacante.int / 2) +
    piso(atacante.dex / 5) +
    piso(atacante.luk / 3) +
    5 * piso(atacante.spl)
  );
}

/**
 * Quanto do dano passa pela DEF de equipamento, como fração: (4000 + DEF) / (4000 + DEF × 10).
 * @param def DEF do alvo, já com a perfuração aplicada
 */
export function fatorDef(def: number): number {
  const d = naoNegativo(def);
  return (4000 + d) / (4000 + d * 10);
}

/**
 * Quanto do dano passa pela DEFM de equipamento, como fração: (1000 + DEFM) / (1000 + DEFM × 10).
 * @param mdef DEFM do alvo, já com a perfuração aplicada
 */
export function fatorMdef(mdef: number): number {
  const d = naoNegativo(mdef);
  return (1000 + d) / (1000 + d * 10);
}

/**
 * Quanto do dano passa pelo RES (ou RESM), como fração: (2000 + RES) / (2000 + RES × 5).
 * @param res RES ou RESM do alvo, já com a perfuração aplicada
 */
export function fatorRes(res: number): number {
  const r = naoNegativo(res);
  return (2000 + r) / (2000 + r * 5);
}

/**
 * Defesa que sobra depois da perfuração em % (de 0 a 100).
 * @param defesa DEF, DEFM, RES ou RESM do alvo
 * @param ignorarPct Soma das perfurações, em %
 */
export function defesaAposPerfuracao(defesa: number, ignorarPct: number): number {
  const pct = Math.min(100, naoNegativo(ignorarPct));
  return piso((naoNegativo(defesa) * (100 - pct)) / 100);
}

/**
 * DEF de atributos de um monstro: (VIT + nível) / 2.
 * @param alvo Nível e VIT do monstro
 */
export function defDeAtributosDoMonstro(alvo: Pick<Alvo, "nivel" | "vit">): number {
  return piso((naoNegativo(alvo.vit) + naoNegativo(alvo.nivel)) / 2);
}

/**
 * DEFM de atributos de um monstro: nível / 4 + VIT / 10 + INT / 5.
 * @param alvo Nível, VIT e INT do monstro
 */
export function mdefDeAtributosDoMonstro(alvo: Pick<Alvo, "nivel" | "vit" | "int">): number {
  return (
    piso(naoNegativo(alvo.nivel) / 4) + piso(naoNegativo(alvo.vit) / 10) + piso(naoNegativo(alvo.int) / 5)
  );
}

/**
 * Soma dos multiplicadores de ATQ sobre o ATQ da arma mais o de equipamento. O grupo do ATQ% não
 * acumula com o de raça, tamanho, propriedade e classe: os dois são somados.
 * @param base ATQ da arma mais ATQ de equipamento
 * @param bonus Bônus informados pelo membro
 */
export function atkComMultiplicadores(
  base: number,
  bonus: Pick<BonusFisico, "atkPct" | "racaPct" | "tamanhoPct" | "elementoPct" | "classePct">,
): number {
  const grupoA = (base * bonus.atkPct) / 100;
  const grupoB =
    (base *
      (100 + bonus.racaPct) *
      (100 + bonus.tamanhoPct) *
      (100 + bonus.elementoPct) *
      (100 + bonus.classePct)) /
    100 ** 4;
  return piso(grupoA + grupoB);
}

export interface ContraHp {
  /** Quanto do HP um uso tira, em %, no pior e no melhor caso. */
  pctMinimo: number;
  pctMaximo: number;
  /** Quantos usos derrubam o HP no melhor e no pior caso; null quando o dano é zero. */
  usosMinimo: number | null;
  usosMaximo: number | null;
}

/**
 * Compara o dano de um uso da habilidade com o HP do alvo. Não conta cura nem regeneração.
 * @param hp HP do alvo
 * @param total Dano total de um uso (todos os acertos)
 */
export function contraHp(hp: number, total: Faixa): ContraHp {
  const vida = Math.max(1, naoNegativo(hp));
  const usos = (dano: number): number | null => (dano > 0 ? Math.ceil(vida / dano) : null);
  return {
    pctMinimo: Math.round((total.minimo / vida) * 1e6) / 1e4,
    pctMaximo: Math.round((total.maximo / vida) * 1e6) / 1e4,
    usosMinimo: usos(total.maximo),
    usosMaximo: usos(total.minimo),
  };
}

function faixa(minimo: number, maximo: number): Faixa {
  return { minimo, maximo, medio: (minimo + maximo) / 2 };
}

function vezes(porAcerto: Faixa, acertos: number): Faixa {
  const n = Math.max(1, piso(acertos));
  return faixa(porAcerto.minimo * n, porAcerto.maximo * n);
}

/**
 * Dano físico de um golpe ou habilidade contra um alvo, do menor ao maior valor possível.
 * @param entrada Atacante, arma, bônus digitados, habilidade e alvo
 */
export function simularFisico(entrada: EntradaFisica): ResultadoSimulacao {
  const { atacante, arma, bonus, habilidade, alvo } = entrada;
  const principal = TIPOS_ARMA[arma.tipo].usaDes ? atacante.dex : atacante.str;
  const ataqueDeAtributos = atkDeAtributos(atacante, arma.tipo);
  const amplificacao = piso(atacante.pow / 3) + piso(atacante.con / 5) + bonus.patk;
  const semArma = arma.tipo === "SEM_ARMA";
  const base = semArma ? 0 : naoNegativo(arma.ataque);
  const refino = semArma ? { fixo: 0, variavelMaximo: 0 } : bonusRefinoArma(arma.nivel, arma.refino);
  const variacao = piso(0.05 * arma.nivel * base);
  const bonusDeAtributo = piso((base * principal) / 200);
  const penalidade = bonus.ignoraPenalidadeDeTamanho ? 100 : penalidadeDeTamanho(arma.tipo, alvo.tamanho);
  const armaMinima = piso(((base - variacao + bonusDeAtributo + refino.fixo) * penalidade) / 100);
  const armaMaxima = piso(
    ((base + variacao + bonusDeAtributo + refino.fixo + refino.variavelMaximo) * penalidade) / 100,
  );

  const elemental = modificadorElemental(entrada.elementoAtaque, alvo.elemento, alvo.nivelElemento);
  const neutro = modificadorElemental("NEUTRO", alvo.elemento, alvo.nivelElemento);
  const def = defesaAposPerfuracao(alvo.def, bonus.ignorarDefPct);
  const res = defesaAposPerfuracao(alvo.res, bonus.ignorarResPct);
  const defesaDeAtributos = defDeAtributosDoMonstro(alvo);

  const dano = (ataqueDaArma: number): number => {
    const comMultiplicadores = atkComMultiplicadores(ataqueDaArma + bonus.atkEquipamento, bonus);
    const atk =
      mais(
        piso((ataqueDeAtributos * 2 * neutro) / 100) + piso((comMultiplicadores * elemental) / 100),
        amplificacao,
      ) + bonus.atkMaestria;
    if (atk <= 0) return 0;
    let d = mais(atk, bonus.distanciaPct);
    d = piso(d * fatorRes(res));
    d = mais(piso((d * naoNegativo(habilidade.pct)) / 100), bonus.habilidadePct);
    d = piso(d * fatorDef(def)) - defesaDeAtributos;
    d = mais(d, bonus.danoFinalPct);
    d = piso((d * naoNegativo(alvo.danoRecebidoPct)) / 100);
    return Math.max(1, d);
  };

  const porAcerto = faixa(dano(armaMinima), dano(armaMaxima));
  return {
    porAcerto,
    total: vezes(porAcerto, habilidade.acertos),
    detalhe: {
      ataqueDeAtributos,
      ataqueDaArma: { minimo: armaMinima, maximo: armaMaxima },
      amplificacao,
      modificadorElementalPct: elemental,
      penalidadeDeTamanhoPct: penalidade,
      defesa: def,
      passaPelaDefesaPct: arredondar(fatorDef(def) * 100),
      defesaDeAtributos,
      resistencia: res,
      passaPelaResistenciaPct: arredondar(fatorRes(res) * 100),
    },
  };
}

/**
 * Dano mágico de uma habilidade contra um alvo, do menor ao maior valor possível.
 * @param entrada Atacante, arma, bônus digitados, habilidade e alvo
 */
export function simularMagico(entrada: EntradaMagica): ResultadoSimulacao {
  const { atacante, arma, bonus, habilidade, alvo } = entrada;
  const ataqueDeAtributos = matkDeAtributos(atacante);
  const amplificacao = piso(atacante.spl / 3) + piso(atacante.con / 5) + bonus.smatk;
  const semArma = arma.tipo === "SEM_ARMA";
  const base = semArma ? 0 : naoNegativo(arma.ataque);
  const refino = semArma ? { fixo: 0, variavelMaximo: 0 } : bonusRefinoArma(arma.nivel, arma.refino);
  const variacao = piso(0.1 * arma.nivel * (base + refino.fixo));
  const armaMinima = base + refino.fixo - variacao;
  const armaMaxima = base + refino.fixo + variacao + refino.variavelMaximo;

  const elemental = modificadorElemental(entrada.elementoAtaque, alvo.elemento, alvo.nivelElemento);
  const mdef = defesaAposPerfuracao(alvo.mdef, bonus.ignorarMdefPct);
  const mres = defesaAposPerfuracao(alvo.mres, bonus.ignorarMresPct);
  const defesaDeAtributos = mdefDeAtributosDoMonstro(alvo);

  const dano = (ataqueDaArma: number): number => {
    let d = ataqueDeAtributos + ataqueDaArma + bonus.matkEquipamento;
    for (const pct of [
      bonus.matkPct,
      bonus.tamanhoPct,
      bonus.elementoAlvoPct,
      bonus.elementoHabilidadePct,
      bonus.racaPct,
      bonus.classePct,
      amplificacao,
    ]) {
      d = mais(d, pct);
    }
    d = piso((d * elemental) / 100);
    if (d <= 0) return 0;
    d = piso(d * fatorRes(mres));
    d = mais(piso((d * naoNegativo(habilidade.pct)) / 100), bonus.habilidadePct);
    d = piso(d * fatorMdef(mdef)) - defesaDeAtributos;
    d = mais(d, bonus.danoFinalPct);
    d = piso((d * naoNegativo(alvo.danoRecebidoPct)) / 100);
    return Math.max(1, d);
  };

  const porAcerto = faixa(dano(armaMinima), dano(armaMaxima));
  return {
    porAcerto,
    total: vezes(porAcerto, habilidade.acertos),
    detalhe: {
      ataqueDeAtributos,
      ataqueDaArma: { minimo: armaMinima, maximo: armaMaxima },
      amplificacao,
      modificadorElementalPct: elemental,
      penalidadeDeTamanhoPct: 100,
      defesa: mdef,
      passaPelaDefesaPct: arredondar(fatorMdef(mdef) * 100),
      defesaDeAtributos,
      resistencia: mres,
      passaPelaResistenciaPct: arredondar(fatorRes(mres) * 100),
    },
  };
}
