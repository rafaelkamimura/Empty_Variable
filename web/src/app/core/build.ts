// D57: leitura da build guardada na ficha (refino, grau, cartas, encantamentos e atributos).
import type { AtributosBuild, EncaixeEquipamento, EquipamentoFicha } from "./modelos";

const ROTULOS_ATRIBUTO = [
  ["str", "FOR"],
  ["agi", "AGI"],
  ["vit", "VIT"],
  ["int", "INT"],
  ["dex", "DES"],
  ["luk", "SOR"],
] as const;

const ROTULOS_TALENTO = [
  ["pow", "POD"],
  ["sta", "STA"],
  ["wis", "SAB"],
  ["spl", "FEI"],
  ["con", "CON"],
  ["crt", "CRV"],
] as const;

const nomes = (encaixes: EncaixeEquipamento[]): string =>
  encaixes.map((encaixe) => encaixe.nome ?? `Item ${encaixe.id}`).join(", ");

/**
 * Refino e grau do equipamento num texto curto, como "+12 · Grau A". Vazio se não houver nenhum.
 * @param item Equipamento do slot (fichas antigas guardam só o nome)
 */
export function refinoEGrau(item: EquipamentoFicha | undefined): string {
  if (typeof item !== "object") return "";
  return [...(item.refino ? [`+${item.refino}`] : []), ...(item.grau ? [`Grau ${item.grau}`] : [])].join(
    " · ",
  );
}

/**
 * Linhas que descrevem o que a build guarda de um equipamento além do item: refino e grau, cartas
 * e encantamentos. Sem nada disso (ou em ficha antiga), devolve uma lista vazia.
 * @param item Equipamento do slot
 */
export function detalhesDoEquipamento(item: EquipamentoFicha | undefined): string[] {
  if (typeof item !== "object") return [];
  const refino = refinoEGrau(item);
  return [
    ...(refino ? [refino] : []),
    ...(item.cartas?.length ? [`Cartas: ${nomes(item.cartas)}`] : []),
    ...(item.encantamentos?.length ? [`Encantamentos: ${nomes(item.encantamentos)}`] : []),
  ];
}

/**
 * Total de um atributo na build: pontos distribuídos mais o bônus de classe. Não inclui o que vem
 * dos equipamentos, que a ficha não calcula.
 * @param atributos Atributos guardados na ficha
 * @param chave Atributo
 */
export function atributoDaBuild(
  atributos: AtributosBuild | undefined,
  chave: "str" | "agi" | "vit" | "int" | "dex" | "luk",
): number {
  return (atributos?.base?.[chave] ?? 0) + (atributos?.bonusClasse?.[chave] ?? 0);
}

/**
 * Resumo dos atributos da build em poucas linhas, para a ficha. Vazio se a ficha não tem atributos.
 * @param atributos Atributos guardados na ficha
 */
export function resumoDosAtributos(atributos: AtributosBuild | undefined): string[] {
  if (!atributos) return [];
  const base = ROTULOS_ATRIBUTO.filter(([chave]) => atributos.base?.[chave] !== undefined).map(
    ([chave, rotulo]) => {
      const bonus = atributos.bonusClasse?.[chave];
      return `${rotulo} ${atributos.base?.[chave]}${bonus ? `+${bonus}` : ""}`;
    },
  );
  const talentos = ROTULOS_TALENTO.filter(([chave]) => atributos.talentos?.[chave]).map(
    ([chave, rotulo]) => `${rotulo} ${atributos.talentos?.[chave]}`,
  );
  const habilidade = atributos.habilidade
    ? `${atributos.habilidade.nome}${atributos.habilidade.nivel ? ` nv. ${atributos.habilidade.nivel}` : ""}`
    : "";
  return [
    [...(atributos.nivelClasse ? [`Nível de classe ${atributos.nivelClasse}`] : []), ...base].join(" · "),
    talentos.join(" · "),
    habilidade ? `Habilidade: ${habilidade}` : "",
  ].filter((linha) => linha !== "");
}
