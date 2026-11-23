import { textoPendencia } from "./pendencias";

describe("Pendências", () => {
  it("o texto do resumo leva o contexto da linha", () => {
    expect(textoPendencia({ campo: "c", mensagem: "Escolha a classe.", contexto: "Vaga 3" })).toBe(
      "Vaga 3: escolha a classe.",
    );
    expect(textoPendencia({ campo: "c", mensagem: "Escolha a instância." })).toBe("Escolha a instância.");
  });
});
