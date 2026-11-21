import {
  chanceDoLoot,
  chaveDoNome,
  idDoCatalogo,
  lerIdJogo,
  lerNome,
  lootQueFalta,
  origensDoLoot,
  resumoDoLoot,
} from "./cadastro.modelos";
import type { InstanciaFarm, ItemLoot, LootInstancia } from "./farm.modelos";

const inst = (x: Partial<InstanciaFarm> = {}): InstanciaFarm => ({
  id: "i1",
  nome: "Operação Destruição",
  recarga: "DIARIA",
  instanciaId: null,
  personagemIds: [],
  drops: [],
  ...x,
});
const item = (x: Partial<ItemLoot> = {}): ItemLoot => ({
  idJogo: 1,
  nome: "Pétala",
  chance: null,
  recompensa: false,
  origens: [],
  ...x,
});
const loot = (x: Partial<LootInstancia> = {}): LootInstancia => ({
  instancia: { id: "c1", nome: "X" },
  chefes: 27,
  pendentes: 27,
  divinePride: false,
  itens: [],
  ...x,
});

describe("cadastro.modelos", () => {
  it("chave do nome ignora acentos, caixa, pontuação e preposições", () => {
    expect(chaveDoNome("Torre da Constelação!")).toBe(chaveDoNome("torre constelacao"));
  });

  it("acha a instância do catálogo pela ligação ou pelo nome", () => {
    const catalogo = [{ id: "c1", nome: "Operação Destruição", recargaSugerida: null }];
    expect(idDoCatalogo(inst({ instanciaId: "c9" }), catalogo)).toBe("c9");
    expect(idDoCatalogo(inst({ nome: "operacao destruicao" }), catalogo)).toBe("c1");
    expect(idDoCatalogo(inst({ nome: "Outra" }), catalogo)).toBeNull();
  });

  it("loot que falta compara pelo ID do jogo e pelo nome", () => {
    const porId = new Map([
      ["a", { id: "a", nome: "Pétala", idJogo: null, precoZeny: null }],
      ["b", { id: "b", nome: "Outro", idJogo: 7, precoZeny: null }],
    ]);
    const l = loot({
      itens: [
        item({ idJogo: 1, nome: "pétala" }),
        item({ idJogo: 7, nome: "Sete" }),
        item({ idJogo: 9, nome: null }),
      ],
    });
    expect(lootQueFalta(inst({ drops: ["a", "b"] }), l, porId).map((i) => i.idJogo)).toEqual([9]);
  });

  it("resumo do loot explica o que falta", () => {
    expect(resumoDoLoot(loot())).toContain("drops de 0 de 27 chefe(s).");
    expect(resumoDoLoot(loot())).toContain("A busca na Divine Pride está desligada neste servidor.");
    expect(resumoDoLoot(loot({ chefes: 0, pendentes: 0 }))).toContain("A browiki não nomeia");
  });

  it("chance, recompensa e origens", () => {
    expect(chanceDoLoot(item({ recompensa: true, chance: 0.5 }))).toBe("recompensa");
    expect(chanceDoLoot(item({ chance: 0.125 }))).toBe("12,5%");
    expect(chanceDoLoot(item({ chance: 0.0005 }))).toBe("0,05%");
    const o = { idMonstro: 1, tipo: "MVP" as const, chance: null };
    expect(
      origensDoLoot(
        item({
          origens: [
            { ...o, monstro: "A" },
            { ...o, monstro: "A" },
            { ...o, monstro: "B" },
          ],
        }),
      ),
    ).toBe("A, B");
  });

  it("leitura de ID do jogo e de nome", () => {
    expect(lerIdJogo("")).toBeNull();
    expect(lerIdJogo(" 984 ")).toBe(984);
    expect(lerIdJogo("0")).toBeUndefined();
    expect(lerIdJogo("1.5")).toBeUndefined();
    expect(lerNome("  Cripta ")).toBe("Cripta");
    expect(lerNome("   ")).toBeUndefined();
  });
});
