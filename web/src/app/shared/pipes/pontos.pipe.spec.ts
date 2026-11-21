import { formatarPontos } from "./pontos.pipe";

describe("pontos", () => {
  it("formata em pt-BR com o sufixo e trata a ausência de valor", () => {
    expect(formatarPontos(600)).toBe("600 pts");
    expect(formatarPontos(1234)).toBe("1.234 pts");
    expect(formatarPontos(0)).toBe("0 pts");
    expect(formatarPontos(-50)).toBe("-50 pts");
    expect(formatarPontos(null)).toBe("—");
    expect(formatarPontos(undefined)).toBe("—");
  });
});
