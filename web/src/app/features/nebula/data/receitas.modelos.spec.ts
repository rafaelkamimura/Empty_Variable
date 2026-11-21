import type { Receita } from "./nebula.modelos";
import { pendenciasComponentes, situacaoReceita } from "./receitas.modelos";

const receita = (parcial: Partial<Receita>): Receita => ({
  id: "r1",
  nome: "Armadura Nebulosa (POD)",
  itemProduzido: { id: "i1", nome: "Armadura Nebulosa (POD)" },
  solicitavel: true,
  ativa: false,
  fonte: "browiki",
  limitePorMembro: null,
  limitePeriodoDias: null,
  componentes: [],
  receitaPeca: null,
  precoVigente: null,
  solicitacoesPendentes: 0,
  disponibilidade: { trazendoPeca: 0, comPecaDoEstoque: 0, faltasTrazendo: [], faltasComPeca: [] },
  ...parcial,
});

describe("nebula (T-42)", () => {
  it("situacaoReceita: ativa, a validar e sem preço", () => {
    expect(situacaoReceita(receita({ ativa: true })).tipo).toBe("ativa");
    expect(situacaoReceita(receita({})).tipo).toBe("sem-preco");
    expect(
      situacaoReceita(receita({ precoVigente: { versao: 1, precoComPeca: 10, precoTrazendoPeca: 5 } })).tipo,
    ).toBe("validar");
    // Peça-base não solicitável não precisa de preço
    expect(situacaoReceita(receita({ solicitavel: false })).tipo).toBe("validar");
  });

  it("pendenciasComponentes: aponta vazio, item faltando, quantidade, repetição e duas peças-base", () => {
    expect(pendenciasComponentes([])).toEqual(["Informe ao menos um componente."]);
    expect(pendenciasComponentes([{ itemId: "a", quantidade: 50, pecaBase: false }])).toEqual([]);
    const p = pendenciasComponentes([
      { itemId: "", quantidade: 1, pecaBase: false },
      { itemId: "a", quantidade: 0, pecaBase: true },
      { itemId: "a", quantidade: 1.5, pecaBase: true },
    ]);
    expect(p).toEqual([
      "Escolha o item de cada linha.",
      "Quantidades inteiras maiores que zero.",
      "Um item não pode se repetir.",
      "Só uma peça-base por receita.",
    ]);
  });
});
