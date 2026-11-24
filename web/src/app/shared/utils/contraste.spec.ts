import { contraste, corLegivel, emHex, lerHex, luminancia } from "./contraste";

const CARTAO_ESCURO = "#140B36";
const CARTAO_CLARO = "#FCFAFF";
const razao = (cor: string, fundo: string) => contraste(lerHex(cor)!, lerHex(fundo)!);

describe("contraste", () => {
  it("lerHex aceita #RGB e #RRGGBB, com ou sem #, e recusa o resto", () => {
    expect(lerHex("#FF8800")).toEqual([255, 136, 0]);
    expect(lerHex("0f0")).toEqual([0, 255, 0]);
    expect(lerHex("rgb(1 2 3)")).toBeNull();
    expect(lerHex("#12345")).toBeNull();
    expect(emHex([255, 136, 0])).toBe("#FF8800");
  });

  it("luminância e razão batem com o WCAG nos extremos", () => {
    expect(luminancia([0, 0, 0])).toBe(0);
    expect(luminancia([255, 255, 255])).toBeCloseTo(1, 5);
    expect(razao("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(razao("#777777", "#777777")).toBe(1);
  });

  it("cor que já passa volta igual", () => {
    expect(corLegivel("#ff0000", CARTAO_ESCURO)).toBe("#FF0000");
    expect(corLegivel("#EED7FF", CARTAO_ESCURO)).toBe("#EED7FF");
  });

  it("cor escura do jogo é clareada só até passar no fundo escuro, mantendo o matiz", () => {
    for (const cor of ["#0000FF", "#000088", "#777777", "#008800", "#663399", "#000001"]) {
      const ajustada = corLegivel(cor, CARTAO_ESCURO);
      expect(razao(ajustada, CARTAO_ESCURO)).toBeGreaterThanOrEqual(4.5);
      expect(ajustada).not.toBe(cor);
    }
    const [r, g, b] = lerHex(corLegivel("#0000FF", CARTAO_ESCURO))!;
    expect(b).toBe(255);
    expect(r).toBe(g);
    expect(r).toBeLessThan(200);
  });

  it("num fundo claro, a cor clara é escurecida", () => {
    const ajustada = corLegivel("#FFFF00", CARTAO_CLARO);
    expect(razao(ajustada, CARTAO_CLARO)).toBeGreaterThanOrEqual(4.5);
    expect(lerHex(ajustada)![2]).toBe(0);
    expect(corLegivel("#0000FF", CARTAO_CLARO)).toBe("#0000FF");
  });

  it("cor ou fundo que não são hex voltam como vieram", () => {
    expect(corLegivel("tomato", CARTAO_ESCURO)).toBe("tomato");
    expect(corLegivel("#0000FF", "color-mix(in srgb, red, blue)")).toBe("#0000FF");
  });
});
