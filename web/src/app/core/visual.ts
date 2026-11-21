// Identidade visual dos cartões: ícone e tom de cada item ou classe.
import type { NomeIcone } from "./icone.component";

/**
 * Tons de identidade da paleta Empty Variable (orquídea, violeta, lavanda, azul, menta e névoa).
 * São referências a tokens de styles/_tokens.scss (lá estão os valores e os contrastes, todos
 * ≥ 4,5:1 sobre o fundo da arte do cartão); use o resultado em [style.color].
 */
export const TONS = [
  "var(--tom-orquidea)",
  "var(--tom-lavanda)",
  "var(--tom-menta)",
  "var(--tom-violeta)",
  "var(--tom-nevoa)",
  "var(--tom-azul)",
] as const;

/** Tom estável por nome: o mesmo item ou classe tem sempre a mesma cor. */
export function tomDe(nome: string): string {
  let h = 0;
  for (const ch of nome) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONS[h % TONS.length]!;
}

/** Ícone do item pelo tipo e pelo nome (a loja não tem imagens do jogo). */
export function iconeDoItem(nome: string, tipo: string | null): NomeIcone {
  const n = nome.toLowerCase();
  if (tipo === "CARTA" || n.startsWith("carta")) return "carta";
  if (tipo === "VISUAL") return "brilho";
  if (n.startsWith("alma")) return "chama";
  if (n.startsWith("fragmento")) return "cristal";
  if (n.startsWith("pó")) return "po";
  if (/^(armadura|túnica|veste)/.test(n)) return "armadura";
  return tipo === "MATERIAL" ? "diamante" : "caixa";
}

/** Iniciais para o emblema da classe: "Demais classes" → "DC", "MTK" → "MTK", "Magus" → "MA". */
export function siglaDaClasse(apelido: string): string {
  const s = apelido.trim();
  if (/^[A-Z]{2,3}$/.test(s)) return s;
  const palavras = s.split(/\s+/).filter((p) => p.length > 0);
  if (palavras.length > 1)
    return palavras
      .map((p) => p[0]!.toUpperCase())
      .join("")
      .slice(0, 3);
  return s.slice(0, 2).toUpperCase();
}
