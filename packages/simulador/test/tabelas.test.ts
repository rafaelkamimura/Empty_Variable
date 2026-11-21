// D57: tabelas de propriedades, tamanho e refino conferidas com as páginas públicas citadas em tabelas.ts.
import { describe, expect, it } from "vitest";
import {
  bonusRefinoArma,
  CODIGOS_TIPO_ARMA,
  ELEMENTOS,
  modificadorElemental,
  penalidadeDeTamanho,
} from "../src/index.js";

describe("tabela de propriedades", () => {
  it("nível 1: Água em Fogo dá 150% e Fogo em Água dá 90%", () => {
    expect(modificadorElemental("AGUA", "FOGO", 1)).toBe(150);
    expect(modificadorElemental("FOGO", "AGUA", 1)).toBe(90);
  });

  it("alvo Fantasma 3, como a Divine Pride mostra no monstro 20996", () => {
    const esperado = [50, 100, 100, 100, 100, 50, 100, 100, 175, 150];
    expect(ELEMENTOS.map((ataque) => modificadorElemental(ataque, "FANTASMA", 3))).toEqual(esperado);
  });

  it("alvo Neutro 2, como a Divine Pride mostra no monstro 20994", () => {
    const esperado = [100, 100, 100, 100, 100, 100, 100, 100, 70, 100];
    expect(ELEMENTOS.map((ataque) => modificadorElemental(ataque, "NEUTRO", 2))).toEqual(esperado);
  });

  it("Sagrado em Maldito sobe com o nível: 125, 150, 175 e 200", () => {
    expect([1, 2, 3, 4].map((nivel) => modificadorElemental("SAGRADO", "MALDITO", nivel))).toEqual([
      125, 150, 175, 200,
    ]);
  });

  it("Neutro em Fantasma 4 e a mesma propriedade a partir do nível 2 não causam dano", () => {
    expect(modificadorElemental("NEUTRO", "FANTASMA", 4)).toBe(0);
    for (const elemento of ["AGUA", "TERRA", "FOGO", "VENTO"] as const) {
      expect(modificadorElemental(elemento, elemento, 1)).toBe(25);
      expect(modificadorElemental(elemento, elemento, 2)).toBe(0);
    }
  });

  it("nível fora de 1 a 4 usa o limite mais próximo", () => {
    expect(modificadorElemental("NEUTRO", "FANTASMA", 0)).toBe(90);
    expect(modificadorElemental("NEUTRO", "FANTASMA", 9)).toBe(0);
  });
});

describe("penalidade de tamanho", () => {
  it("segue a tabela por tipo de arma", () => {
    expect(penalidadeDeTamanho("ADAGA", "PEQUENO")).toBe(100);
    expect(penalidadeDeTamanho("ADAGA", "GRANDE")).toBe(50);
    expect(penalidadeDeTamanho("ESPADA_DUAS_MAOS", "GRANDE")).toBe(100);
    expect(penalidadeDeTamanho("ARCO", "GRANDE")).toBe(75);
    expect(penalidadeDeTamanho("LIVRO", "GRANDE")).toBe(50);
    expect(penalidadeDeTamanho("MACHADO", "PEQUENO")).toBe(50);
    expect(penalidadeDeTamanho("KATAR", "MEDIO")).toBe(100);
  });

  it("cajado, arma de fogo e mãos vazias não têm penalidade", () => {
    for (const tipo of ["CAJADO", "ARMA_DE_FOGO", "SEM_ARMA", "LANCA_DRAGAO"] as const) {
      expect(["PEQUENO", "MEDIO", "GRANDE"].map((t) => penalidadeDeTamanho(tipo, t as "MEDIO"))).toEqual([
        100, 100, 100,
      ]);
    }
    expect(CODIGOS_TIPO_ARMA).toHaveLength(18);
  });
});

describe("bônus de refino da arma", () => {
  it("dentro do limite seguro só há o bônus fixo", () => {
    expect(bonusRefinoArma(1, 7)).toEqual({ fixo: 14, variavelMaximo: 0 });
    expect(bonusRefinoArma(2, 6)).toEqual({ fixo: 18, variavelMaximo: 0 });
    expect(bonusRefinoArma(3, 5)).toEqual({ fixo: 25, variavelMaximo: 0 });
    expect(bonusRefinoArma(4, 4)).toEqual({ fixo: 28, variavelMaximo: 0 });
    expect(bonusRefinoArma(4, 0)).toEqual({ fixo: 0, variavelMaximo: 0 });
  });

  it("acima do seguro soma o bônus variável (tabelas da iRO Wiki)", () => {
    expect(bonusRefinoArma(1, 10)).toEqual({ fixo: 20, variavelMaximo: 6 });
    expect(bonusRefinoArma(2, 15)).toEqual({ fixo: 45, variavelMaximo: 45 });
    expect(bonusRefinoArma(3, 10)).toEqual({ fixo: 50, variavelMaximo: 40 });
    expect(bonusRefinoArma(4, 10)).toEqual({ fixo: 70, variavelMaximo: 84 });
    expect(bonusRefinoArma(4, 15)).toEqual({ fixo: 105, variavelMaximo: 154 });
  });

  it("do +16 em diante entra o bônus de refino alto", () => {
    expect(bonusRefinoArma(1, 16)).toEqual({ fixo: 32 + 16, variavelMaximo: 18 });
    expect(bonusRefinoArma(2, 20)).toEqual({ fixo: 60 + 40, variavelMaximo: 70 });
    expect(bonusRefinoArma(3, 17)).toEqual({ fixo: 85 + 34, variavelMaximo: 96 });
    expect(bonusRefinoArma(4, 20)).toEqual({ fixo: 140 + 60, variavelMaximo: 224 });
  });

  it("arma de nível 5: 8 por refino, sem variável", () => {
    expect(bonusRefinoArma(5, 10)).toEqual({ fixo: 80, variavelMaximo: 0 });
    expect(bonusRefinoArma(5, 20)).toEqual({ fixo: 160, variavelMaximo: 0 });
  });

  it("valores fora da faixa são limitados", () => {
    expect(bonusRefinoArma(9, 25)).toEqual({ fixo: 160, variavelMaximo: 0 });
    expect(bonusRefinoArma(0, -3)).toEqual({ fixo: 0, variavelMaximo: 0 });
  });
});
