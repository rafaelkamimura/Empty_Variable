// Épico IV, M15 (D43 a D46): instâncias como a API devolve, rótulos e regras de exibição.

export type RetornoInstancia = "DIARIO" | "TRES_DIAS" | "HORAS" | "SEMANAL" | "OUTRO";
export type ModoInstancia = "SOLO" | "GRUPO";
export type DificuldadeInstancia = "FACIL" | "MEDIA" | "DIFICIL";

export const ROTULO_RETORNO: Record<RetornoInstancia, string> = {
  DIARIO: "Diário",
  TRES_DIAS: "A cada 3 dias",
  HORAS: "Em horas",
  SEMANAL: "Semanal",
  OUTRO: "Outro",
};
export const ROTULO_MODO: Record<ModoInstancia, string> = { SOLO: "Solo", GRUPO: "Grupo" };
export const ROTULO_DIFICULDADE: Record<DificuldadeInstancia, string> = {
  FACIL: "Fácil",
  MEDIA: "Média",
  DIFICIL: "Difícil",
};

export interface EncontroInstancia {
  id: string;
  nome: string;
  codigo: string | null;
  multiplicadorCentesimos: number;
}

export interface FuncaoInstancia {
  id: string;
  nome: string;
  rank: number;
  padrao: boolean;
  classe: { id: string; nomeOficial: string; apelidoGrupo: string | null; ativa: boolean };
}

export interface Instancia {
  id: string;
  nome: string;
  codigo: string | null;
  ativa: boolean;
  nivelMinimo: number | null;
  retorno: RetornoInstancia | null;
  modo: ModoInstancia | null;
  dificuldade: DificuldadeInstancia | null;
  requisito: string | null;
  premiacao: string | null;
  vigente: {
    id: string;
    versao: number;
    vigenteDesde: string;
    criadaPor: { discordUsername: string } | null;
    encontros: EncontroInstancia[];
    funcoes: FuncaoInstancia[];
  } | null;
}

export interface VersaoHistorico {
  id: string;
  versao: number;
  vigenteDesde: string;
  criadaPor: { discordUsername: string } | null;
  runs: number;
  encontros: { nome: string; multiplicadorCentesimos: number }[];
  funcoes: { nome: string; rank: number; padrao: boolean; classe: string }[];
}

export interface ReferenciaInstancia {
  nome: string;
  nivelMinimo: number | null;
  retorno: RetornoInstancia;
  detalheRetorno: string | null;
  modo: ModoInstancia | null;
  dificuldade: DificuldadeInstancia | null;
  requisito: string | null;
  premiacao: string | null;
}

/** Só instâncias ativas e com funções recebem runs (CT-146). */
export function recebeRun(i: Instancia): boolean {
  return i.ativa && (i.vigente?.funcoes.length ?? 0) > 0;
}

/** Situação para o selo do cartão. */
export function situacaoInstancia(i: Instancia): {
  texto: string;
  tipo: "ativa" | "sem-funcoes" | "inativa";
} {
  if ((i.vigente?.funcoes.length ?? 0) === 0) return { texto: "Sem funções", tipo: "sem-funcoes" };
  return i.ativa ? { texto: "Ativa", tipo: "ativa" } : { texto: "Inativa", tipo: "inativa" };
}

/** "×1,5" a partir de centésimos. */
export function textoMultiplicador(centesimos: number): string {
  return `×${(centesimos / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`;
}

/** Linha editável de encontro ou função no editor de versões. */
export interface EncontroEditavel {
  nome: string;
  multiplicador: number | null;
}
export interface FuncaoEditavel {
  classeId: string;
  nome: string;
  rank: number | null;
  padrao: boolean;
}

/** Pendências do editor de versão, antes de enviar (a API valida de novo). */
export function pendenciasVersao(encontros: EncontroEditavel[], funcoes: FuncaoEditavel[]): string[] {
  const p: string[] = [];
  if (encontros.length === 0) p.push("Informe ao menos um encontro.");
  if (encontros.some((e) => e.nome.trim() === "")) p.push("Dê um nome a cada encontro.");
  if (
    encontros.some(
      (e) =>
        e.multiplicador === null ||
        !(e.multiplicador > 0) ||
        Math.round(e.multiplicador * 100) !== e.multiplicador * 100,
    )
  ) {
    p.push("Multiplicadores maiores que zero, com até 2 casas.");
  }
  const nomesEnc = encontros.map((e) => e.nome.trim().toLowerCase());
  if (new Set(nomesEnc).size !== nomesEnc.length) p.push("Encontros com nomes repetidos.");
  if (funcoes.some((f) => f.nome.trim() === "")) p.push("Dê um nome a cada função.");
  if (funcoes.some((f) => f.rank === null || !Number.isInteger(f.rank) || f.rank < 1 || f.rank > 5)) {
    p.push("Ranks inteiros de 1 a 5.");
  }
  const chaves = funcoes.map((f) => `${f.classeId}:${f.nome.trim().toLowerCase()}`);
  if (new Set(chaves).size !== chaves.length)
    p.push("Uma classe não pode ter duas funções com o mesmo nome.");
  const padroes = funcoes.filter((f) => f.padrao).map((f) => f.classeId);
  if (new Set(padroes).size !== padroes.length) p.push("Só uma função padrão por classe.");
  return p;
}

/** Corpo de POST /api/instancias/:id/versoes. */
export function corpoVersao(encontros: EncontroEditavel[], funcoes: FuncaoEditavel[]) {
  return {
    encontros: encontros.map((e) => ({
      nome: e.nome.trim(),
      multiplicadorCentesimos: Math.round((e.multiplicador ?? 0) * 100),
    })),
    funcoes: funcoes.map((f) => ({
      classeId: f.classeId,
      nome: f.nome.trim(),
      rank: f.rank,
      padrao: f.padrao,
    })),
  };
}
