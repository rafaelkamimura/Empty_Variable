// Tipos de lançamento do ledger e os seus rótulos, usados pelo extrato (carteira) e pelo detalhe da run.

export type TipoLancamento =
  | "PARTICIPACAO"
  | "EMPRESTIMO_DEBITO"
  | "EMPRESTIMO_CREDITO"
  | "ESTORNO"
  | "AJUSTE_ADMIN"
  | "COMPRA"
  | "VENDA"
  | "NEBULA"
  | "TRANSFERENCIA_ENVIADA"
  | "TRANSFERENCIA_RECEBIDA";

export const ROTULO_TIPO_LANCAMENTO: Record<TipoLancamento, string> = {
  PARTICIPACAO: "Participação",
  EMPRESTIMO_DEBITO: "Parcela de empréstimo",
  EMPRESTIMO_CREDITO: "Empréstimo concedido",
  ESTORNO: "Estorno",
  AJUSTE_ADMIN: "Ajuste",
  COMPRA: "Compra na loja",
  VENDA: "Venda na loja",
  NEBULA: "Nebula",
  TRANSFERENCIA_ENVIADA: "Transferência enviada",
  TRANSFERENCIA_RECEBIDA: "Transferência recebida",
};
