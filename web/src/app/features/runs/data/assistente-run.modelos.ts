// Regras puras do assistente de run: textos da revisão, credores possíveis e instância inicial.
import type { CategoriaEmprestimo } from "@betel/scoring";
import type { VersaoParametros } from "../../../shared/dominio/cadastros";
import type { Instancia } from "../../../shared/dominio/instancias";
import type { RascunhoNag4eyes } from "./nag4eyes.modelos";
import type { DestinoRegistro } from "./runs.api";
import type { JogadorCadastro, RascunhoEmprestimo, RascunhoParticipante } from "./runs.modelos";

const pct = (bp: number | undefined): string => (bp === undefined ? "" : `${bp / 100}%`);

/** Percentual sugerido por categoria de empréstimo ("25%"). */
export function sugestoesPorCategoria(v: VersaoParametros | null): Record<CategoriaEmprestimo, string> {
  return {
    ESSENCIAL: pct(v?.pctEssencialBp),
    IMPORTANTE: pct(v?.pctImportanteBp),
    COMPLEMENTAR: pct(v?.pctComplementarBp),
  };
}

/** Teto dos credores somados ("50%"). */
export function textoTeto(v: VersaoParametros | null): string {
  return `${(v?.tetoCredoresBp ?? 0) / 100}%`;
}

/** "Nome (Jogador)" do participante. */
export function nomeDoParticipante(jogadores: readonly JogadorCadastro[], p: RascunhoParticipante): string {
  for (const j of jogadores) {
    const pp = j.personagens.find((x) => x.id === p.personagemId);
    if (pp !== undefined) return `${pp.nome} (${j.apelido})`;
  }
  return "Participante sem personagem";
}

/** Quem pode emprestar ao participante: todos menos o dono do personagem (C3). */
export function credoresDe(
  jogadores: readonly JogadorCadastro[],
  p: RascunhoParticipante,
): JogadorCadastro[] {
  const dono = jogadores.find((j) => j.personagens.some((x) => x.id === p.personagemId))?.id;
  return jogadores.filter((j) => j.id !== dono);
}

/** Instância do rascunho ou a Torre, se puderem receber runs; senão, a primeira disponível. */
export function instanciaInicial(
  disponiveis: readonly Instancia[],
  origem: RascunhoNag4eyes | null,
): Instancia | undefined {
  return (
    disponiveis.find((i) => origem !== null && i.id === origem.instancia?.id) ??
    disponiveis.find((i) => i.codigo === "TORRE_CONSTELACAO") ??
    disponiveis[0]
  );
}

/** Para onde vai o registro: correção (US-07), confirmação de rascunho do nag4eyes ou run nova. */
export function destinoDoRegistro(
  correcaoDe: string | null,
  motivo: string,
  origem: RascunhoNag4eyes | null,
): DestinoRegistro {
  if (correcaoDe !== null) return { tipo: "correcao", runId: correcaoDe, motivo: motivo.trim() };
  if (origem !== null) return { tipo: "rascunho", rascunhoId: origem.id };
  return { tipo: "nova" };
}

/** Participante como o passo dos empréstimos mostra: nome pronto e quem pode emprestar a ele. */
export interface VistaEmprestimos {
  readonly chave: string;
  /** "Nome (Jogador)". */
  readonly nome: string;
  /** Todos os jogadores menos o dono do personagem (C3). */
  readonly credores: readonly JogadorCadastro[];
  readonly emprestimos: readonly RascunhoEmprestimo[];
}

export function vistasEmprestimos(
  jogadores: readonly JogadorCadastro[],
  participantes: readonly RascunhoParticipante[],
): VistaEmprestimos[] {
  return participantes.map((p) => ({
    chave: p.chave,
    nome: nomeDoParticipante(jogadores, p),
    credores: credoresDe(jogadores, p),
    emprestimos: p.emprestimos,
  }));
}
