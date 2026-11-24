// Comparação linha a linha de duas descrições (antes e depois do patch), pela maior subsequência comum.

export type TipoLinhaDiff = "igual" | "adicionada" | "removida";

export interface LinhaDiff {
  readonly tipo: TipoLinhaDiff;
  readonly texto: string;
}

/** Acima disso a tabela da subsequência fica cara; a comparação cai para "tudo removido, tudo adicionado". */
const LIMITE_CELULAS = 400_000;

/** Tabela de tamanhos da maior subsequência comum dos sufixos de `antes` e `depois`. */
function tabelaDeSufixos(antes: readonly string[], depois: readonly string[]): Uint32Array {
  const colunas = depois.length + 1;
  const tabela = new Uint32Array((antes.length + 1) * colunas);
  for (let i = antes.length - 1; i >= 0; i--) {
    for (let j = depois.length - 1; j >= 0; j--) {
      const abaixo = tabela[(i + 1) * colunas + j] ?? 0;
      const direita = tabela[i * colunas + j + 1] ?? 0;
      const diagonal = tabela[(i + 1) * colunas + j + 1] ?? 0;
      tabela[i * colunas + j] = antes[i] === depois[j] ? diagonal + 1 : Math.max(abaixo, direita);
    }
  }
  return tabela;
}

/**
 * As linhas das duas versões numa lista só, na ordem de leitura: as iguais, as que saíram
 * (`removida`) e as que entraram (`adicionada`). Uma linha trocada aparece como removida e, logo
 * depois, adicionada.
 */
export function diffLinhas(antes: readonly string[], depois: readonly string[]): LinhaDiff[] {
  if (antes.length * depois.length > LIMITE_CELULAS) {
    return [
      ...antes.map((texto): LinhaDiff => ({ tipo: "removida", texto })),
      ...depois.map((texto): LinhaDiff => ({ tipo: "adicionada", texto })),
    ];
  }
  const colunas = depois.length + 1;
  const tabela = tabelaDeSufixos(antes, depois);
  const saida: LinhaDiff[] = [];
  let i = 0;
  let j = 0;
  while (i < antes.length && j < depois.length) {
    const a = antes[i] ?? "";
    const d = depois[j] ?? "";
    if (a === d) {
      saida.push({ tipo: "igual", texto: a });
      i++;
      j++;
    } else if ((tabela[(i + 1) * colunas + j] ?? 0) >= (tabela[i * colunas + j + 1] ?? 0)) {
      saida.push({ tipo: "removida", texto: a });
      i++;
    } else {
      saida.push({ tipo: "adicionada", texto: d });
      j++;
    }
  }
  for (; i < antes.length; i++) saida.push({ tipo: "removida", texto: antes[i] ?? "" });
  for (; j < depois.length; j++) saida.push({ tipo: "adicionada", texto: depois[j] ?? "" });
  return saida;
}

/** Quantas linhas entraram e quantas saíram, para o resumo da linha ("3 adicionadas, 1 removida"). */
export function contarDiff(linhas: readonly LinhaDiff[]): { adicionadas: number; removidas: number } {
  let adicionadas = 0;
  let removidas = 0;
  for (const l of linhas) {
    if (l.tipo === "adicionada") adicionadas++;
    else if (l.tipo === "removida") removidas++;
  }
  return { adicionadas, removidas };
}
