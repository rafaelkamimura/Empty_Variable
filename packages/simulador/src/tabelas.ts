// Tabelas públicas do RO Renewal usadas pela simulação (D57). Fontes, consultadas em 2026-11-21:
//   propriedades: https://irowiki.org/wiki/Element
//   tamanho:      https://irowiki.org/wiki/Size
//   refino:       https://irowiki.org/wiki/Refinement_System (a própria página avisa que a parte de
//                 armas pode estar desatualizada)
// Nada aqui vem do código nem dos dados do simulador da latam-tools.

export const ELEMENTOS = [
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
export type Elemento = (typeof ELEMENTOS)[number];

export const TAMANHOS = ["PEQUENO", "MEDIO", "GRANDE"] as const;
export type Tamanho = (typeof TAMANHOS)[number];

export const RACAS = [
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
export type Raca = (typeof RACAS)[number];

// Linha: propriedade de quem defende; coluna: propriedade do ataque (ordem de ELEMENTOS). Em %.
const TABELA_ELEMENTAL: readonly (readonly (readonly number[])[])[] = [
  [
    [100, 100, 100, 100, 100, 100, 100, 100, 90, 100],
    [100, 25, 100, 90, 150, 150, 100, 100, 100, 100],
    [100, 100, 25, 150, 90, 150, 100, 100, 100, 100],
    [100, 150, 90, 25, 100, 150, 100, 100, 100, 90],
    [100, 90, 150, 100, 25, 150, 100, 100, 100, 100],
    [100, 150, 150, 150, 150, 0, 75, 75, 75, 75],
    [100, 100, 100, 100, 100, 75, 0, 125, 90, 125],
    [100, 100, 100, 100, 100, 75, 125, 0, 90, 0],
    [90, 100, 100, 100, 100, 75, 100, 100, 125, 100],
    [100, 100, 100, 125, 100, 75, 125, 0, 100, 0],
  ],
  [
    [100, 100, 100, 100, 100, 100, 100, 100, 70, 100],
    [100, 0, 100, 80, 175, 150, 100, 100, 100, 100],
    [100, 100, 0, 175, 80, 150, 100, 100, 100, 100],
    [100, 175, 80, 0, 100, 150, 100, 100, 100, 80],
    [100, 80, 175, 100, 0, 150, 100, 100, 100, 100],
    [100, 150, 150, 150, 150, 0, 75, 75, 75, 50],
    [100, 100, 100, 100, 100, 75, 0, 150, 80, 150],
    [100, 100, 100, 100, 100, 75, 150, 0, 80, 0],
    [70, 100, 100, 100, 100, 75, 100, 100, 150, 125],
    [100, 100, 100, 150, 100, 50, 150, 0, 125, 0],
  ],
  [
    [100, 100, 100, 100, 100, 100, 100, 100, 50, 100],
    [100, 0, 100, 70, 200, 125, 100, 100, 100, 100],
    [100, 100, 0, 200, 70, 125, 100, 100, 100, 100],
    [100, 200, 70, 0, 100, 125, 100, 100, 100, 70],
    [100, 70, 200, 100, 0, 125, 100, 100, 100, 100],
    [100, 125, 125, 125, 125, 0, 50, 50, 50, 25],
    [100, 100, 100, 100, 100, 50, 0, 175, 70, 175],
    [100, 100, 100, 100, 100, 50, 175, 0, 70, 0],
    [50, 100, 100, 100, 100, 50, 100, 100, 175, 150],
    [100, 100, 100, 175, 100, 25, 175, 0, 150, 0],
  ],
  [
    [100, 100, 100, 100, 100, 100, 100, 100, 0, 100],
    [100, 0, 100, 60, 200, 125, 100, 100, 100, 100],
    [100, 100, 0, 200, 60, 125, 100, 100, 100, 100],
    [100, 200, 60, 0, 100, 125, 100, 100, 100, 60],
    [100, 60, 200, 100, 0, 125, 100, 100, 100, 100],
    [100, 125, 125, 125, 125, 0, 50, 50, 50, 0],
    [100, 100, 100, 100, 100, 50, 0, 200, 60, 200],
    [100, 100, 100, 100, 100, 50, 200, 0, 60, 0],
    [0, 100, 100, 100, 100, 50, 100, 100, 200, 175],
    [100, 100, 100, 200, 100, 0, 200, 0, 175, 0],
  ],
];

/**
 * Quanto um ataque de uma propriedade causa num alvo de outra, em % (100 = dano normal).
 * @param ataque Propriedade do ataque
 * @param defesa Propriedade do alvo
 * @param nivelDefesa Nível da propriedade do alvo, de 1 a 4 (fora disso, vale o limite mais próximo)
 */
export function modificadorElemental(ataque: Elemento, defesa: Elemento, nivelDefesa: number): number {
  const nivel = Math.min(4, Math.max(1, Math.trunc(nivelDefesa)));
  return TABELA_ELEMENTAL[nivel - 1]?.[ELEMENTOS.indexOf(defesa)]?.[ELEMENTOS.indexOf(ataque)] ?? 100;
}

export interface DadosTipoArma {
  rotulo: string;
  /** Dano em % contra alvo pequeno, médio e grande. */
  tamanho: readonly [number, number, number];
  /** Arcos, armas de fogo, instrumentos e chicotes: o ATQ usa DES no lugar de FOR. */
  usaDes: boolean;
}

export const TIPOS_ARMA = {
  SEM_ARMA: { rotulo: "Sem arma", tamanho: [100, 100, 100], usaDes: false },
  ADAGA: { rotulo: "Adaga", tamanho: [100, 75, 50], usaDes: false },
  ESPADA: { rotulo: "Espada de uma mão", tamanho: [75, 100, 75], usaDes: false },
  ESPADA_DUAS_MAOS: { rotulo: "Espada de duas mãos", tamanho: [75, 75, 100], usaDes: false },
  LANCA: { rotulo: "Lança (a pé)", tamanho: [75, 75, 100], usaDes: false },
  LANCA_MONTADO: { rotulo: "Lança (montado em Peco ou Grifo)", tamanho: [75, 100, 100], usaDes: false },
  LANCA_DRAGAO: { rotulo: "Lança (montado em dragão)", tamanho: [100, 100, 100], usaDes: false },
  MACHADO: { rotulo: "Machado", tamanho: [50, 75, 100], usaDes: false },
  MACA: { rotulo: "Maça", tamanho: [75, 100, 100], usaDes: false },
  CAJADO: { rotulo: "Cajado", tamanho: [100, 100, 100], usaDes: false },
  ARCO: { rotulo: "Arco", tamanho: [100, 100, 75], usaDes: true },
  KATAR: { rotulo: "Katar", tamanho: [75, 100, 75], usaDes: false },
  LIVRO: { rotulo: "Livro", tamanho: [100, 100, 50], usaDes: false },
  SOQUEIRA: { rotulo: "Soqueira", tamanho: [100, 100, 75], usaDes: false },
  INSTRUMENTO: { rotulo: "Instrumento", tamanho: [75, 100, 75], usaDes: true },
  CHICOTE: { rotulo: "Chicote", tamanho: [75, 100, 50], usaDes: true },
  ARMA_DE_FOGO: { rotulo: "Arma de fogo", tamanho: [100, 100, 100], usaDes: true },
  HUUMA: { rotulo: "Shuriken Huuma", tamanho: [75, 75, 100], usaDes: false },
} as const satisfies Record<string, DadosTipoArma>;
export type TipoArma = keyof typeof TIPOS_ARMA;
export const CODIGOS_TIPO_ARMA = Object.keys(TIPOS_ARMA) as TipoArma[];

/**
 * Penalidade de tamanho da arma, em % (100 = sem penalidade).
 * @param tipo Tipo da arma
 * @param tamanho Tamanho do alvo
 */
export function penalidadeDeTamanho(tipo: TipoArma, tamanho: Tamanho): number {
  return TIPOS_ARMA[tipo].tamanho[TAMANHOS.indexOf(tamanho)] ?? 100;
}

export interface BonusRefino {
  /** Bônus fixo de ATQ/ATQM pelo refino, somado ao bônus de refino alto (+16 em diante). */
  fixo: number;
  /** Teto do bônus aleatório por golpe do refino acima do limite seguro (o piso é 0). */
  variavelMaximo: number;
}

// [bônus por refino, limite seguro, variável por refino acima do seguro, bônus alto por refino a partir do +16]
const REFINO_ARMA: readonly (readonly [number, number, number, number])[] = [
  [2, 7, 2, 1],
  [3, 6, 5, 2],
  [5, 5, 8, 2],
  [7, 4, 14, 3],
  [8, 20, 0, 0],
];

/**
 * Bônus de ATQ (ou ATQM) que o refino dá à arma. Armas de nível 5 só recebem aqui os 8 pontos por
 * refino: o A.FÍS/A.MÁG do refino e o bônus do grau delas ficam de fora (ver NAO_CONSIDERA).
 * @param nivelArma Nível da arma, de 1 a 5
 * @param refino Refino, de 0 a 20
 */
export function bonusRefinoArma(nivelArma: number, refino: number): BonusRefino {
  const nivel = Math.min(5, Math.max(1, Math.trunc(nivelArma)));
  const r = Math.min(20, Math.max(0, Math.trunc(refino)));
  const [porRefino, seguro, variavel, alto] = REFINO_ARMA[nivel - 1] ?? [0, 20, 0, 0];
  return {
    fixo: porRefino * r + (r >= 16 ? alto * r : 0),
    variavelMaximo: variavel * Math.max(0, r - seguro),
  };
}
