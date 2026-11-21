import {
  bloqueioSolicitar,
  erroDoMotivo,
  nomeDaPeca,
  percentual,
  precoDe,
  type ReceitaAberta,
  rotuloDaPeca,
  seloDaNebulosa,
  type SolicitacaoNebula,
  trazPecaInicial,
} from "./nebula.modelos";

export const pod = (p: Partial<ReceitaAberta> = {}): ReceitaAberta => ({
  id: "r1",
  nome: "Armadura Nebulosa POD",
  itemProduzido: { id: "i9", nome: "Armadura Nebulosa POD" },
  solicitavel: true,
  ativa: true,
  fonte: null,
  limitePorMembro: null,
  limitePeriodoDias: null,
  limiteRestante: null,
  componentes: [
    { id: "c1", item: { id: "f", nome: "Fragmento de Meteorito" }, quantidade: 50, pecaBase: false },
    { id: "c2", item: { id: "a", nome: "Armadura Astral" }, quantidade: 1, pecaBase: true },
  ],
  receitaPeca: null,
  precoVigente: { versao: 1, precoComPeca: 800, precoTrazendoPeca: 500 },
  solicitacoesPendentes: 0,
  disponibilidade: {
    trazendoPeca: 1,
    comPecaDoEstoque: 0,
    faltasTrazendo: [{ itemId: "f", item: "Fragmento de Meteorito", tenho: 60, preciso: 50, falta: 0 }],
    faltasComPeca: [
      { itemId: "f", item: "Fragmento de Meteorito", tenho: 60, preciso: 100, falta: 40 },
      { itemId: "n", item: "Alma de Naght Sieger", tenho: 0, preciso: 5, falta: 5 },
    ],
  },
  ...p,
});

describe("nebula.modelos (D31, D32, briefing §7)", () => {
  it("preço conforme a peça e bloqueios do botão Solicitar", () => {
    const r = pod();
    expect(precoDe(r, true)).toBe(500);
    expect(precoDe(r, false)).toBe(800);
    expect(bloqueioSolicitar(r, true, 500)).toBeNull();
    expect(bloqueioSolicitar(r, true, 499)).toBe("Saldo insuficiente.");
    expect(bloqueioSolicitar(r, false, 5000)).toBe("Falta material no estoque do grupo.");
    expect(
      bloqueioSolicitar(pod({ limitePorMembro: 1, limitePeriodoDias: 30, limiteRestante: 0 }), true, 5000),
    ).toBe("Você atingiu o limite desta Nebula no período.");
  });

  it("abre na modalidade possível: sem a peça no estoque, já começa trazendo a peça", () => {
    expect(trazPecaInicial(pod())).toBeTrue();
    expect(
      trazPecaInicial(pod({ disponibilidade: { ...pod().disponibilidade, comPecaDoEstoque: 1 } })),
    ).toBeFalse();
    expect(nomeDaPeca(pod())).toBe("Armadura Astral");
  });

  it("selo do cartão e percentual da barra", () => {
    expect(seloDaNebulosa(pod())).toEqual({ texto: "Pode solicitar", tom: "acento" });
    expect(seloDaNebulosa(pod({ limiteRestante: 0 })).texto).toBe("Limite atingido");
    const semNada = { ...pod().disponibilidade, trazendoPeca: 0, comPecaDoEstoque: 0 };
    expect(seloDaNebulosa(pod({ disponibilidade: semNada })).texto).toBe("Faltam materiais");
    expect(percentual(60, 50)).toBe(100);
    expect(percentual(1, 3)).toBe(33);
    expect(percentual(0, 0)).toBe(100);
  });

  it("como a peça entra e o motivo da rejeição", () => {
    const s = { trazPeca: false, pecaDoEstoque: "PRONTA" } as SolicitacaoNebula;
    expect(rotuloDaPeca(s)).toBe("peça pronta do estoque");
    expect(rotuloDaPeca({ ...s, pecaDoEstoque: "MATERIAIS" })).toBe("materiais da peça do estoque");
    expect(rotuloDaPeca({ ...s, trazPeca: true })).toBe("traz a peça");
    expect(erroDoMotivo("  ok ")).not.toBeNull();
    expect(erroDoMotivo("Guardião ausente")).toBeNull();
    expect(erroDoMotivo("x".repeat(301))).not.toBeNull();
  });
});
