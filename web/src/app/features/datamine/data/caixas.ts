// Tabela de conteúdo de uma caixa (ou ovo), como o cliente publica em probabilityinfo/packageitem.lub:
// a ordem das linhas, o que mudou em relação ao patch anterior e o resumo do sorteio.
import type { LinhaCaixa } from "./relatorio.modelos";

export type MudancaLinhaCaixa = "igual" | "nova" | "removida" | "alterada";

export interface LinhaCaixaComparada extends LinhaCaixa {
  readonly mudanca: MudancaLinhaCaixa;
  /** Chance antes do patch, só nas linhas alteradas. */
  readonly pctAntes: number | null;
}

export interface ResumoCaixa {
  /** Linhas que entram no sorteio (peso maior que zero), sem contar as removidas. */
  readonly sorteaveis: number;
  readonly somaDosPesos: number;
  /** Linhas que vêm sempre (peso zero). */
  readonly garantidos: number;
}

const chave = (l: LinhaCaixa): string => `${l.grupo}:${l.id}`;

/** Sorteáveis do maior peso para o menor, depois os garantidos; dentro do mesmo peso, a ordem do cliente. */
function ordenar<T extends LinhaCaixa>(linhas: readonly T[]): T[] {
  return [...linhas].sort((a, b) => Number(a.garantido) - Number(b.garantido) || b.peso - a.peso);
}

/**
 * As linhas da caixa na ordem da tabela e marcadas contra o conteúdo anterior: novas, com o peso
 * ou a chance alterados, iguais e, no fim, as que saíram. Sem conteúdo anterior, tudo é "igual".
 */
export function compararLinhasCaixa(
  antes: readonly LinhaCaixa[] | null,
  depois: readonly LinhaCaixa[],
): LinhaCaixaComparada[] {
  if (antes === null) return ordenar(depois).map((l) => ({ ...l, mudanca: "igual", pctAntes: null }));
  const anteriores = new Map(antes.map((l) => [chave(l), l]));
  const atuais = new Set(depois.map(chave));
  const mantidas = ordenar(depois).map((l): LinhaCaixaComparada => {
    const anterior = anteriores.get(chave(l));
    if (anterior === undefined) return { ...l, mudanca: "nova", pctAntes: null };
    const mudou = anterior.pct !== l.pct || anterior.peso !== l.peso;
    return { ...l, mudanca: mudou ? "alterada" : "igual", pctAntes: mudou ? anterior.pct : null };
  });
  const removidas = ordenar(antes.filter((l) => !atuais.has(chave(l)))).map((l): LinhaCaixaComparada => ({
    ...l,
    mudanca: "removida",
    pctAntes: null,
  }));
  return [...mantidas, ...removidas];
}

/** Quantas linhas a caixa sorteia, a soma dos pesos e quantas vêm sempre (sem as removidas). */
export function resumoDaCaixa(linhas: readonly LinhaCaixa[]): ResumoCaixa {
  const sorteaveis = linhas.filter((l) => !l.garantido);
  return {
    sorteaveis: sorteaveis.length,
    somaDosPesos: sorteaveis.reduce((s, l) => s + l.peso, 0),
    garantidos: linhas.length - sorteaveis.length,
  };
}

/** Chance em pt-BR como no relatório: duas casas a partir de 1%, três abaixo disso ("12,50%", "0,030%"). */
export function formatarChance(pct: number): string {
  const casas = pct >= 1 ? 2 : 3;
  return `${pct.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}
