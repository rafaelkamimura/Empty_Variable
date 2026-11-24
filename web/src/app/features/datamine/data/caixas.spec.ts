import { compararLinhasCaixa, formatarChance, resumoDaCaixa } from "./caixas";
import type { LinhaCaixa } from "./relatorio.modelos";

const linha = (id: number, grupo: number, peso: number, pct: number): LinhaCaixa => ({
  id,
  nome: `Item ${id}`,
  grupo,
  peso,
  pct,
  garantido: peso === 0,
});

describe("caixas", () => {
  it("sem conteúdo anterior, ordena pelo peso, deixa os garantidos no fim e não marca nada", () => {
    const linhas = compararLinhasCaixa(null, [
      linha(1, 6, 3, 0.03),
      linha(2, 0, 0, 0),
      linha(3, 6, 50, 0.5),
      linha(4, 6, 50, 0.5),
    ]);
    expect(linhas.map((l) => [l.id, l.mudanca, l.pctAntes])).toEqual([
      [3, "igual", null],
      [4, "igual", null],
      [1, "igual", null],
      [2, "igual", null],
    ]);
  });

  it("marca linha nova, com a chance alterada e, no fim, as removidas", () => {
    const antes = [linha(1, 6, 50, 50), linha(2, 6, 40, 40), linha(3, 6, 10, 10)];
    const depois = [linha(1, 6, 50, 50), linha(2, 6, 30, 30), linha(4, 6, 20, 20)];
    const linhas = compararLinhasCaixa(antes, depois);
    expect(linhas.map((l) => [l.id, l.mudanca, l.pctAntes])).toEqual([
      [1, "igual", null],
      [2, "alterada", 40],
      [4, "nova", null],
      [3, "removida", null],
    ]);
  });

  it("o mesmo item em grupos diferentes são linhas diferentes", () => {
    const linhas = compararLinhasCaixa([linha(1, 1, 10, 10)], [linha(1, 2, 10, 10)]);
    expect(linhas.map((l) => [l.grupo, l.mudanca])).toEqual([
      [2, "nova"],
      [1, "removida"],
    ]);
  });

  it("resumoDaCaixa conta os sorteáveis, a soma dos pesos e os garantidos", () => {
    expect(resumoDaCaixa([linha(1, 6, 3, 0.03), linha(2, 6, 50, 0.5), linha(3, 0, 0, 0)])).toEqual({
      sorteaveis: 2,
      somaDosPesos: 53,
      garantidos: 1,
    });
    expect(resumoDaCaixa([])).toEqual({ sorteaveis: 0, somaDosPesos: 0, garantidos: 0 });
  });

  it("formatarChance: duas casas a partir de 1%, três abaixo", () => {
    expect(formatarChance(12.5)).toBe("12,50%");
    expect(formatarChance(100)).toBe("100,00%");
    expect(formatarChance(0.03)).toBe("0,030%");
    expect(formatarChance(0.5)).toBe("0,500%");
  });
});
