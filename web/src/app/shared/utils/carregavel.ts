// Estado de carregamento padronizado (docs/frontend/diretrizes.md §4.5), renderizado por <ui-estado>.

export type Carregavel<T> =
  | { readonly estado: "carregando" }
  | { readonly estado: "erro"; readonly mensagem: string }
  | { readonly estado: "pronto"; readonly dados: T };

export const carregando = <T>(): Carregavel<T> => ({ estado: "carregando" });
export const comErro = <T>(mensagem: string): Carregavel<T> => ({ estado: "erro", mensagem });
export const pronto = <T>(dados: T): Carregavel<T> => ({ estado: "pronto", dados });

/** Vazio padrão: lista sem itens, null ou undefined. */
export function vazioPadrao(dados: unknown): boolean {
  return dados == null || (Array.isArray(dados) && dados.length === 0);
}
