import { describe, expect, it } from "vitest";
import {
  abrirToken,
  type AlvoMotor,
  carregarDados,
  ELEMENTOS_MOTOR,
  ErroDoMotor,
  MotorLatam,
  RACAS_MOTOR,
  TAMANHOS_MOTOR,
} from "../src/index";
import { TOKEN_EXEMPLO } from "./build-exemplo";

const dados = carregarDados();
const motor = new MotorLatam(dados);
/** Dia em que os números do site foram lidos: fixa os bônus de evento com prazo. */
const AGORA = new Date("2026-11-21T15:00:00Z");

const ELEMENTOS_DO_MOTOR = [
  "Neutral",
  "Water",
  "Earth",
  "Fire",
  "Wind",
  "Poison",
  "Holy",
  "Dark",
  "Ghost",
  "Undead",
];
const RACAS_DO_MOTOR = [
  "Formless",
  "Undead",
  "Brute",
  "Plant",
  "Insect",
  "Fish",
  "Demon",
  "DemiHuman",
  "Angel",
  "Dragon",
];
const TAMANHOS_DO_MOTOR = ["Small", "Medium", "Large"];

/**
 * Alvo com os atributos que o próprio motor guarda do monstro, como a tela envia depois de buscar
 * o monstro pelo nome.
 * @param id ID do monstro no jogo
 */
function alvo(id: number): AlvoMotor {
  const m = dados.monstros[id].stats;
  const [elemento, nivelElemento] = m.elementName.split(" ");
  return {
    id,
    nivel: m.level,
    hp: m.health,
    def: m.defense,
    mdef: m.magicDefense,
    vit: m.vit,
    int: m.int,
    res: m.res,
    mres: m.mres,
    raca: RACAS_MOTOR[RACAS_DO_MOTOR.indexOf(m.raceName)],
    tamanho: TAMANHOS_MOTOR[TAMANHOS_DO_MOTOR.indexOf(m.scaleName)],
    elemento: ELEMENTOS_MOTOR[ELEMENTOS_DO_MOTOR.indexOf(elemento)],
    nivelElemento: Number(nivelElemento),
    chefe: m.class !== 0,
  };
}

// Números lidos em https://simulador.latam-tools.com.br/ em 2026-11-21 (versão 0.1.228-beta), com o
// link https://short.latam-tools.com.br/Ukxuq4 aberto e o alvo escolhido na lista: a faixa "DANO" da
// habilidade e o "Por uso". Tolerância: nenhuma, os valores têm de ser iguais.
const REFERENCIA_DO_SITE = [
  { id: 20996, nome: "Naght Sieger", minimo: 75, maximo: 185, porUso: 1300 },
  { id: 1865, nome: "Zumbi Dilacerado", minimo: 493, maximo: 796, porUso: 6440 },
  { id: 21067, nome: "Dummy - Amorfo", minimo: 329, maximo: 530, porUso: 4290 },
];

describe("build de exemplo contra o simulador da latam-tools", () => {
  for (const referencia of REFERENCIA_DO_SITE) {
    it(`Lanças de Fogo nv. 10 em ${referencia.nome}: ${referencia.minimo} a ${referencia.maximo}, ${referencia.porUso} por uso`, () => {
      const r = motor.simular({ token: TOKEN_EXEMPLO, alvo: alvo(referencia.id), agora: AGORA });
      expect(r.habilidade).toMatchObject({
        valor: "Fire Bolt==10",
        nome: "Lanças de Fogo",
        nivel: 10,
        tipo: "MAGICO",
        elemento: "FOGO",
        acertos: 10,
      });
      expect(r.dano).toEqual({ minimo: referencia.minimo, maximo: referencia.maximo });
      expect(r.porUso.medio).toBe(referencia.porUso);
      expect(r.porUso.minimo).toBe(referencia.minimo * 10);
      expect(r.porUso.maximo).toBe(referencia.maximo * 10);
    });
  }

  it("mostra os atributos que o site mostra para a build (ATQM 44 + 285, precisão 304)", () => {
    const r = motor.simular({ token: TOKEN_EXEMPLO, alvo: alvo(21067), agora: AGORA });
    expect(r.classe).toEqual({ id: 8, nome: "Feiticeiro" });
    expect(r.atributos).toMatchObject({ ataqueMagico: 44, precisao: 304, hpMaximo: 6454, spMaximo: 1324 });
    expect(r.bonusTotais).toContainEqual({ rotulo: "ATQM", valor: 105 });
  });

  it("lista os itens lidos, com os efeitos de cada um, e os conjuntos ativos", () => {
    const r = motor.simular({ token: TOKEN_EXEMPLO, alvo: alvo(20996), agora: AGORA });
    expect(r.ignorados).toEqual([]);
    const arma = r.itens.find((item) => item.slot === "Arma");
    expect(arma).toMatchObject({ id: 540031, nome: "Livro Feiticeiro do Éden", tipo: "EQUIPAMENTO" });
    expect(arma?.efeitos).toContainEqual({ rotulo: "ATQM", valor: 180 });
    expect(r.itens.map((item) => item.slot)).toEqual(
      expect.arrayContaining(["Sombrio: arma", "Sombrio: armadura", "Sombrio: colar"]),
    );
    expect(r.habilidadesEBuffs).toContain("Proteger Terreno nv. 5");
    const conjunto = r.conjuntos.find((c) => c.item === "Manopla Sombria do Paraíso Mágico");
    expect(conjunto?.com).toHaveLength(5);
  });

  it("um monstro com aura vermelha recebe a redução do motor, e o dano recebido não é aplicado de novo", () => {
    const r = motor.simular({
      token: TOKEN_EXEMPLO,
      alvo: { ...alvo(1751), danoRecebidoPct: 10 },
      agora: AGORA,
    });
    expect(r.alvo.reducaoPct).toBe(99.9);
    expect(r.dano).toEqual({ minimo: 0, maximo: 0 });
    expect(r.avisos.join(" ")).toContain("não foi aplicado de novo");
  });
});

describe("ficha por cima do link", () => {
  const base = motor.simular({ token: TOKEN_EXEMPLO, alvo: alvo(1865), agora: AGORA });

  it("os dez slots da ficha valem no lugar dos do link, e o resto da build continua", () => {
    const semArma = motor.simular({
      token: TOKEN_EXEMPLO,
      ficha: { equipamentos: { armadura: { id: 450042 } } },
      alvo: alvo(1865),
      agora: AGORA,
    });
    expect(semArma.itens.some((item) => item.slot === "Arma")).toBe(false);
    expect(semArma.itens.some((item) => item.slot === "Armadura")).toBe(true);
    expect(semArma.itens.some((item) => item.slot === "Sombrio: arma")).toBe(true);
    expect(semArma.dano.maximo).toBeLessThan(base.dano.maximo);
  });

  it("um item que o motor não conhece é ignorado e listado, e a simulação continua", () => {
    const r = motor.simular({
      token: TOKEN_EXEMPLO,
      ficha: {
        equipamentos: {
          arma: { id: 540031, cartas: [999_999_001] },
          acessorio1: { id: 7508, cartas: [4040] },
        },
      },
      alvo: alvo(1865),
      agora: AGORA,
    });
    expect(r.ignorados).toEqual([
      expect.objectContaining({ slot: "Arma", tipo: "CARTA", id: 999_999_001, nome: null }),
      expect.objectContaining({
        slot: "Acessório 1",
        tipo: "EQUIPAMENTO",
        id: 7508,
        nome: "Anel da Allysia",
      }),
      expect.objectContaining({ slot: "Acessório 1", tipo: "CARTA", id: 4040 }),
    ]);
    expect(r.dano.maximo).toBeGreaterThan(0);
  });

  it("atributos, nível e habilidade da ficha substituem os do link", () => {
    const r = motor.simular({
      token: TOKEN_EXEMPLO,
      ficha: { base: { int: 99 }, habilidade: { nome: "Cold Bolt", nivel: 10 } },
      alvo: alvo(1865),
      agora: AGORA,
    });
    expect(r.habilidade).toMatchObject({ valor: "Cold Bolt==10", elemento: "AGUA", acertos: 10 });
    expect(r.atributos.ataqueMagico).toBeGreaterThan(base.atributos.ataqueMagico);
    expect(r.habilidadesDisponiveis).toContainEqual({
      valor: "Fire Bolt==10",
      nome: "Lanças de Fogo nv. 10",
    });
  });

  it("habilidade que a classe não tem cai na padrão, com aviso", () => {
    const r = motor.simular({
      token: TOKEN_EXEMPLO,
      ficha: { habilidade: { nome: "Golpe Inventado", nivel: 3 } },
      alvo: alvo(1865),
      agora: AGORA,
    });
    expect(r.habilidade.valor).not.toContain("Golpe Inventado");
    expect(r.avisos.join(" ")).toContain("Golpe Inventado");
  });

  it("calcula só com a ficha, sem link, quando ela traz a classe", () => {
    const r = motor.simular({
      ficha: {
        classe: 8,
        nivelBase: 105,
        nivelClasse: 50,
        base: { int: 90, dex: 60 },
        habilidade: { nome: "Fire Bolt", nivel: 10 },
        equipamentos: { arma: { id: 540031 } },
      },
      alvo: alvo(1865),
      agora: AGORA,
    });
    expect(r.itens.map((item) => item.nome)).toEqual(["Livro Feiticeiro do Éden"]);
    expect(r.dano.minimo).toBeGreaterThan(0);
  });

  it("recusa build sem classe conhecida e token que não é uma build", () => {
    expect(() => motor.simular({ ficha: { nivelBase: 100 }, alvo: alvo(1865) })).toThrow(ErroDoMotor);
    expect(() => motor.simular({ token: "isto-nao-e-um-token", alvo: alvo(1865) })).toThrow(ErroDoMotor);
  });
});

describe("bônus digitados e alvo informado", () => {
  const entrada = { token: TOKEN_EXEMPLO, alvo: alvo(1865), agora: AGORA };
  const base = motor.simular(entrada);

  it("os bônus digitados somam aos efeitos dos itens", () => {
    const comAtqm = motor.simular({ ...entrada, bonus: { matk: 100 } });
    expect(comAtqm.bonusTotais).toContainEqual({ rotulo: "ATQM", valor: 205 });
    expect(comAtqm.dano.minimo).toBeGreaterThan(base.dano.minimo);
    const comHabilidade = motor.simular({ ...entrada, bonus: { habilidadePct: 50 } });
    expect(comHabilidade.dano.maximo).toBeGreaterThan(base.dano.maximo);
  });

  it("o dano final digitado multiplica o resultado", () => {
    const r = motor.simular({ ...entrada, bonus: { danoFinalPct: 100 } });
    expect(r.dano).toEqual({ minimo: base.dano.minimo * 2, maximo: base.dano.maximo * 2 });
  });

  it("o dano recebido informado vale quando o motor não tem redução para o monstro", () => {
    const r = motor.simular({ ...entrada, alvo: { ...entrada.alvo, danoRecebidoPct: 10 } });
    expect(r.alvo.reducaoPct).toBe(0);
    expect(r.dano.maximo).toBe(Math.floor(base.dano.maximo / 10));
  });

  it("os atributos informados do alvo valem no lugar dos do monstro, e um alvo sem ID é aceito", () => {
    const maisDefesa = motor.simular({ ...entrada, alvo: { ...entrada.alvo, mdef: 500 } });
    expect(maisDefesa.dano.maximo).toBeLessThan(base.dano.maximo);
    const { id: _id, ...semId } = entrada.alvo;
    const r = motor.simular({ ...entrada, alvo: { ...semId, nome: "Alvo digitado" } });
    expect(r.alvo.nome).toBe("Alvo digitado");
    expect(r.dano).toEqual(base.dano);
  });
});

describe("abrirToken", () => {
  it("devolve só campos do modelo do simulador, com o formato esperado", () => {
    const aberto = abrirToken(TOKEN_EXEMPLO);
    expect(aberto?.personalizados).toBe(false);
    expect(aberto?.build).toMatchObject({ class: 8, level: 105, weapon: 540031, shadowWeapon: 24705 });
    expect(abrirToken("abc")).toBeNull();
  });
});
