import {
  categoriaDoItem,
  type PistasDoItem,
  ROTULO_CATEGORIA,
  rotuloDaCategoria,
  rotuloDoChip,
} from "./categorias";

const item = (id: number, nome = "Item", traje = false): PistasDoItem => ({ id, nome, traje });

describe("categorias", () => {
  it("cartas: pelas três faixas de ID ou pelo nome", () => {
    expect(categoriaDoItem(item(4123, "Poring Card"))).toBe("carta");
    expect(categoriaDoItem(item(27105))).toBe("carta");
    expect(categoriaDoItem(item(300500))).toBe("carta");
    expect(categoriaDoItem(item(123, "Carta Agnes"))).toBe("carta");
    expect(categoriaDoItem(item(4700))).toBe("outro");
  });

  it("armas e armaduras pelas faixas novas de ID", () => {
    expect(categoriaDoItem(item(500000))).toBe("arma");
    expect(categoriaDoItem(item(899999))).toBe("arma");
    expect(categoriaDoItem(item(450200))).toBe("armadura");
    expect(categoriaDoItem(item(499999))).toBe("armadura");
  });

  it("visuais: marca de traje, prefixo [Visual] ou faixa de ID", () => {
    expect(categoriaDoItem(item(1234, "Asas de Gelo", true))).toBe("visual");
    expect(categoriaDoItem(item(1234, "[Visual] Coroa Lilium"))).toBe("visual");
    expect(categoriaDoItem(item(420100))).toBe("visual");
    expect(categoriaDoItem(item(31588))).toBe("visual");
    expect(categoriaDoItem(item(32245, "Anel dos Esquecidos"))).toBe("outro");
  });

  it("sombrios e cartas dentro da faixa dos visuais continuam sombrios e cartas", () => {
    expect(categoriaDoItem(item(24816, "Malha Magistral dos Cardeais"))).toBe("sombrio");
    expect(categoriaDoItem(item(27500))).toBe("carta");
    expect(categoriaDoItem(item(25000))).toBe("visual");
  });

  it("encantos, pets, caixas e materiais", () => {
    expect(categoriaDoItem(item(311500))).toBe("encanto");
    expect(categoriaDoItem(item(310659, "Variável -5% (Dual)"))).toBe("outro");
    expect(categoriaDoItem(item(9178, "Ovo de Marionete Demoníaca"))).toBe("pet");
    expect(categoriaDoItem(item(108642, "Artefato Oval Invernal"))).toBe("caixa");
    expect(categoriaDoItem(item(1000855, "Pedra de CRÍT +10 (Dual)"))).toBe("material");
    expect(categoriaDoItem(item(501, "Poção Vermelha"))).toBe("outro");
  });

  it("toda categoria tem rótulo de chip e de selo, sem repetir", () => {
    const chaves = ROTULO_CATEGORIA.map(([c]) => c);
    expect(new Set(chaves).size).toBe(chaves.length);
    for (const c of chaves) expect(rotuloDaCategoria(c)).not.toBe("");
    expect(rotuloDoChip("sombrio")).toBe("Sombrios");
    expect(rotuloDoChip("desconhecida")).toBe("desconhecida");
  });
});
