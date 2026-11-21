// Cadastro de receitas da Nebula (admin, T-42): regras puras do editor e do selo.
import type { Receita } from "./nebula.modelos";

export interface ComponenteEditavel {
  itemId: string;
  quantidade: number;
  pecaBase: boolean;
}

/** Situação para o selo do cartão. */
export function situacaoReceita(r: Receita): { texto: string; tipo: "ativa" | "validar" | "sem-preco" } {
  if (r.ativa) return { texto: "Ativa", tipo: "ativa" };
  if (r.precoVigente === null && r.solicitavel) return { texto: "A validar · sem preço", tipo: "sem-preco" };
  return { texto: "A validar", tipo: "validar" };
}

/** Pendências do editor de componentes, antes de enviar (a API valida de novo). */
export function pendenciasComponentes(c: ComponenteEditavel[]): string[] {
  const p: string[] = [];
  if (c.length === 0) p.push("Informe ao menos um componente.");
  if (c.some((x) => x.itemId === "")) p.push("Escolha o item de cada linha.");
  if (c.some((x) => !Number.isInteger(x.quantidade) || x.quantidade < 1))
    p.push("Quantidades inteiras maiores que zero.");
  const ids = c.map((x) => x.itemId).filter((x) => x !== "");
  if (new Set(ids).size !== ids.length) p.push("Um item não pode se repetir.");
  if (c.filter((x) => x.pecaBase).length > 1) p.push("Só uma peça-base por receita.");
  return p;
}
