import { contarDiff, diffLinhas } from "./diff-linhas";

const resumo = (antes: string[], depois: string[]) =>
  diffLinhas(antes, depois).map(
    (l) => `${l.tipo === "igual" ? " " : l.tipo === "adicionada" ? "+" : "-"}${l.texto}`,
  );

describe("diffLinhas", () => {
  it("listas iguais não têm mudança", () => {
    expect(resumo(["a", "b"], ["a", "b"])).toEqual([" a", " b"]);
    expect(resumo([], [])).toEqual([]);
  });

  it("linha trocada aparece como removida e depois adicionada, no lugar certo", () => {
    expect(resumo(["Tipo: Carta", "ATQ + 10", "Peso: 1"], ["Tipo: Carta", "ATQ + 15", "Peso: 1"])).toEqual([
      " Tipo: Carta",
      "-ATQ + 10",
      "+ATQ + 15",
      " Peso: 1",
    ]);
  });

  it("linhas novas no meio e no fim", () => {
    expect(resumo(["a", "c"], ["a", "b", "c", "d"])).toEqual([" a", "+b", " c", "+d"]);
  });

  it("linhas que saíram, e um lado vazio", () => {
    expect(resumo(["a", "b", "c"], ["c"])).toEqual(["-a", "-b", " c"]);
    expect(resumo([], ["x"])).toEqual(["+x"]);
    expect(resumo(["x"], [])).toEqual(["-x"]);
  });

  it("linhas repetidas não confundem a ordem", () => {
    expect(resumo(["", "a", ""], ["", "a", "b", ""])).toEqual([" ", " a", "+b", " "]);
  });

  it("descrições enormes caem para tudo removido e tudo adicionado", () => {
    const antes = Array.from({ length: 700 }, (_, i) => `a${i}`);
    const depois = Array.from({ length: 700 }, (_, i) => `d${i}`);
    const diff = diffLinhas(antes, depois);
    expect(diff.length).toBe(1400);
    expect(diff[0]).toEqual({ tipo: "removida", texto: "a0" });
    expect(diff[1399]).toEqual({ tipo: "adicionada", texto: "d699" });
  });

  it("contarDiff soma o que entrou e o que saiu", () => {
    expect(contarDiff(diffLinhas(["a", "b"], ["b", "c", "d"]))).toEqual({ adicionadas: 2, removidas: 1 });
  });
});
