import { iconeDoItem, siglaDaClasse, TONS, tomDe } from "./visual";

describe("visual dos cartões", () => {
  it("ícone pelo tipo e pelo nome do item", () => {
    expect(iconeDoItem("Alma de Betelgeuse", "MATERIAL")).toBe("chama");
    expect(iconeDoItem("Fragmento de Meteorito", "MATERIAL")).toBe("cristal");
    expect(iconeDoItem("Pó de Meteorito do Poder", "MATERIAL")).toBe("po");
    expect(iconeDoItem("Armadura Nebulosa POD", "OUTRO")).toBe("armadura");
    expect(iconeDoItem("Carta Naght Sieger", "CARTA")).toBe("carta");
    expect(iconeDoItem("Aura", "VISUAL")).toBe("brilho");
    expect(iconeDoItem("Desconhecido", null)).toBe("caixa");
  });

  it("tom estável e sempre um token de tom da paleta", () => {
    expect(tomDe("MTK")).toBe(tomDe("MTK"));
    for (const n of ["MTK", "Magus", "Alma de Naght Sieger", ""])
      expect(TONS as readonly string[]).toContain(tomDe(n));
    for (const t of TONS) expect(t).toMatch(/^var\(--tom-[a-z]+\)$/);
  });

  it("sigla da classe", () => {
    expect(siglaDaClasse("MTK")).toBe("MTK");
    expect(siglaDaClasse("Demais classes")).toBe("DC");
    expect(siglaDaClasse("Magus")).toBe("MA");
  });
});
