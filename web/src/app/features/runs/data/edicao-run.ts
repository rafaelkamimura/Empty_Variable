// Edição do rascunho da run sem mutação: cada função devolve um rascunho novo, para o assistente
// guardar o rascunho num signal (OnPush) e as pendências e a prévia recalcularem sozinhas.
import type { Classe } from "../../../shared/dominio/cadastros";
import {
  funcaoPadrao,
  novoEmprestimo,
  novoParticipante,
  type RascunhoEmprestimo,
  type RascunhoParticipante,
  type RascunhoRun,
} from "./runs.modelos";

type Drop = RascunhoRun["drops"][number];

const trocar = <T>(lista: readonly T[], i: number, novo: T): T[] => lista.map((x, k) => (k === i ? novo : x));
const sem = <T>(lista: readonly T[], i: number): T[] => lista.filter((_, k) => k !== i);

export function comParticipante(
  r: RascunhoRun,
  i: number,
  parte: Partial<RascunhoParticipante>,
): RascunhoRun {
  const atual = r.participantes[i];
  return atual ? { ...r, participantes: trocar(r.participantes, i, { ...atual, ...parte }) } : r;
}

/** Ao trocar a classe, pré-seleciona a função padrão (classes sem padrão ficam sem seleção: D16). */
export function comClasse(
  r: RascunhoRun,
  i: number,
  classeId: string,
  classes: readonly Classe[],
): RascunhoRun {
  const funcaoId = funcaoPadrao(classes.find((c) => c.id === classeId))?.id ?? null;
  return comParticipante(r, i, { classeId, funcaoId });
}

/** Depois de trocar a instância (D45), cada participante volta à função padrão da classe. */
export function comFuncoesPadrao(r: RascunhoRun, classes: readonly Classe[]): RascunhoRun {
  return {
    ...r,
    participantes: r.participantes.map((p) => ({
      ...p,
      funcaoId: funcaoPadrao(classes.find((c) => c.id === p.classeId))?.id ?? null,
    })),
  };
}

export const comNovoParticipante = (r: RascunhoRun): RascunhoRun => ({
  ...r,
  participantes: [...r.participantes, novoParticipante()],
});
export const semParticipante = (r: RascunhoRun, i: number): RascunhoRun => ({
  ...r,
  participantes: sem(r.participantes, i),
});

export function comEmprestimo(
  r: RascunhoRun,
  i: number,
  j: number,
  parte: Partial<RascunhoEmprestimo>,
): RascunhoRun {
  const p = r.participantes[i];
  const e = p?.emprestimos[j];
  return p && e ? comParticipante(r, i, { emprestimos: trocar(p.emprestimos, j, { ...e, ...parte }) }) : r;
}
export function comNovoEmprestimo(r: RascunhoRun, i: number): RascunhoRun {
  const p = r.participantes[i];
  return p ? comParticipante(r, i, { emprestimos: [...p.emprestimos, novoEmprestimo()] }) : r;
}
export function semEmprestimo(r: RascunhoRun, i: number, j: number): RascunhoRun {
  const p = r.participantes[i];
  return p ? comParticipante(r, i, { emprestimos: sem(p.emprestimos, j) }) : r;
}

export function comDrop(r: RascunhoRun, i: number, parte: Partial<Drop>): RascunhoRun {
  const d = r.drops[i];
  return d ? { ...r, drops: trocar(r.drops, i, { ...d, ...parte }) } : r;
}
export const comNovoDrop = (r: RascunhoRun): RascunhoRun => ({
  ...r,
  drops: [...r.drops, { itemId: null, quantidade: 1 }],
});
export const semDrop = (r: RascunhoRun, i: number): RascunhoRun => ({ ...r, drops: sem(r.drops, i) });
