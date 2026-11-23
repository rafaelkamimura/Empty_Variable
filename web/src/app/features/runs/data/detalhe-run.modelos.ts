// Run registrada, como a API devolve, e o rascunho de correção que sai dela (US-07).
import type { CategoriaEmprestimo, StatusRun } from "@betel/scoring";
import type { TipoLancamento } from "../../../shared/dominio/lancamento";
import type { RascunhoRun } from "./runs.modelos";

export type { ResultadoDropsRun } from "../../../core/estoque";

/** Run na lista, como GET /api/runs devolve (T-21). */
export interface RunResumo {
  id: string;
  data: string;
  encontro: { nome: string; codigo: string | null };
  versaoInstancia: { versao: number; instancia: { id: string; nome: string } };
  status: StatusRun | "ESTORNADA";
  corrigeRunId: string | null;
  config: { versao: number };
  participantes: number;
  pontosTotais: number;
}

/** Detalhe da run como GET /api/runs/:id devolve (só os campos usados no frontend). */
export interface DetalheRun {
  id: string;
  data: string;
  encontro: { id: string; nome: string; codigo: string | null; multiplicadorCentesimos: number };
  versaoInstancia: { id: string; versao: number; instancia: { id: string; nome: string } };
  status: StatusRun | "ESTORNADA";
  pontuacaoBetelgeuse: number | null;
  observacao: string | null;
  criadaEm: string;
  corrigeRunId: string | null;
  corrigidaPorRunId: string | null;
  config: { id: string; versao: number };
  registradaPor: { id: string; discordUsername: string };
  participacoes: {
    id: string;
    personagem: { id: string; nome: string };
    jogador: { id: string; apelido: string };
    funcao: {
      id: string;
      nome: string;
      classe: { id: string; nomeOficial: string; apelidoGrupo: string | null };
    };
    fracaoCentesimos: 100 | 50 | 0;
    rank: number;
    pesoCentesimos: number;
    multiplicadorChefeCentesimos: number;
    multiplicadorStatusCentesimos: number;
    pontosGerados: number;
    emprestimos: {
      id: string;
      credor: { id: string; apelido: string };
      item: { id: string; nome: string } | null;
      itemDescricao: string | null;
      categoria: CategoriaEmprestimo;
      pctSugeridoBp: number;
      pctInformadoBp: number | null;
      pctEfetivo: string;
      pontos: number;
    }[];
  }[];
  drops: {
    id: string;
    quantidade: number;
    item: { id: string; nome: string; idJogo?: number | null };
    lancadoNoEstoque: boolean;
  }[];
  lancamentos: {
    id: string;
    valor: number;
    tipo: TipoLancamento;
    jogador: { id: string; apelido: string };
    estornaLancamentoId: string | null;
  }[];
}

/** Rascunho pré-preenchido para a correção (US-07): a run como foi registrada. */
export function rascunhoDeRun(d: DetalheRun): RascunhoRun {
  return {
    data: d.data.slice(0, 10),
    instanciaId: d.versaoInstancia.instancia.id,
    encontroId: d.encontro.id,
    status: d.status === "ESTORNADA" ? "CONCLUIDA" : d.status,
    pontuacaoBetelgeuse: d.pontuacaoBetelgeuse,
    observacao: d.observacao ?? "",
    participantes: d.participacoes.map((p) => ({
      personagemId: p.personagem.id,
      classeId: p.funcao.classe.id,
      funcaoId: p.funcao.id,
      fracaoCentesimos: p.fracaoCentesimos,
      emprestimos: p.emprestimos.map((e) => ({
        credorJogadorId: e.credor.id,
        itemId: e.item?.id ?? null,
        itemDescricao: e.itemDescricao ?? "",
        categoria: e.categoria,
        percentualInformado: e.pctInformadoBp === null ? null : e.pctInformadoBp / 100,
      })),
    })),
    drops: d.drops.map((x) => ({ itemId: x.item.id, quantidade: x.quantidade })),
  };
}
