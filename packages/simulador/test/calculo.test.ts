// D57: fórmulas públicas do RO Renewal. Os valores "conhecidos" vêm dos exemplos da iRO Wiki e das
// reduções que a Divine Pride mostra nas páginas dos monstros 20994 e 20996.
import { describe, expect, it } from "vitest";
import {
  type Alvo,
  type Atacante,
  atkComMultiplicadores,
  atkDeAtributos,
  BONUS_FISICO_ZERADO,
  BONUS_MAGICO_ZERADO,
  contraHp,
  defDeAtributosDoMonstro,
  defesaAposPerfuracao,
  fatorDef,
  fatorMdef,
  fatorRes,
  matkDeAtributos,
  mdefDeAtributosDoMonstro,
  simularFisico,
  simularMagico,
} from "../src/index.js";

const atacante = (parcial: Partial<Atacante>): Atacante => ({
  nivelBase: 1,
  str: 0,
  dex: 0,
  int: 0,
  luk: 0,
  pow: 0,
  spl: 0,
  con: 0,
  ...parcial,
});

const alvo = (parcial: Partial<Alvo>): Alvo => ({
  nivel: 1,
  def: 0,
  mdef: 0,
  vit: 0,
  int: 0,
  res: 0,
  mres: 0,
  tamanho: "MEDIO",
  elemento: "NEUTRO",
  nivelElemento: 1,
  danoRecebidoPct: 100,
  ...parcial,
});

describe("ATQ e ATQM de atributos", () => {
  const quem = atacante({ nivelBase: 200, str: 120, dex: 60, int: 150, luk: 30, pow: 30, spl: 20 });

  it("corpo a corpo: nível/4 + FOR + DES/5 + SOR/3 + 5 por POD", () => {
    expect(atkDeAtributos(quem, "ESPADA")).toBe(50 + 120 + 12 + 10 + 150);
  });

  it("arco, arma de fogo, instrumento e chicote trocam FOR por DES", () => {
    for (const tipo of ["ARCO", "ARMA_DE_FOGO", "INSTRUMENTO", "CHICOTE"] as const) {
      expect(atkDeAtributos(quem, tipo)).toBe(50 + 60 + 24 + 10 + 150);
    }
  });

  it("ATQM: nível/4 + INT + INT/2 + DES/5 + SOR/3 + 5 por FEI", () => {
    expect(matkDeAtributos(quem)).toBe(50 + 150 + 75 + 12 + 10 + 100);
  });

  it("arredonda cada parcela para baixo", () => {
    expect(atkDeAtributos(atacante({ nivelBase: 99, str: 1, dex: 9, luk: 5 }), "ADAGA")).toBe(24 + 1 + 1 + 1);
    expect(matkDeAtributos(atacante({ nivelBase: 99, int: 99, dex: 9, luk: 5 }))).toBe(24 + 99 + 49 + 1 + 1);
  });
});

describe("defesas do alvo (valores conhecidos)", () => {
  it("DEF 500 corta o dano pela metade (iRO Wiki)", () => {
    expect(fatorDef(500)).toBe(0.5);
    expect(fatorDef(0)).toBe(1);
  });

  it("DEFM 125 corta o dano pela metade e DEFM 60 tira cerca de um terço (iRO Wiki)", () => {
    expect(fatorMdef(125)).toBe(0.5);
    expect(fatorMdef(60)).toBeCloseTo(0.6625, 4);
  });

  it("RES e RESM batem com as reduções que a Divine Pride mostra", () => {
    expect((1 - fatorRes(500)) * 100).toBeCloseTo(44.44, 2);
    expect((1 - fatorRes(300)) * 100).toBeCloseTo(34.29, 2);
    expect((1 - fatorRes(200)) * 100).toBeCloseTo(26.67, 2);
  });

  it("perfuração: (500 − 40) com 25% + 30% sobra 207 (iRO Wiki)", () => {
    expect(defesaAposPerfuracao(460, 55)).toBe(207);
    expect(defesaAposPerfuracao(60, 95)).toBe(3);
    expect(defesaAposPerfuracao(500, 130)).toBe(0);
    expect(defesaAposPerfuracao(500, -10)).toBe(500);
  });

  it("DEF e DEFM de atributos do monstro", () => {
    expect(defDeAtributosDoMonstro({ nivel: 250, vit: 132 })).toBe(191);
    expect(mdefDeAtributosDoMonstro({ nivel: 250, vit: 132, int: 152 })).toBe(62 + 13 + 30);
  });
});

describe("multiplicadores de ATQ", () => {
  it("exemplo da iRO Wiki: 140 de ATQ, ATQ 11%, tamanho 10%, classe 10%, propriedade 100% = 354", () => {
    expect(
      atkComMultiplicadores(140, { atkPct: 11, racaPct: 0, tamanhoPct: 10, elementoPct: 100, classePct: 10 }),
    ).toBe(354);
  });

  it("sem bônus, o ATQ fica como está", () => {
    expect(atkComMultiplicadores(590, BONUS_FISICO_ZERADO)).toBe(590);
  });
});

describe("simulação física", () => {
  const entrada = {
    atacante: atacante({ nivelBase: 200, str: 120, dex: 60, luk: 30, pow: 30, con: 10 }),
    arma: { tipo: "ESPADA_DUAS_MAOS", ataque: 300, nivel: 4, refino: 10 },
    elementoAtaque: "NEUTRO",
    bonus: { ...BONUS_FISICO_ZERADO, atkEquipamento: 100, atkPct: 10, racaPct: 20, classePct: 50 },
    habilidade: { pct: 500, acertos: 3 },
    alvo: alvo({ nivel: 250, def: 500, vit: 150, res: 500, tamanho: "GRANDE" }),
  } as const;

  it("caso calculado à mão, passo a passo", () => {
    const r = simularFisico(entrada);
    expect(r.detalhe).toEqual({
      ataqueDeAtributos: 342,
      ataqueDaArma: { minimo: 490, maximo: 694 },
      amplificacao: 12,
      modificadorElementalPct: 100,
      penalidadeDeTamanhoPct: 100,
      defesa: 500,
      passaPelaDefesaPct: 50,
      defesaDeAtributos: 200,
      resistencia: 500,
      passaPelaResistenciaPct: 55.56,
    });
    expect(r.porAcerto).toEqual({ minimo: 2605, maximo: 3207, medio: 2906 });
    expect(r.total).toEqual({ minimo: 7815, maximo: 9621, medio: 8718 });
  });

  it("penalidade de tamanho reduz só o ATQ da arma, e pode ser ignorada", () => {
    const medio = { ...entrada, alvo: { ...entrada.alvo, tamanho: "MEDIO" } } as const;
    const r = simularFisico(medio);
    expect(r.detalhe.penalidadeDeTamanhoPct).toBe(75);
    expect(r.detalhe.ataqueDaArma).toEqual({ minimo: 367, maximo: 520 });
    expect(r.detalhe.ataqueDeAtributos).toBe(342);
    const semPenalidade = simularFisico({
      ...medio,
      bonus: { ...medio.bonus, ignoraPenalidadeDeTamanho: true },
    });
    expect(semPenalidade.porAcerto).toEqual(simularFisico(entrada).porAcerto);
  });

  it("alvo Fantasma 3: ataque Neutro cai à metade, inclusive o ATQ de atributos", () => {
    const base = { ...entrada, bonus: BONUS_FISICO_ZERADO, habilidade: { pct: 100, acertos: 1 } };
    const semDefesa = alvo({ tamanho: "GRANDE" });
    const neutro = simularFisico({ ...base, alvo: semDefesa });
    const fantasma = simularFisico({
      ...base,
      alvo: { ...semDefesa, elemento: "FANTASMA", nivelElemento: 3 },
    });
    expect(fantasma.detalhe.modificadorElementalPct).toBe(50);
    expect(neutro.porAcerto.minimo).toBe(Math.floor((684 + 490) * 1.12));
    expect(fantasma.porAcerto.minimo).toBe(Math.floor((342 + 245) * 1.12));
  });

  it("alvo que recebe 1% do dano e dano final em %", () => {
    const cheio = simularFisico(entrada).porAcerto.minimo;
    expect(
      simularFisico({ ...entrada, alvo: { ...entrada.alvo, danoRecebidoPct: 1 } }).porAcerto.minimo,
    ).toBe(Math.floor(cheio / 100));
    expect(
      simularFisico({ ...entrada, bonus: { ...entrada.bonus, danoFinalPct: 10 } }).porAcerto.minimo,
    ).toBe(Math.floor(cheio * 1.1));
  });

  it("perfurar a DEF e o RES aumenta o dano; o dano nunca fica abaixo de 1", () => {
    const perfurando = simularFisico({
      ...entrada,
      bonus: { ...entrada.bonus, ignorarDefPct: 100, ignorarResPct: 100 },
    });
    expect(perfurando.detalhe).toMatchObject({ defesa: 0, passaPelaDefesaPct: 100, resistencia: 0 });
    expect(perfurando.porAcerto.minimo).toBe(2021 * 5 - 200);
    const fraco = simularFisico({
      atacante: atacante({ nivelBase: 1, str: 1 }),
      arma: { tipo: "SEM_ARMA", ataque: 0, nivel: 1, refino: 0 },
      elementoAtaque: "NEUTRO",
      bonus: BONUS_FISICO_ZERADO,
      habilidade: { pct: 100, acertos: 1 },
      alvo: alvo({ nivel: 250, vit: 200, def: 900 }),
    });
    expect(fraco.porAcerto).toEqual({ minimo: 1, maximo: 1, medio: 1 });
  });

  it("sem arma, o ATQ da arma e o refino não entram", () => {
    const r = simularFisico({ ...entrada, arma: { tipo: "SEM_ARMA", ataque: 300, nivel: 4, refino: 10 } });
    expect(r.detalhe.ataqueDaArma).toEqual({ minimo: 0, maximo: 0 });
  });
});

describe("dano contra o HP do alvo", () => {
  it("percentual por uso e usos para derrubar", () => {
    expect(contraHp(300_000_000, { minimo: 1_500_000, maximo: 3_000_000, medio: 2_250_000 })).toEqual({
      pctMinimo: 0.5,
      pctMaximo: 1,
      usosMinimo: 100,
      usosMaximo: 200,
    });
    expect(contraHp(1000, { minimo: 300, maximo: 301, medio: 300.5 })).toMatchObject({
      usosMinimo: 4,
      usosMaximo: 4,
    });
  });

  it("dano zero não derruba", () => {
    expect(contraHp(1000, { minimo: 0, maximo: 0, medio: 0 })).toEqual({
      pctMinimo: 0,
      pctMaximo: 0,
      usosMinimo: null,
      usosMaximo: null,
    });
  });
});

describe("simulação mágica", () => {
  const entrada = {
    atacante: atacante({ nivelBase: 200, int: 150, dex: 100, luk: 30, spl: 20, con: 10 }),
    arma: { tipo: "CAJADO", ataque: 250, nivel: 3, refino: 9 },
    elementoAtaque: "FOGO",
    bonus: { ...BONUS_MAGICO_ZERADO, matkEquipamento: 100, matkPct: 20, racaPct: 10 },
    habilidade: { pct: 1000, acertos: 1 },
    alvo: alvo({ nivel: 250, mdef: 125, vit: 100, int: 100, mres: 200, elemento: "TERRA", nivelElemento: 2 }),
  } as const;

  it("caso calculado à mão, passo a passo", () => {
    const r = simularMagico(entrada);
    expect(r.detalhe).toEqual({
      ataqueDeAtributos: 405,
      ataqueDaArma: { minimo: 207, maximo: 415 },
      amplificacao: 8,
      modificadorElementalPct: 175,
      penalidadeDeTamanhoPct: 100,
      defesa: 125,
      passaPelaDefesaPct: 50,
      defesaDeAtributos: 92,
      resistencia: 200,
      passaPelaResistenciaPct: 73.33,
    });
    expect(r.porAcerto).toEqual({ minimo: 6408, maximo: 8318, medio: 7363 });
    expect(r.total).toEqual(r.porAcerto);
  });

  it("propriedade que o alvo anula zera o dano", () => {
    const r = simularMagico({ ...entrada, elementoAtaque: "TERRA" });
    expect(r.detalhe.modificadorElementalPct).toBe(0);
    expect(r.porAcerto).toEqual({ minimo: 0, maximo: 0, medio: 0 });
  });

  it("vários acertos multiplicam o total", () => {
    const r = simularMagico({ ...entrada, habilidade: { pct: 1000, acertos: 7 } });
    expect(r.total).toEqual({ minimo: 6408 * 7, maximo: 8318 * 7, medio: 7363 * 7 });
  });
});
