// Filtros da lista de runs na URL (?dataDe=&dataAte=&instanciaId=&status=), para voltar do detalhe
// com os mesmos filtros. Puro.
import type { FiltroRuns } from "./runs.api";

export type FiltroLista = Required<FiltroRuns>;

export const CAMPOS_FILTRO = ["dataDe", "dataAte", "instanciaId", "status"] as const;

/** Query params do filtro: os vazios saem da URL (null). */
export function paramsDoFiltro(f: FiltroLista): Record<keyof FiltroLista, string | null> {
  return {
    dataDe: f.dataDe || null,
    dataAte: f.dataAte || null,
    instanciaId: f.instanciaId || null,
    status: f.status || null,
  };
}

export function mesmoFiltro(a: FiltroLista, b: FiltroLista): boolean {
  return CAMPOS_FILTRO.every((c) => a[c] === b[c]);
}

/** Endereço da lista guardado no estado da navegação para o detalhe; sem ele, a lista sem filtros. */
export function enderecoDaLista(estado: unknown): string {
  const lista = (estado as { lista?: unknown } | null)?.lista;
  return typeof lista === "string" && lista.startsWith("/gestao/runs") ? lista : "/gestao/runs";
}
