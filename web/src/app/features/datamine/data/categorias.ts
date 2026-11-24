// Categoria de um item do relatório, para os chips das abas de itens. O report.json não traz o tipo
// do item: a categoria sai da faixa de ID do cliente LATAM, do nome e da marca de traje, como no
// `cat()` do relatório do rolatam-dm.

export type CategoriaItem =
  "carta" | "arma" | "armadura" | "visual" | "encanto" | "sombrio" | "caixa" | "material" | "pet" | "outro";

/** Rótulo de cada categoria, na ordem em que os chips aparecem. */
export const ROTULO_CATEGORIA: readonly (readonly [CategoriaItem, string])[] = [
  ["carta", "Cartas"],
  ["arma", "Armas"],
  ["armadura", "Armaduras"],
  ["visual", "Visuais"],
  ["encanto", "Encantos"],
  ["sombrio", "Sombrios"],
  ["caixa", "Caixas"],
  ["material", "Materiais"],
  ["pet", "Pets"],
  ["outro", "Outros"],
];

const ROTULO_POR_CATEGORIA = new Map<string, string>(ROTULO_CATEGORIA);

/** Rótulo no singular para o selo da linha ("Carta", "Visual"). */
const ROTULO_SINGULAR: Readonly<Record<CategoriaItem, string>> = {
  carta: "Carta",
  arma: "Arma",
  armadura: "Armadura",
  visual: "Visual",
  encanto: "Encanto",
  sombrio: "Sombrio",
  caixa: "Caixa",
  material: "Material",
  pet: "Pet",
  outro: "Outro",
};

export const rotuloDaCategoria = (categoria: CategoriaItem): string => ROTULO_SINGULAR[categoria];
export const rotuloDoChip = (categoria: string): string => ROTULO_POR_CATEGORIA.get(categoria) ?? categoria;

/** O que a categorização precisa saber do item. */
export interface PistasDoItem {
  readonly id: number;
  readonly nome: string;
  /** O patch marca o item como traje (visual). */
  readonly traje: boolean;
}

const entre = (id: number, de: number, ate: number): boolean => id >= de && id < ate;

/**
 * A categoria do item pelas faixas de ID do cliente. A ordem importa: as cartas (27000 a 27999) e
 * os sombrios (24000 a 24999) ficam dentro da faixa larga dos visuais (19000 a 31999), por isso
 * são conferidos antes dela.
 */
export function categoriaDoItem(item: PistasDoItem): CategoriaItem {
  const { id } = item;
  const nome = item.nome.toLowerCase();
  if (
    entre(id, 300000, 301000) ||
    entre(id, 4000, 4700) ||
    entre(id, 27000, 28000) ||
    nome.startsWith("carta ")
  ) {
    return "carta";
  }
  if (entre(id, 500000, 900000)) return "arma";
  if (entre(id, 450000, 500000)) return "armadura";
  if (entre(id, 24000, 25000)) return "sombrio";
  if (item.traje || nome.startsWith("[visual]") || entre(id, 400000, 450000) || entre(id, 19000, 32000)) {
    return "visual";
  }
  if (entre(id, 311000, 313000)) return "encanto";
  if (entre(id, 9000, 10000)) return "pet";
  if (entre(id, 100000, 110000)) return "caixa";
  if (id >= 1000000) return "material";
  return "outro";
}
