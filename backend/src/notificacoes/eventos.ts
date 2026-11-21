/**
 * Contrato das notificações por DM entregues pelo bot nag4eyes (fonte única dos eventos).
 *
 * Cada notificação vai para uma pessoa (o Discord ID do destinatário) e leva só dados estruturados:
 * IDs, números, nomes de itens, receitas e instâncias, e o motivo digitado pelo admin quando houver.
 * Nunca leva o texto da mensagem: o nag4eyes monta a DM no idioma dele (en_US ou pt_BR).
 *
 * Regras comuns:
 * - Ninguém é avisado da própria ação (o membro que cancela a própria compra não recebe DM).
 * - Só recebe quem tem usuário ativo com vínculo; jogador sem usuário não gera notificação.
 * - Pontos são inteiros. Datas de run vêm como "AAAA-MM-DD"; os demais instantes, em ISO 8601 UTC.
 * - Tipo novo é aditivo: o nag4eyes deve confirmar como FALHOU (motivo "tipo desconhecido") o que não conhecer.
 *
 * Protocolo de entrega (lote, confirmação, retenção): docs/integracao-notificacoes.md.
 */

/** Run em que o jogador pontuou, como aparece nas DMs. */
export interface ResumoRun {
  runId: string;
  /** Dia da run ("AAAA-MM-DD"). */
  data: string;
  instancia: string;
  /** Chefe ou modo da instância (ex.: "Betelgeuse 75"). */
  encontro: string;
  status: "CONCLUIDA" | "FALHA_CHEFE" | "ABORTADA";
}

/** Pontos de uma run registrada, já somados por jogador (participação, empréstimos pagos e recebidos). */
export interface DadosRunPontos extends ResumoRun {
  /** Saldo líquido da run para o jogador: participacao − emprestimosPagos + emprestimosRecebidos. */
  pontos: number;
  /** Pontos gerados pela participação dos personagens do jogador. */
  participacao: number;
  /** Parte da participação repassada a credores de itens emprestados (≥ 0). */
  emprestimosPagos: number;
  /** Recebido como credor de itens emprestados a outros participantes (≥ 0). */
  emprestimosRecebidos: number;
}

/**
 * Correção de uma run (US-07): a original é estornada e outra é registrada no lugar.
 * Só é avisado quem teve o saldo líquido alterado; quem saiu da run fica com pontosDepois = 0.
 */
export interface DadosRunCorrigida extends ResumoRun {
  /** Run estornada. `runId` (e os demais campos do resumo) é a run que a substitui. */
  runOriginalId: string;
  /** Saldo líquido que a run original tinha dado ao jogador (agora estornado). */
  pontosAntes: number;
  /** Saldo líquido da run corrigida. */
  pontosDepois: number;
}

/** Pontos recebidos de outro jogador pela carteira (D47). */
export interface DadosTransferenciaRecebida {
  transferenciaId: string;
  pontos: number;
  /** Apelido de quem enviou. */
  remetente: string;
}

/** Compra da loja entregue no jogo pelo admin (US-12). */
export interface DadosCompraEntregue {
  compraId: string;
  item: string;
  quantidade: number;
  /** Pontos pagos na compra. */
  total: number;
}

/** Compra cancelada por um admin antes da entrega: os pontos voltam ao comprador (D25). */
export interface DadosCompraCancelada {
  compraId: string;
  item: string;
  quantidade: number;
  /** Pontos devolvidos ao comprador. */
  total: number;
  /** Motivo digitado pelo admin. */
  motivo: string | null;
}

/** Item consignado do jogador vendido e entregue: o vendedor recebe os pontos (D28). */
export interface DadosVendaCreditada {
  compraId: string;
  item: string;
  /** Unidades do jogador nesta compra (somadas entre os lotes dele). */
  quantidade: number;
  pontos: number;
}

/** Oferta de venda aprovada: o item virou lote consignado na loja (D22). */
export interface DadosOfertaAprovada {
  ofertaId: string;
  item: string;
  quantidade: number;
}

/** Oferta de venda rejeitada pelo admin. */
export interface DadosOfertaRejeitada {
  ofertaId: string;
  item: string;
  quantidade: number;
  motivo: string | null;
}

/** Vínculo da conta do Discord com um jogador aprovado (D12). */
export interface DadosVinculoAprovado {
  solicitacaoId: string;
  /** Apelido do jogador vinculado. */
  jogador: string;
  /** Personagens cadastrados junto com a aprovação. */
  personagens: string[];
}

/** Solicitação de vínculo rejeitada. */
export interface DadosVinculoRejeitado {
  solicitacaoId: string;
  motivo: string | null;
}

/** Materiais da Nebula entregues no jogo (US-19). */
export interface DadosNebulaEntregue {
  solicitacaoId: string;
  receita: string;
}

/** Solicitação de Nebula rejeitada pelo admin: pontos e materiais devolvidos (D36). */
export interface DadosNebulaRejeitada {
  solicitacaoId: string;
  receita: string;
  /** Pontos devolvidos ao jogador. */
  pontos: number;
  motivo: string | null;
}

/** Todos os eventos, pelo `tipo` gravado na notificação. */
export interface DadosPorTipo {
  RUN_PONTOS: DadosRunPontos;
  RUN_CORRIGIDA: DadosRunCorrigida;
  TRANSFERENCIA_RECEBIDA: DadosTransferenciaRecebida;
  COMPRA_ENTREGUE: DadosCompraEntregue;
  COMPRA_CANCELADA: DadosCompraCancelada;
  VENDA_CREDITADA: DadosVendaCreditada;
  OFERTA_APROVADA: DadosOfertaAprovada;
  OFERTA_REJEITADA: DadosOfertaRejeitada;
  VINCULO_APROVADO: DadosVinculoAprovado;
  VINCULO_REJEITADO: DadosVinculoRejeitado;
  NEBULA_ENTREGUE: DadosNebulaEntregue;
  NEBULA_REJEITADA: DadosNebulaRejeitada;
}

export type TipoNotificacao = keyof DadosPorTipo;

/** Um evento pronto para a caixa de saída: o tipo e os dados correspondentes. */
export type EventoNotificacao = {
  [T in TipoNotificacao]: { tipo: T; dados: DadosPorTipo[T] };
}[TipoNotificacao];

/** Para quem vai: o jogador (resolvido para o usuário vinculado) ou diretamente o usuário. */
export type Destinatario = { jogadorId: string } | { usuarioId: string };
