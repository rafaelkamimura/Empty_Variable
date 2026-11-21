import { BadRequestException } from "@nestjs/common";
import { ELEMENTOS, type Elemento } from "@betel/simulador";
import { inteiro, objeto, texto } from "../comum/validacao.js";

// D57: o que a ficha guarda da build além do item de cada slot. Fichas antigas trazem só `{id, nome}`
// (ou só o nome) em cada slot e nenhum atributo, e continuam válidas.

export const SLOTS_FICHA = [
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

export const GRAUS = ["D", "C", "B", "A"] as const;
export type Grau = (typeof GRAUS)[number];

export const ATRIBUTOS = ["str", "agi", "vit", "int", "dex", "luk"] as const;
export const TALENTOS = ["pow", "sta", "wis", "spl", "con", "crt"] as const;
export type Atributo = (typeof ATRIBUTOS)[number];
export type Talento = (typeof TALENTOS)[number];

export const REFINO_MAXIMO = 20;
/** A arma tem até quatro cartas e quatro encantamentos; os outros slots usam menos. */
export const ENCAIXES_MAXIMOS = 4;
const ID_MAXIMO = 2_147_483_647;
/** D59: token do link do simulador guardado na ficha (a build inteira, compactada). */
export const TOKEN_BUILD = /^[A-Za-z0-9.\-$]{8,}$/;
export const TOKEN_BUILD_MAXIMO = 16 * 1024;

/** Carta ou encantamento: o ID do jogo e, quando a Divine Pride respondeu, o nome. */
export type EncaixeFicha = {
  id: number;
  nome: string | null;
};

export type EquipamentoFicha = {
  id: number;
  nome: string;
  refino?: number;
  grau?: Grau;
  cartas?: EncaixeFicha[];
  encantamentos?: EncaixeFicha[];
};

export type AtributosFicha = {
  nivelClasse?: number;
  /** Pontos distribuídos em cada atributo. */
  base?: Partial<Record<Atributo, number>>;
  /** Bônus de classe de cada atributo. */
  bonusClasse?: Partial<Record<Atributo, number>>;
  talentos?: Partial<Record<Talento, number>>;
  /** Habilidade de ataque escolhida no simulador, com o nome que ele usa. */
  habilidade?: { nome: string; nivel?: number };
  elementoAtaque?: Elemento;
  /** D59: número da classe no simulador, para calcular a build mesmo sem o link. */
  classeSimulador?: number;
  /**
   * D59: token do link importado. Traz o que a ficha não mostra (sombrios, visuais, mascote,
   * consumíveis, buffs e habilidades aprendidas) e é lido de novo a cada simulação.
   */
  token?: string;
};

function lerEncaixes(valor: unknown, campo: string): EncaixeFicha[] | undefined {
  if (valor === undefined || valor === null) return undefined;
  if (!Array.isArray(valor) || valor.length > ENCAIXES_MAXIMOS) {
    throw new BadRequestException(`${campo}: informe até ${ENCAIXES_MAXIMOS}.`);
  }
  const encaixes = valor.map((bruto) => {
    const item = objeto(bruto);
    const nome = item["nome"];
    return {
      id: inteiro(item["id"], campo, 1, ID_MAXIMO),
      nome: nome === undefined || nome === null || nome === "" ? null : texto(nome, campo, 1, 160),
    };
  });
  return encaixes.length > 0 ? encaixes : undefined;
}

/**
 * Valida o equipamento de um slot da ficha: o item e, quando vierem, refino, grau, cartas e
 * encantamentos.
 * @param valor Objeto recebido no corpo da requisição
 */
export function lerEquipamento(valor: unknown): EquipamentoFicha {
  const item = objeto(valor);
  const refino = item["refino"];
  const grau = item["grau"];
  if (grau !== undefined && grau !== null && !GRAUS.includes(grau as Grau)) {
    throw new BadRequestException("Grau do equipamento inválido.");
  }
  const cartas = lerEncaixes(item["cartas"], "Cartas");
  const encantamentos = lerEncaixes(item["encantamentos"], "Encantamentos");
  return {
    id: inteiro(item["id"], "ID do equipamento", 1, ID_MAXIMO),
    nome: texto(item["nome"], "Equipamento", 1, 160),
    ...(refino === undefined || refino === null
      ? {}
      : { refino: inteiro(refino, "Refino", 0, REFINO_MAXIMO) }),
    ...(grau === undefined || grau === null ? {} : { grau: grau as Grau }),
    ...(cartas === undefined ? {} : { cartas }),
    ...(encantamentos === undefined ? {} : { encantamentos }),
  };
}

function lerPontos<Chave extends string>(
  valor: unknown,
  chaves: readonly Chave[],
  campo: string,
  min: number,
  max: number,
): Partial<Record<Chave, number>> | undefined {
  if (valor === undefined || valor === null) return undefined;
  const dados = objeto(valor);
  const pontos: Partial<Record<Chave, number>> = {};
  for (const chave of chaves) {
    const ponto = dados[chave];
    if (ponto !== undefined && ponto !== null) pontos[chave] = inteiro(ponto, campo, min, max);
  }
  return Object.keys(pontos).length > 0 ? pontos : undefined;
}

/**
 * Valida os atributos da build guardados na ficha. Nulo ou vazio vira `{}`.
 * @param valor Objeto recebido no corpo da requisição
 */
export function lerAtributos(valor: unknown): AtributosFicha {
  if (valor === undefined || valor === null) return {};
  const dados = objeto(valor);
  const nivelClasse = dados["nivelClasse"];
  const base = lerPontos(dados["base"], ATRIBUTOS, "Atributo", 1, 999);
  const bonusClasse = lerPontos(dados["bonusClasse"], ATRIBUTOS, "Bônus de classe", 0, 999);
  const talentos = lerPontos(dados["talentos"], TALENTOS, "Talento", 0, 999);
  const elemento = dados["elementoAtaque"];
  if (elemento !== undefined && elemento !== null && !ELEMENTOS.includes(elemento as Elemento)) {
    throw new BadRequestException("Propriedade do ataque inválida.");
  }
  let habilidade: AtributosFicha["habilidade"];
  if (dados["habilidade"] !== undefined && dados["habilidade"] !== null) {
    const h = objeto(dados["habilidade"]);
    const nivel = h["nivel"];
    habilidade = {
      nome: texto(h["nome"], "Habilidade", 1, 80),
      ...(nivel === undefined || nivel === null
        ? {}
        : { nivel: inteiro(nivel, "Nível da habilidade", 1, 999) }),
    };
  }
  const classeSimulador = dados["classeSimulador"];
  const token = dados["token"];
  if (
    token !== undefined &&
    token !== null &&
    (typeof token !== "string" || token.length > TOKEN_BUILD_MAXIMO || !TOKEN_BUILD.test(token))
  ) {
    throw new BadRequestException("Link da build inválido.");
  }
  return {
    ...(nivelClasse === undefined || nivelClasse === null
      ? {}
      : { nivelClasse: inteiro(nivelClasse, "Nível de classe", 1, 250) }),
    ...(base === undefined ? {} : { base }),
    ...(bonusClasse === undefined ? {} : { bonusClasse }),
    ...(talentos === undefined ? {} : { talentos }),
    ...(habilidade === undefined ? {} : { habilidade }),
    ...(elemento === undefined || elemento === null ? {} : { elementoAtaque: elemento as Elemento }),
    ...(classeSimulador === undefined || classeSimulador === null
      ? {}
      : { classeSimulador: inteiro(classeSimulador, "Classe do simulador", 1, 99_999) }),
    ...(typeof token === "string" ? { token } : {}),
  };
}
