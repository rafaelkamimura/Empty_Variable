import { indicadoresDe, nomesDosPatches, urlDoRelatorio } from "./datamine.modelos";

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

  it("urlDoRelatorio respeita a sub-rota da base", () => {
    expect(urlDoRelatorio("https://eyes.exemplo.com/emptyvariable/", "abc-1")).toBe(
      "https://eyes.exemplo.com/emptyvariable/api/datamine/patches/abc-1/relatorio",
    );
    expect(urlDoRelatorio("http://localhost:4200/", "x")).toBe("http://localhost:4200/api/datamine/patches/x/relatorio");
  });

  it("nomesDosPatches tira o número de sequência do patch.txt", () => {
    expect(nomesDosPatches(["1601 2026-11-24_live_client_2168_2168.gpf", "  1604 a.rgz ", "solto.gpf", ""])).toEqual([
      "2026-11-24_live_client_2168_2168.gpf",
      "a.rgz",
      "solto.gpf",
    ]);
  });
});
