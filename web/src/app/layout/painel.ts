// Painéis da aplicação (docs/planejamento/paineis.md §4): o painel ativo vem do começo da URL.

export type Painel = "cliente" | "gestao" | "admin";

export function painelDaUrl(url: string): Painel {
  if (url === "/gestao" || url.startsWith("/gestao/") || url.startsWith("/gestao?")) return "gestao";
  if (url === "/admin" || url.startsWith("/admin/") || url.startsWith("/admin?")) return "admin";
  return "cliente";
}
