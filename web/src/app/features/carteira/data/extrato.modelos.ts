// Extrato do jogador (US-06), como a API devolve (GET /api/extrato/...), e a descrição legível
// de cada lançamento.
import type { CategoriaEmprestimo, StatusRun } from "@betel/scoring";
import { ROTULO_CATEGORIA } from "../../../shared/dominio/emprestimo";

/** Lançamento como o extrato devolve (GET /api/extrato/...). */
export interface LancamentoExtrato {
  id: string;
  valor: number;
  tipo:
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
  criadoEm: string;
  observacao: string | null;
  estornaLancamentoId: string | null;
  run: {
    id: string;
    data: string;
    encontro: { nome: string; codigo: string | null };
    versaoInstancia: { instancia: { id: string; nome: string } };
    status: StatusRun | "ESTORNADA";
    corrigeRunId: string | null;
  } | null;
  participacao: {
    personagem: { nome: string };
    jogador: { id: string; apelido: string };
    funcao: { nome: string; classe: { nomeOficial: string; apelidoGrupo: string | null } };
    rank: number;
    pesoCentesimos: number;
    multiplicadorChefeCentesimos: number;
    multiplicadorStatusCentesimos: number;
    fracaoCentesimos: number;
    pontosGerados: number;
  } | null;
  transferencia?: { id: string; remetente: { apelido: string }; destinatario: { apelido: string } } | null;
  /** Épico III: solicitação de Nebula de origem (NEBULA e o estorno dela). */
  solicitacaoNebula?: {
    id: string;
    trazPeca: boolean;
    status: string;
    receita: { nome: string };
  } | null;
  /** Épico II: compra de origem (COMPRA, VENDA e os estornos dela). */
  compra?: {
    id: string;
    quantidade: number;
    precoUnitario: number;
    status: string;
    item: { nome: string };
    comprador: { apelido: string };
  } | null;
  compraLote?: { quantidade: number; valorVendedor: number } | null;
  emprestimo: {
    categoria: CategoriaEmprestimo;
    pctSugeridoBp: number;
    pctInformadoBp: number | null;
    pctEfetivo: string;
    pontos: number;
    itemDescricao: string | null;
    item: { nome: string } | null;
    credor: { id: string; apelido: string };
  } | null;
}

export interface Extrato {
  jogador: { id: string; apelido: string };
  saldo: number;
  lancamentos: LancamentoExtrato[];
}

const fmt = (centesimos: number) => (centesimos / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const pct = (texto: string) => `${Number(texto).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

/** Descrição legível da origem de um lançamento (US-06). */
export function descreverLancamento(l: LancamentoExtrato): string {
  const p = l.participacao;
  const e = l.emprestimo;
  const classe = p === null ? "" : (p.funcao.classe.apelidoGrupo ?? p.funcao.classe.nomeOficial);
  const item = e === null ? "" : (e.item?.nome ?? e.itemDescricao ?? "item");
  switch (l.tipo) {
    case "PARTICIPACAO":
      return p === null
        ? "Participação"
        : `${p.personagem.nome} · ${classe} (${p.funcao.nome}) · rank ${p.rank}, peso ${fmt(p.pesoCentesimos)} × encontro ${fmt(p.multiplicadorChefeCentesimos)} × status ${fmt(p.multiplicadorStatusCentesimos)} × fração ${fmt(p.fracaoCentesimos)}`;
    case "EMPRESTIMO_DEBITO":
      return e === null
        ? "Parcela de empréstimo"
        : `Parcela para ${e.credor.apelido} pelo empréstimo de ${item} (${ROTULO_CATEGORIA[e.categoria]}, ${pct(e.pctEfetivo)})`;
    case "EMPRESTIMO_CREDITO":
      return e === null || p === null
        ? "Crédito de empréstimo"
        : `Empréstimo de ${item} para ${p.jogador.apelido} (${p.personagem.nome}) · ${ROTULO_CATEGORIA[e.categoria]}, ${pct(e.pctEfetivo)} de ${p.pontosGerados}`;
    case "TRANSFERENCIA_ENVIADA":
      return l.transferencia
        ? `Enviada para ${l.transferencia.destinatario.apelido}`
        : "Transferência enviada";
    case "TRANSFERENCIA_RECEBIDA":
      return l.transferencia ? `Recebida de ${l.transferencia.remetente.apelido}` : "Transferência recebida";
    case "COMPRA":
      return l.compra
        ? `Compra na loja: ${l.compra.quantidade}× ${l.compra.item.nome} (${l.compra.precoUnitario} pts cada)`
        : "Compra na loja";
    case "VENDA":
      return l.compra
        ? `Venda consignada: ${l.compraLote?.quantidade ?? ""}× ${l.compra.item.nome} para ${l.compra.comprador.apelido}`
        : "Venda consignada";
    case "NEBULA":
      return l.solicitacaoNebula
        ? `Nebula: ${l.solicitacaoNebula.receita.nome} (${l.solicitacaoNebula.trazPeca ? "trazendo a peça" : "peça do estoque"})`
        : "Nebula";
    case "ESTORNO":
      return `Estorno${l.observacao ? ` · ${l.observacao}` : ""}`;
    default:
      return l.observacao ?? l.tipo;
  }
}

export const ROTULO_TIPO_LANCAMENTO: Record<LancamentoExtrato["tipo"], string> = {
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

/** Só os lançamentos que somam pontos (aba Créditos). */
export function apenasCreditos(extrato: Extrato): Extrato {
  return { ...extrato, lancamentos: extrato.lancamentos.filter((l) => l.valor > 0) };
}

/** Soma dos lançamentos (conferência com o saldo). */
export function somaDosLancamentos(lancamentos: readonly LancamentoExtrato[]): number {
  return lancamentos.reduce((total, l) => total + l.valor, 0);
}
