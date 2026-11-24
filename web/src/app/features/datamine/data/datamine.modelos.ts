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

/** Endereço do report.html para o iframe, resolvido a partir da base da aplicação (sub-rota incluída). */
export function urlDoRelatorio(baseURI: string, id: string): string {
  return new URL(`api/datamine/patches/${encodeURIComponent(id)}/relatorio`, baseURI).href;
}

/** Só os nomes de arquivo .gpf/.rgz, sem o número de sequência do patch.txt. */
export function nomesDosPatches(patches: readonly string[]): string[] {
  return patches.map((p) => p.trim().split(/\s+/).pop() ?? p).filter((p) => p !== "");
}
