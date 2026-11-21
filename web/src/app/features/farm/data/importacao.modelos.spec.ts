import { mapaSugerido, RESULTADO_VAZIO, somarResultados } from "./importacao.modelos";

describe("importacao.modelos", () => {
  it("sugere o personagem de mesmo nome, sem diferenciar maiúsculas", () => {
    const meus = [{ id: "p1", nome: "Lyra", classe: null }];
    expect(
      mapaSugerido(
        [
          { id: "c1", nome: "lyra" },
          { id: "c2", nome: "Outro" },
        ],
        meus,
      ),
    ).toEqual({ c1: "p1" });
  });

  it("soma os resultados dos pedaços", () => {
    const um = { ...RESULTADO_VAZIO, checkinsImportados: 2, itensCriados: 1 };
    expect(somarResultados(um, um)).toEqual({ ...RESULTADO_VAZIO, checkinsImportados: 4, itensCriados: 2 });
  });
});
