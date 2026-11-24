// O que a linha de um item mostra além da descrição: os campos simples que mudaram e quando vale
// mostrar o texto do item não identificado.
import type { ItemAlterado, ItemPatch } from "./relatorio.modelos";

export interface MudancaDeCampo {
  readonly rotulo: string;
  readonly antes: string;
  readonly depois: string;
}

const VAZIO = "(vazio)";
const ouVazio = (v: string): string => (v === "" ? VAZIO : v);
const simOuNao = (v: boolean): string => (v ? "sim" : "não");
const ouTraco = (v: number | null): string => (v === null ? "nenhum" : String(v));

/**
 * Os campos de uma linha que mudaram entre as duas versões do item, fora as descrições (que têm a
 * comparação linha a linha): nome, nome não identificado, sprite, slots, visual, efeito e traje.
 */
export function mudancasDeCampo(item: ItemAlterado): MudancaDeCampo[] {
  const { antes: a, depois: d } = item;
  const candidatos: MudancaDeCampo[] = [
    { rotulo: "Nome", antes: ouVazio(a.nome), depois: ouVazio(d.nome) },
    {
      rotulo: "Nome não identificado",
      antes: ouVazio(a.nomeNaoIdentificado),
      depois: ouVazio(d.nomeNaoIdentificado),
    },
    { rotulo: "Sprite", antes: ouVazio(a.recurso), depois: ouVazio(d.recurso) },
    { rotulo: "Slots", antes: String(a.slots), depois: String(d.slots) },
    { rotulo: "Visual (ClassNum)", antes: String(a.visual), depois: String(d.visual) },
    { rotulo: "Efeito (EffectID)", antes: ouTraco(a.efeito), depois: ouTraco(d.efeito) },
    { rotulo: "Traje", antes: simOuNao(a.traje), depois: simOuNao(d.traje) },
  ];
  return candidatos.filter((c) => c.antes !== c.depois);
}

/** Nomes genéricos de item não identificado: o texto deles não diz nada sobre o item. */
const NOME_GENERICO = /^Equipamento Visual|^Visual$|^Acessório$|^$/;

/**
 * Vale mostrar o texto de "não identificado": ele existe, é diferente da descrição e o nome não
 * identificado não é um dos genéricos.
 */
export function mostraNaoIdentificado(item: ItemPatch): boolean {
  return (
    item.descricaoNaoIdentificada.length > 0 &&
    item.descricaoNaoIdentificada.join("\n") !== item.descricao.join("\n") &&
    !NOME_GENERICO.test(item.nomeNaoIdentificado)
  );
}

const mesmasLinhas = (a: readonly string[], b: readonly string[]): boolean => a.join("\n") === b.join("\n");

export const descricaoMudou = (item: ItemAlterado): boolean =>
  !mesmasLinhas(item.antes.descricao, item.depois.descricao);

export const descricaoNaoIdentificadaMudou = (item: ItemAlterado): boolean =>
  !mesmasLinhas(item.antes.descricaoNaoIdentificada, item.depois.descricaoNaoIdentificada);

/** Endereço da base de itens da Divine Pride, a mesma fonte dos ícones e dos nomes do sistema. */
const DIVINE_PRIDE_ITEM = "https://www.divine-pride.net/database/item";

/** A página do item na Divine Pride, ou null quando o ID não é um inteiro positivo. */
export function urlDoItemNaDivinePride(id: number): string | null {
  return Number.isInteger(id) && id > 0 ? `${DIVINE_PRIDE_ITEM}/${id}` : null;
}
