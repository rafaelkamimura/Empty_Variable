// Nebula (Épico III, M11): o que a API /api/nebula devolve e as regras puras das telas do membro
// e da fila de entregas. As regras do cadastro de receitas (admin) ficam em receitas.modelos.ts.

export interface FaltaItem {
  itemId: string;
  item: string;
  tenho: number;
  preciso: number;
  falta: number;
}

export interface Receita {
  id: string;
  nome: string;
  itemProduzido: { id: string; nome: string; idJogo?: number | null };
  solicitavel: boolean;
  ativa: boolean;
  fonte: string | null;
  limitePorMembro: number | null;
  limitePeriodoDias: number | null;
  componentes: {
    id: string;
    item: { id: string; nome: string; idJogo?: number | null };
    quantidade: number;
    pecaBase: boolean;
  }[];
  receitaPeca: { id: string; nome: string } | null;
  precoVigente: { versao: number; precoComPeca: number; precoTrazendoPeca: number } | null;
  solicitacoesPendentes: number;
  disponibilidade: {
    trazendoPeca: number;
    comPecaDoEstoque: number;
    faltasTrazendo: FaltaItem[];
    faltasComPeca: FaltaItem[];
  };
}

// ---- Solicitação de Nebula (M11) ----

export type StatusSolicitacaoNebula = "PENDENTE" | "ENTREGUE" | "CANCELADA" | "REJEITADA";

export const ROTULO_STATUS_NEBULA: Record<StatusSolicitacaoNebula, string> = {
  PENDENTE: "Aguardando entrega",
  ENTREGUE: "Entregue",
  CANCELADA: "Cancelada",
  REJEITADA: "Rejeitada",
};

export interface ReceitaAberta extends Receita {
  /** Quanto ainda cabe no limite do período (nulo = sem limite). */
  limiteRestante: number | null;
}

export interface VitrineNebula {
  saldo: number;
  receitas: ReceitaAberta[];
}

export interface SolicitacaoNebula {
  id: string;
  trazPeca: boolean;
  pecaDoEstoque: "PRONTA" | "MATERIAIS" | null;
  preco: number;
  status: StatusSolicitacaoNebula;
  motivo: string | null;
  criadaEm: string;
  entregueEm: string | null;
  encerradaEm: string | null;
  receita: { id: string; nome: string };
  precoReceita: { versao: number };
  jogador: { id: string; apelido: string };
  entreguePor: { discordUsername: string } | null;
  encerradaPor: { discordUsername: string } | null;
  materiais: { itemId: string; item: string; quantidade: number }[];
  lotes: { item: string; lote: number; quantidade: number }[];
}

export function temPeca(r: Receita): boolean {
  return r.componentes.some((c) => c.pecaBase);
}

export function precoDe(r: Receita, trazPeca: boolean): number {
  const p = r.precoVigente;
  if (p === null) return 0;
  return trazPeca || !temPeca(r) ? p.precoTrazendoPeca : p.precoComPeca;
}

export function disponivelDe(r: Receita, trazPeca: boolean): number {
  return trazPeca || !temPeca(r) ? r.disponibilidade.trazendoPeca : r.disponibilidade.comPecaDoEstoque;
}

export function faltasDe(r: Receita, trazPeca: boolean): FaltaItem[] {
  return trazPeca || !temPeca(r) ? r.disponibilidade.faltasTrazendo : r.disponibilidade.faltasComPeca;
}

/** Briefing §7: o botão Solicitar só habilita quando tudo está disponível. Devolve o motivo do bloqueio. */
export function bloqueioSolicitar(r: ReceitaAberta, trazPeca: boolean, saldo: number): string | null {
  if (disponivelDe(r, trazPeca) < 1) return "Falta material no estoque do grupo.";
  if (r.limiteRestante === 0) return "Você atingiu o limite desta Nebula no período.";
  if (saldo < precoDe(r, trazPeca)) return "Saldo insuficiente.";
  return null;
}

/** Quando a peça Astral existe, abre na modalidade que dá para fazer agora (a do estoque, se houver). */
export function trazPecaInicial(r: Receita): boolean {
  return temPeca(r) && r.disponibilidade.comPecaDoEstoque === 0 && r.disponibilidade.trazendoPeca > 0;
}

export function nomeDaPeca(r: Receita): string {
  return r.componentes.find((c) => c.pecaBase)?.item.nome ?? "peça";
}

/** Quanto do material o grupo tem, de 0 a 100 (para a barra). */
export function percentual(tenho: number, preciso: number): number {
  return preciso === 0 ? 100 : Math.min(100, Math.round((tenho / preciso) * 100));
}

export type TomNebula = "acento" | "alerta" | "sucesso" | "neutro";

/** Selo do cartão na vitrine: o que o membro pode fazer agora. */
export function seloDaNebulosa(r: ReceitaAberta): { texto: string; tom: TomNebula } {
  if (r.limiteRestante === 0) return { texto: "Limite atingido", tom: "alerta" };
  if (disponivelDe(r, true) > 0 || disponivelDe(r, false) > 0)
    return { texto: "Pode solicitar", tom: "acento" };
  return { texto: "Faltam materiais", tom: "alerta" };
}

export function tomDoStatus(s: StatusSolicitacaoNebula): TomNebula {
  if (s === "ENTREGUE") return "sucesso";
  return s === "PENDENTE" ? "alerta" : "neutro";
}

/** Como a peça entra na solicitação: trazida pelo membro, pronta do estoque ou pelos materiais dela. */
export function rotuloDaPeca(s: SolicitacaoNebula): string {
  if (s.trazPeca) return "traz a peça";
  return s.pecaDoEstoque === "PRONTA" ? "peça pronta do estoque" : "materiais da peça do estoque";
}

export type FiltroFila = StatusSolicitacaoNebula | "TODAS";

export const FILTROS_FILA: readonly { valor: FiltroFila; rotulo: string }[] = [
  { valor: "PENDENTE", rotulo: "Pendentes" },
  { valor: "ENTREGUE", rotulo: "Entregues" },
  { valor: "REJEITADA", rotulo: "Rejeitadas" },
  { valor: "CANCELADA", rotulo: "Canceladas" },
  { valor: "TODAS", rotulo: "Todas" },
];

/** Motivo da rejeição: de 3 a 300 caracteres, como a API exige. Devolve o erro, ou null. */
export function erroDoMotivo(motivo: string): string | null {
  const t = motivo.trim();
  if (t.length < 3) return "Escreva o motivo, com pelo menos 3 letras.";
  if (t.length > 300) return "O motivo cabe em até 300 caracteres.";
  return null;
}
