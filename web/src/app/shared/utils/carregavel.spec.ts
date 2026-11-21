import { carregando, comErro, pronto, vazioPadrao } from "./carregavel";

describe("Carregavel", () => {
  it("cria os três estados", () => {
    expect(carregando()).toEqual({ estado: "carregando" });
    expect(comErro("falhou")).toEqual({ estado: "erro", mensagem: "falhou" });
    expect(pronto([1])).toEqual({ estado: "pronto", dados: [1] });
  });

  it("vazio padrão: lista vazia, null e undefined", () => {
    expect(vazioPadrao([])).toBeTrue();
    expect(vazioPadrao(null)).toBeTrue();
    expect(vazioPadrao(undefined)).toBeTrue();
    expect(vazioPadrao([0])).toBeFalse();
    expect(vazioPadrao({})).toBeFalse();
    expect(vazioPadrao(0)).toBeFalse();
  });
});
