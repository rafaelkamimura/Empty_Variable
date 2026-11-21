import { idTransferencia, MAXIMO_PONTOS, pontosValidos } from "./carteira.modelos";

describe("Carteira: regras", () => {
  it("pontos: inteiro de 1 até o saldo", () => {
    expect(pontosValidos(100, 525)).toBeTrue();
    expect(pontosValidos(525, 525)).toBeTrue();
    expect(pontosValidos(526, 525)).toBeFalse();
    expect(pontosValidos(0, 525)).toBeFalse();
    expect(pontosValidos(1.5, 525)).toBeFalse();
    expect(pontosValidos(null, 525)).toBeFalse();
    expect(pontosValidos(Number.NaN, 525)).toBeFalse();
    expect(pontosValidos(MAXIMO_PONTOS + 1, Number.MAX_SAFE_INTEGER)).toBeFalse();
  });

  it("id da transferência é um UUID v4", () => {
    expect(idTransferencia()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(idTransferencia(() => new Uint8Array(16))).toBe("00000000-0000-4000-8000-000000000000");
  });
});
