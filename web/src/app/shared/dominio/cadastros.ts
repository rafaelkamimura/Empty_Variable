import type { ConfigPontuacao as ConfigMotor } from "@betel/scoring";

// Modelos e conversões dos cadastros do M3 (classes, parâmetros e itens).

export interface FuncaoClasse {
  id: string;
  nome: string;
  rank: number;
  padrao: boolean;
}

export interface Classe {
  id: string;
  nomeOficial: string;
  apelidoGrupo: string | null;
  ativa: boolean;
  funcoes: FuncaoClasse[];
}

export const TIPOS_ITEM = ["MATERIAL", "VISUAL", "CARTA", "OUTRO"] as const;
export type TipoItem = (typeof TIPOS_ITEM)[number];

export interface ItemCatalogo {
  id: string;
  nome: string;
  idJogo: number | null;
  tipo: TipoItem | null;
  negociavel: boolean | null;
  vinculadoConta: boolean | null;
  ativo: boolean;
  /** Épico II: preço vigente na loja (D21), nulo = fora da loja. */
  precoVigente: number | null;
  /** Épico II (D20): motivo de o item não poder ir para a loja; nulo = elegível. */
  motivoInelegivel: string | null;
  /** Épico II (D26): unidades do grupo reservadas para a Nebula. */
  reservaMinima: number;
  /** Épico II (D24): limite opcional por membro num período. */
  limitePorMembro: number | null;
  limitePeriodoDias: number | null;
}

/** Versão de parâmetros como a API devolve (centésimos e pontos-base). */
export interface VersaoParametros {
  id: string;
  versao: number;
  base: number;
  alphaCentesimos: number;
  sConcluidaCentesimos: number;
  sFalhaCentesimos: number;
  sAbortadaCentesimos: number;
  pctEssencialBp: number;
  pctImportanteBp: number;
  pctComplementarBp: number;
  tetoCredoresBp: number;
  vigenteDesde: string;
  criadaPorId: string | null;
}

export type ParametrosApi = Omit<VersaoParametros, "id" | "versao" | "vigenteDesde" | "criadaPorId">;

/** Campos do formulário em unidades humanas: fatores (1,5) e percentuais (20). */
export interface ParametrosFormulario {
  base: number;
  alpha: number;
  sConcluida: number;
  sFalha: number;
  sAbortada: number;
  pctEssencial: number;
  pctImportante: number;
  pctComplementar: number;
  tetoCredores: number;
}

/**
 * Converte um decimal com até 2 casas para inteiro em centésimos (1,5 → 150).
 * Recusa mais casas em vez de arredondar: um valor de regra de negócio não pode mudar sem o admin ver.
 */
export function paraCentesimos(valor: number): number | null {
  if (!Number.isFinite(valor) || valor < 0) return null;
  const c = Math.round(valor * 100);
  return Math.abs(c - valor * 100) < 1e-6 ? c : null;
}

export function deCentesimos(c: number): number {
  return c / 100;
}

/** Erro por campo, ou os valores em centésimos/pontos-base prontos para a API. */
export function formularioParaApi(f: ParametrosFormulario): { erros: string[]; api: ParametrosApi | null } {
  const erros: string[] = [];
  const conv = (rotulo: string, v: number, max: number): number => {
    const c = paraCentesimos(v);
    if (c === null) erros.push(`${rotulo}: use um número ≥ 0 com até 2 casas decimais.`);
    else if (c > max) erros.push(`${rotulo}: valor acima do permitido.`);
    return c ?? 0;
  };
  if (!Number.isInteger(f.base) || f.base < 0) erros.push("B: use um número inteiro ≥ 0.");
  const api: ParametrosApi = {
    base: f.base,
    alphaCentesimos: conv("α", f.alpha, 10_000),
    sConcluidaCentesimos: conv("S Concluída", f.sConcluida, 10_000),
    sFalhaCentesimos: conv("S Falha no chefe", f.sFalha, 10_000),
    sAbortadaCentesimos: conv("S Abortada", f.sAbortada, 10_000),
    pctEssencialBp: conv("% Essencial", f.pctEssencial, 10_000),
    pctImportanteBp: conv("% Importante", f.pctImportante, 10_000),
    pctComplementarBp: conv("% Complementar", f.pctComplementar, 10_000),
    tetoCredoresBp: conv("Teto dos credores", f.tetoCredores, 10_000),
  };
  return { erros, api: erros.length === 0 ? api : null };
}

export function apiParaFormulario(v: ParametrosApi): ParametrosFormulario {
  return {
    base: v.base,
    alpha: deCentesimos(v.alphaCentesimos),
    sConcluida: deCentesimos(v.sConcluidaCentesimos),
    sFalha: deCentesimos(v.sFalhaCentesimos),
    sAbortada: deCentesimos(v.sAbortadaCentesimos),
    pctEssencial: deCentesimos(v.pctEssencialBp),
    pctImportante: deCentesimos(v.pctImportanteBp),
    pctComplementar: deCentesimos(v.pctComplementarBp),
    tetoCredores: deCentesimos(v.tetoCredoresBp),
  };
}

/**
 * Mesmo mapeamento da API (backend/src/cadastros/config-pontuacao.service.ts). O multiplicador do
 * encontro não está aqui: vem de cada instância (D44).
 */
export function paraConfigMotor(p: ParametrosApi): ConfigMotor {
  return {
    base: p.base,
    alphaCentesimos: p.alphaCentesimos,
    multiplicadorStatus: {
      CONCLUIDA: p.sConcluidaCentesimos,
      FALHA_CHEFE: p.sFalhaCentesimos,
      ABORTADA: p.sAbortadaCentesimos,
    },
    percentualCategoriaBp: {
      ESSENCIAL: p.pctEssencialBp,
      IMPORTANTE: p.pctImportanteBp,
      COMPLEMENTAR: p.pctComplementarBp,
    },
    tetoCredoresBp: p.tetoCredoresBp,
  };
}
