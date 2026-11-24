import {
  type FiltroLista,
  filtrarLista,
  fraseDaContagem,
  normalizarBusca,
  opcoesDoFiltro,
  TODOS,
} from "./filtro";

interface Linha {
  nome: string;
  tipo: string;
}

const LINHAS: Linha[] = [
  { nome: "Carta Poring", tipo: "carta" },
  { nome: "Poção Vermelha", tipo: "material" },
  { nome: "Carta Drops", tipo: "carta" },
  { nome: "Coisa estranha", tipo: "novidade" },
];

const POR_TIPO: FiltroLista<Linha> = {
  chave: "tipo",
  rotulo: "Filtrar por tipo",
  rotuloTodos: "Todos",
  valorDe: (l) => l.tipo,
  opcoes: [
    ["material", "Materiais"],
    ["carta", "Cartas"],
    ["arma", "Armas"],
  ],
};

const criterio = (termo: string, tipo = TODOS) => ({
  termo,
  textoDe: (l: Linha) => normalizarBusca(l.nome),
  filtros: [POR_TIPO],
  escolhas: { tipo },
});

describe("filtro", () => {
  it("normalizarBusca tira acento, caixa e espaço das pontas", () => {
    expect(normalizarBusca("  Poção de MAÇÃ ")).toBe("pocao de maca");
  });

  it("opcoesDoFiltro: todos com o total, só valores com linha, na ordem do filtro, e os desconhecidos no fim", () => {
    expect(opcoesDoFiltro(LINHAS, POR_TIPO)).toEqual([
      { valor: TODOS, rotulo: "Todos", contagem: 4 },
      { valor: "material", rotulo: "Materiais", contagem: 1 },
      { valor: "carta", rotulo: "Cartas", contagem: 2 },
      { valor: "novidade", rotulo: "novidade", contagem: 1 },
    ]);
    expect(opcoesDoFiltro([], POR_TIPO)).toEqual([{ valor: TODOS, rotulo: "Todos", contagem: 0 }]);
  });

  it("filtrarLista sem busca nem chip devolve tudo, numa lista nova", () => {
    const tudo = filtrarLista(LINHAS, criterio(""));
    expect(tudo).toEqual(LINHAS);
    expect(tudo).not.toBe(LINHAS);
  });

  it("a busca ignora acento e caixa e exige todas as palavras", () => {
    expect(filtrarLista(LINHAS, criterio("POCAO")).map((l) => l.nome)).toEqual(["Poção Vermelha"]);
    expect(filtrarLista(LINHAS, criterio("carta por")).map((l) => l.nome)).toEqual(["Carta Poring"]);
    expect(filtrarLista(LINHAS, criterio("carta azul"))).toEqual([]);
  });

  it("o chip filtra pelo valor e combina com a busca", () => {
    expect(filtrarLista(LINHAS, criterio("", "carta")).length).toBe(2);
    expect(filtrarLista(LINHAS, criterio("drops", "carta")).map((l) => l.nome)).toEqual(["Carta Drops"]);
    expect(filtrarLista(LINHAS, criterio("drops", "material"))).toEqual([]);
  });

  it("fraseDaContagem diz o que está na tela", () => {
    expect(fraseDaContagem(60, 230, 230)).toBe("Mostrando 60 de 230 resultados.");
    expect(fraseDaContagem(12, 12, 230)).toBe("12 de 230 resultados.");
    expect(fraseDaContagem(60, 80, 230)).toBe("Mostrando 60 de 80 resultados encontrados (230 no total).");
    expect(fraseDaContagem(1, 1, 1)).toBe("1 resultado.");
    expect(fraseDaContagem(0, 0, 230)).toBe("Nenhum resultado para a busca e os filtros.");
    expect(fraseDaContagem(0, 0, 0)).toBe("Nada nesta lista.");
  });
});
