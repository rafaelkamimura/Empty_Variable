// Busca, filtros por chip e paginação das listas do relatório. Funções puras, sem Angular.

/** Minúsculas e sem acento, para a busca não depender de "poção" x "pocao". */
export function normalizarBusca(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Um grupo de chips da lista: como achar o valor de cada linha e o rótulo de cada valor. */
export interface FiltroLista<T> {
  /** Identificador do grupo (kebab-case), usado como chave e no `data-testid`. */
  readonly chave: string;
  /** Nome do grupo para leitores de tela (ex.: "Filtrar por categoria"). */
  readonly rotulo: string;
  /** Rótulo do chip que mostra tudo. */
  readonly rotuloTodos: string;
  /** O valor da linha neste filtro (ex.: a categoria do item). */
  readonly valorDe: (item: T) => string;
  /** Valores na ordem em que os chips aparecem, com o rótulo de cada um. Os sem linha ficam de fora. */
  readonly opcoes: readonly (readonly [valor: string, rotulo: string])[];
}

/** Valor do chip "todos". */
export const TODOS = "";

export interface OpcaoContada {
  readonly valor: string;
  readonly rotulo: string;
  readonly contagem: number;
}

/**
 * Os chips de um filtro: "todos" com o total e, depois, só os valores que têm linha. Valores que
 * o filtro não conhece entram no fim, com o próprio valor como rótulo.
 */
export function opcoesDoFiltro<T>(itens: readonly T[], filtro: FiltroLista<T>): OpcaoContada[] {
  const contagens = new Map<string, number>();
  for (const item of itens) {
    const valor = filtro.valorDe(item);
    contagens.set(valor, (contagens.get(valor) ?? 0) + 1);
  }
  const saida: OpcaoContada[] = [{ valor: TODOS, rotulo: filtro.rotuloTodos, contagem: itens.length }];
  for (const [valor, rotulo] of filtro.opcoes) {
    const contagem = contagens.get(valor) ?? 0;
    if (contagem > 0) saida.push({ valor, rotulo, contagem });
    contagens.delete(valor);
  }
  for (const [valor, contagem] of contagens) {
    if (valor !== TODOS) saida.push({ valor, rotulo: valor, contagem });
  }
  return saida;
}

export interface CriterioLista<T> {
  /** Texto digitado na busca (qualquer caixa, com ou sem acento). */
  readonly termo: string;
  /** Texto já normalizado em que a busca procura (ver `normalizarBusca`). */
  readonly textoDe: (item: T) => string;
  readonly filtros: readonly FiltroLista<T>[];
  /** Valor escolhido em cada filtro, pela chave. Ausente ou `TODOS` não filtra. */
  readonly escolhas: Readonly<Record<string, string>>;
}

/** As linhas que têm todas as palavras da busca e batem com os chips escolhidos. */
export function filtrarLista<T>(itens: readonly T[], criterio: CriterioLista<T>): T[] {
  const palavras = normalizarBusca(criterio.termo)
    .split(/\s+/)
    .filter((p) => p !== "");
  const ativos = criterio.filtros
    .map((f) => ({ filtro: f, valor: criterio.escolhas[f.chave] ?? TODOS }))
    .filter((a) => a.valor !== TODOS);
  if (palavras.length === 0 && ativos.length === 0) return [...itens];
  return itens.filter((item) => {
    if (!ativos.every((a) => a.filtro.valorDe(item) === a.valor)) return false;
    if (palavras.length === 0) return true;
    const texto = criterio.textoDe(item);
    return palavras.every((p) => texto.includes(p));
  });
}

/** Quantas linhas a lista mostra de início e a cada "Mostrar mais". */
export const TAMANHO_DA_PAGINA = 60;

/** Frase da contagem anunciada depois de filtrar ("12 de 230 resultados.", "Nenhum resultado…"). */
export function fraseDaContagem(mostradas: number, encontradas: number, total: number): string {
  if (encontradas === 0) {
    return total === 0 ? "Nada nesta lista." : "Nenhum resultado para a busca e os filtros.";
  }
  const nome = (n: number): string => (n === 1 ? "resultado" : "resultados");
  if (encontradas === total) {
    return mostradas < total
      ? `Mostrando ${mostradas} de ${total} ${nome(total)}.`
      : `${total} ${nome(total)}.`;
  }
  return mostradas < encontradas
    ? `Mostrando ${mostradas} de ${encontradas} ${nome(encontradas)} encontrados (${total} no total).`
    : `${encontradas} de ${total} ${nome(total)}.`;
}
