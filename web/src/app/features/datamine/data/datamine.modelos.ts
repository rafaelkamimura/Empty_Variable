// Modelos do datamine de patches (D63). O resumo é montado pelo rolatam-dm (publish.py); os campos são
// opcionais porque o formato pode crescer sem a tela quebrar.

export interface DestaquesPatch {
  mapas?: { map: string; nome: string }[];
  monstros?: { id: number; sprite: string }[];
  caixas?: { id: number; nome: string }[];
  itensComEfeito?: { id: number; nome: string }[];
}

export interface ResumoPatch {
  contagens?: Record<string, number | undefined>;
  destaques?: DestaquesPatch;
  /** O Ragexe.exe mudou neste patch. */
  ragexe?: boolean;
  /** A tabela de arquivos do GRF mudou de lugar neste patch. */
  grfReempacotado?: boolean;
}

/** Resposta de GET /api/datamine/patches e /api/datamine/patches/:id. */
export interface PatchResumido {
  id: string;
  chave: string;
  titulo: string;
  /** AAAA-MM-DD */
  dataPatch: string;
  patches: string[];
  resumo: ResumoPatch;
  bytesHtml: number;
  bytesJson: number;
  publicadoEm: string;
  atualizadoEm: string;
}

export interface Indicador {
  chave: string;
  rotulo: string;
  valor: number;
}

/** Contagens que a tela mostra, nesta ordem, com o rótulo em pt-BR. */
export const ROTULO_CONTAGEM: readonly (readonly [chave: string, rotulo: string])[] = [
  ["itensNovos", "Itens novos"],
  ["itensAlterados", "Itens alterados"],
  ["monstros", "Monstros e NPCs"],
  ["skillsNovas", "Skills novas"],
  ["skillsAlteradas", "Skills alteradas"],
  ["mapas", "Mapas"],
  ["quests", "Quests"],
  ["caixas", "Caixas e ovos"],
  ["grfNovos", "Arquivos novos no GRF"],
  ["grfAlterados", "Arquivos alterados no GRF"],
  ["tabelasLua", "Tabelas Lua"],
  ["textos", "Arquivos de texto"],
];

/** Indicadores do resumo com valor maior que zero, na ordem de ROTULO_CONTAGEM. Contagens desconhecidas ficam de fora. */
export function indicadoresDe(resumo: ResumoPatch | null | undefined): Indicador[] {
  const contagens = resumo?.contagens ?? {};
  const out: Indicador[] = [];
  for (const [chave, rotulo] of ROTULO_CONTAGEM) {
    const valor = contagens[chave];
    if (typeof valor === "number" && valor > 0) out.push({ chave, rotulo, valor });
  }
  return out;
}

/** Os indicadores curtos da lista: itens novos, monstros, mapas e caixas (os que mais mudam de um patch para outro). */
export const INDICADORES_DA_LISTA: readonly string[] = [
  "itensNovos",
  "itensAlterados",
  "monstros",
  "mapas",
  "caixas",
];

/** Rótulos mais curtos para a lista, onde o selo não quebra linha e precisa caber no celular. */
const ROTULO_CURTO: Readonly<Record<string, string>> = {
  grfNovos: "novos no GRF",
  grfAlterados: "alterados no GRF",
};

/** Rótulo para o meio de uma frase ("3 tabelas Lua"): só a primeira letra cai, as siglas ficam. */
const emFrase = (i: Indicador): string =>
  ROTULO_CURTO[i.chave] ?? i.rotulo.charAt(0).toLowerCase() + i.rotulo.slice(1);

/**
 * O que a linha de um patch mostra na lista. Normalmente, só os indicadores curtos. Num patch
 * pequeno, em que todos eles são zero (um hotfix que só mexe em tabelas Lua ou em arquivos do GRF),
 * entram os demais, para a linha dizer o que mudou em vez de parecer vazia.
 */
export function indicadoresDaLista(resumo: ResumoPatch | null | undefined): Indicador[] {
  const todos = indicadoresDe(resumo);
  const curtos = todos.filter((i) => INDICADORES_DA_LISTA.includes(i.chave));
  return (curtos.length > 0 ? curtos : todos).map((i) => ({ ...i, rotulo: emFrase(i) }));
}

/** O resumo trouxe alguma contagem (mesmo que todas sejam zero). */
export function temContagens(resumo: ResumoPatch | null | undefined): boolean {
  return Object.values(resumo?.contagens ?? {}).some((v) => typeof v === "number");
}

/** Só os nomes de arquivo .gpf/.rgz, sem o número de sequência do patch.txt. */
export function nomesDosPatches(patches: readonly string[]): string[] {
  return patches.map((p) => p.trim().split(/\s+/).pop() ?? p).filter((p) => p !== "");
}
