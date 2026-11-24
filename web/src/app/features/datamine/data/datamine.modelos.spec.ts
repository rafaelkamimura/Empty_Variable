import { indicadoresDaLista, indicadoresDe, nomesDosPatches, temContagens } from "./datamine.modelos";

describe("datamine.modelos", () => {
  it("indicadoresDe segue a ordem conhecida e ignora zeros e chaves estranhas", () => {
    const indicadores = indicadoresDe({
      contagens: { caixas: 31, itensNovos: 230, mapas: 0, skillsNovas: undefined, desconhecida: 9 },
    });
    expect(indicadores.map((i) => i.chave)).toEqual(["itensNovos", "caixas"]);
    expect(indicadores[0]).toEqual({ chave: "itensNovos", rotulo: "Itens novos", valor: 230 });
  });

  it("indicadoresDe aceita resumo vazio ou ausente", () => {
    expect(indicadoresDe(null)).toEqual([]);
    expect(indicadoresDe({})).toEqual([]);
  });

  it("indicadoresDaLista mostra só os curtos, com o rótulo de meio de frase e as siglas preservadas", () => {
    const linha = indicadoresDaLista({
      contagens: { itensNovos: 230, monstros: 24, quests: 78, grfNovos: 956, tabelasLua: 40 },
    });
    expect(linha.map((i) => `${i.valor} ${i.rotulo}`)).toEqual(["230 itens novos", "24 monstros e NPCs"]);
  });

  it("indicadoresDaLista, num patch sem itens, monstros, mapas nem caixas, mostra o que mudou", () => {
    const linha = indicadoresDaLista({
      contagens: {
        itensNovos: 0,
        monstros: 0,
        mapas: 0,
        caixas: 0,
        tabelasLua: 3,
        grfAlterados: 5,
        textos: 0,
      },
    });
    expect(linha.map((i) => `${i.valor} ${i.rotulo}`)).toEqual(["5 alterados no GRF", "3 tabelas Lua"]);
    expect(indicadoresDaLista({ contagens: { itensNovos: 0, tabelasLua: 0 } })).toEqual([]);
    expect(indicadoresDaLista(null)).toEqual([]);
  });

  it("temContagens separa o resumo sem números do resumo zerado", () => {
    expect(temContagens({ contagens: { itensNovos: 0 } })).toBeTrue();
    expect(temContagens({ contagens: {} })).toBeFalse();
    expect(temContagens({})).toBeFalse();
    expect(temContagens(null)).toBeFalse();
  });

  it("nomesDosPatches tira o número de sequência do patch.txt", () => {
    expect(
      nomesDosPatches(["1601 2026-11-24_live_client_2168_2168.gpf", "  1604 a.rgz ", "solto.gpf", ""]),
    ).toEqual(["2026-11-24_live_client_2168_2168.gpf", "a.rgz", "solto.gpf"]);
  });
});
