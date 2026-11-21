// Rótulos das categorias de empréstimo (@betel/scoring), usados por runs e pelo extrato.
import type { CategoriaEmprestimo } from "@betel/scoring";

export const ROTULO_CATEGORIA: Record<CategoriaEmprestimo, string> = {
  ESSENCIAL: "Essencial",
  IMPORTANTE: "Importante",
  COMPLEMENTAR: "Complementar",
};
