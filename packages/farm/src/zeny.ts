/** O jogo não guarda mais que isso de zeny num personagem; serve de teto para o preço unitário. */
export const ZENY_MAXIMO = 2_147_483_647;

const SUFIXOS: Record<string, number> = { k: 1e3, kk: 1e6, m: 1e6, kkk: 1e9, b: 1e9 };

/**
 * Lê um preço em zeny como a comunidade escreve: "1500000", "1.500.000", "1,5kk", "300k", "2m".
 * Vazio é null (sem preço). Texto que não é preço, negativo ou acima do teto é undefined.
 */
export function lerZeny(texto: string): number | null | undefined {
  const limpo = texto
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/(zeny|z)$/, "");
  if (limpo === "") return null;
  const m = /^([\d.,]+)(kkk|kk|k|m|b)?$/.exec(limpo);
  if (m === null) return undefined;
  const [, numero = "", sufixo] = m;
  let valor: number;
  if (sufixo !== undefined) {
    if ((numero.match(/[.,]/g) ?? []).length > 1) return undefined;
    valor = Number(numero.replace(",", ".")) * (SUFIXOS[sufixo] ?? 1);
  } else {
    valor = Number(numero.replace(/\./g, "").replace(",", "."));
  }
  if (!Number.isFinite(valor)) return undefined;
  const inteiro = Math.round(valor);
  return inteiro >= 0 && inteiro <= ZENY_MAXIMO ? inteiro : undefined;
}

/** "1.500.000" */
export function formatarZenyCompleto(valor: number): string {
  return Math.round(valor).toLocaleString("pt-BR");
}

/** "1,5kk", "300k", "950". */
export function formatarZeny(valor: number): string {
  const a = Math.abs(valor);
  const fmt = (n: number, casas: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: casas });
  if (a >= 1e9) return `${fmt(valor / 1e9, 2)}kkk`;
  if (a >= 1e6) return `${fmt(valor / 1e6, 2)}kk`;
  if (a >= 1e3) return `${fmt(valor / 1e3, 1)}k`;
  return formatarZenyCompleto(valor);
}
