// Modelo do assistente de run (T-20): o rascunho editável. As pendências ficam em pendencias-run.ts.
// A prévia e o corpo ficam em previa-run.ts; a run registrada, em detalhe-run.modelos.ts.
// Tudo aqui é puro (sem Angular), para ser testado isoladamente.
import type { CategoriaEmprestimo, StatusRun } from "@betel/scoring";
import type { Classe, FuncaoClasse, ItemCatalogo } from "../../../shared/dominio/cadastros";
import type { Instancia } from "../../../shared/dominio/instancias";
import { ROTULO_CATEGORIA } from "../../../shared/dominio/emprestimo";

export const ROTULO_STATUS: Record<StatusRun | "ESTORNADA", string> = {
  CONCLUIDA: "Concluída",
  FALHA_CHEFE: "Falha no chefe",
  ABORTADA: "Abortada",
  ESTORNADA: "Estornada (corrigida)",
};

// Rótulo das categorias de empréstimo: mora em shared/dominio (usado também pelo extrato).
export { ROTULO_CATEGORIA };

export const ROTULO_FRACAO: Record<number, string> = {
  100: "Completa (1)",
  50: "Parcial (0,5)",
  0: "Nenhuma (0)",
};

/** Jogador como GET /api/jogadores devolve. */
export interface JogadorCadastro {
  id: string;
  apelido: string;
  personagens: { id: string; nome: string; ativo: boolean }[];
}

export interface RascunhoEmprestimo {
  /** Identidade da linha na tela (track e foco). Só existe no front: não vai para a API. */
  readonly chave: string;
  readonly credorJogadorId: string | null;
  readonly itemId: string | null;
  readonly itemDescricao: string;
  readonly categoria: CategoriaEmprestimo;
  /** % digitado pelo admin (ex.: 25). null = usa a sugestão da categoria. */
  readonly percentualInformado: number | null;
}

export interface RascunhoParticipante {
  /** Identidade da linha na tela (track e foco). Só existe no front: não vai para a API. */
  readonly chave: string;
  readonly personagemId: string | null;
  readonly classeId: string | null;
  readonly funcaoId: string | null;
  readonly fracaoCentesimos: 100 | 50 | 0;
  readonly emprestimos: readonly RascunhoEmprestimo[];
}

export interface RascunhoRun {
  readonly data: string;
  /** Épico IV (D44): instância e encontro da run. */
  readonly instanciaId: string | null;
  readonly encontroId: string | null;
  readonly status: StatusRun;
  readonly pontuacaoBetelgeuse: number | null;
  readonly observacao: string;
  readonly participantes: readonly RascunhoParticipante[];
  readonly drops: readonly RascunhoDrop[];
}

export interface RascunhoDrop {
  /** Identidade da linha na tela (track e foco). Só existe no front: não vai para a API. */
  readonly chave: string;
  readonly itemId: string | null;
  readonly quantidade: number | null;
}

/** Dados de apoio carregados da API. */
export interface Catalogos {
  jogadores: JogadorCadastro[];
  /** Classes com as funções da versão vigente da instância escolhida (D45). */
  classes: Classe[];
  instancias: Instancia[];
  itens: ItemCatalogo[];
}

export function hojeIso(agora = new Date()): string {
  const d = new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 10);
}

export function novoRascunho(
  instanciaId: string | null = null,
  encontroId: string | null = null,
): RascunhoRun {
  return {
    data: hojeIso(),
    instanciaId,
    encontroId,
    status: "CONCLUIDA",
    pontuacaoBetelgeuse: null,
    observacao: "",
    participantes: [novoParticipante()],
    drops: [],
  };
}

let sequencia = 0;

/** Chave única de uma linha do rascunho (participante, empréstimo ou drop). */
export function novaChave(): string {
  // randomUUID só existe em contexto seguro (https ou localhost); fora dele, um contador basta.
  return globalThis.crypto?.randomUUID?.() ?? `linha-${Date.now()}-${++sequencia}`;
}

export function novoParticipante(): RascunhoParticipante {
  return {
    chave: novaChave(),
    personagemId: null,
    classeId: null,
    funcaoId: null,
    fracaoCentesimos: 100,
    emprestimos: [],
  };
}

export function novoDrop(): RascunhoDrop {
  return { chave: novaChave(), itemId: null, quantidade: 1 };
}

export function novoEmprestimo(): RascunhoEmprestimo {
  return {
    chave: novaChave(),
    credorJogadorId: null,
    itemId: null,
    itemDescricao: "",
    categoria: "IMPORTANTE",
    percentualInformado: null,
  };
}

/** Função padrão da classe, ou null quando a classe exige escolha (D16). */
export function funcaoPadrao(classe: Classe | undefined): FuncaoClasse | null {
  return classe?.funcoes.find((f) => f.padrao) ?? null;
}

/** Encontro escolhido, dentro da versão vigente da instância escolhida. */
export function encontroDe(r: RascunhoRun, cat: Catalogos) {
  return (
    cat.instancias
      .find((i) => i.id === r.instanciaId)
      ?.vigente?.encontros.find((e) => e.id === r.encontroId) ?? null
  );
}

/**
 * Correção (D46): a run antiga é de uma versão que pode não ser mais a vigente. O encontro e as
 * funções passam para os da versão vigente com o mesmo nome; o que não existir mais fica para
 * escolher de novo (vira pendência no assistente).
 */
export function ajustarAVersaoVigente(
  r: RascunhoRun,
  cat: Catalogos,
  antigos: { encontro: string; funcoes: Map<string, string> },
): RascunhoRun {
  const vigente = cat.instancias.find((i) => i.id === r.instanciaId)?.vigente;
  const encontro =
    vigente?.encontros.find((e) => e.id === r.encontroId) ??
    vigente?.encontros.find((e) => e.nome.toLowerCase() === antigos.encontro.toLowerCase()) ??
    null;
  return {
    ...r,
    encontroId: encontro?.id ?? null,
    participantes: r.participantes.map((p) => {
      const classe = cat.classes.find((c) => c.id === p.classeId);
      if (classe === undefined || p.funcaoId === null || classe.funcoes.some((f) => f.id === p.funcaoId))
        return p;
      const nome = antigos.funcoes.get(p.funcaoId)?.toLowerCase();
      const igual = classe.funcoes.find((f) => f.nome.toLowerCase() === nome);
      return { ...p, funcaoId: igual?.id ?? funcaoPadrao(classe)?.id ?? null };
    }),
  };
}

/** Dono (jogador) de cada personagem. */
export function indicePersonagens(jogadores: JogadorCadastro[]) {
  const m = new Map<string, { nome: string; ativo: boolean; jogadorId: string; apelido: string }>();
  for (const j of jogadores) {
    for (const p of j.personagens)
      m.set(p.id, { nome: p.nome, ativo: p.ativo, jogadorId: j.id, apelido: j.apelido });
  }
  return m;
}

export function funcaoDe(p: RascunhoParticipante, cat: Catalogos): FuncaoClasse | null {
  const classe = cat.classes.find((c) => c.id === p.classeId);
  if (classe === undefined) return null;
  if (p.funcaoId !== null) return classe.funcoes.find((f) => f.id === p.funcaoId) ?? null;
  return funcaoPadrao(classe);
}
