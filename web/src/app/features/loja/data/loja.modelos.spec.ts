import {
  compraValida,
  type Compra,
  filtrarPorNome,
  type ItemVitrine,
  maximoComprável,
  maximoDaCompra,
  type Oferta,
  origemCompra,
  podeRetirar,
  seloDoItem,
  textoLimite,
} from "./loja.modelos";

const item = (p: Partial<ItemVitrine> = {}): ItemVitrine => ({
  itemId: "i1",
  nome: "Alma de Naght Sieger",
  tipo: "MATERIAL",
  preco: 100,
  disponivel: 4,
  temConsignado: false,
  limitePorMembro: null,
  limitePeriodoDias: null,
  limiteRestante: null,
  ...p,
});

const oferta = (p: Partial<Oferta>): Oferta => ({
  id: "o1",
  quantidade: 2,
  status: "PENDENTE",
  motivo: null,
  criadaEm: "2026-11-14T20:00:00.000Z",
  analisadaEm: null,
  item: { id: "i1", nome: "Carta Naght Sieger", tipo: "CARTA" },
  jogador: { id: "j1", apelido: "Ana" },
  analisadaPor: null,
  lote: null,
  ...p,
});

describe("Loja: regras", () => {
  it("o máximo comprável respeita o limite restante (D24) e o teto da compra", () => {
    expect(maximoComprável(item())).toBe(4);
    expect(maximoComprável(item({ limitePorMembro: 2, limitePeriodoDias: 7, limiteRestante: 1 }))).toBe(1);
    expect(maximoDaCompra(item({ disponivel: 50_000 }))).toBe(10_000);
    expect(maximoDaCompra(null)).toBe(0);
  });

  it("a compra só vale com quantidade inteira dentro do máximo e total no saldo", () => {
    expect(compraValida(3, 4, 300, 350)).toBeTrue();
    expect(compraValida(4, 4, 400, 350)).toBeFalse();
    expect(compraValida(5, 4, 500, 1000)).toBeFalse();
    expect(compraValida(0, 4, 0, 350)).toBeFalse();
    expect(compraValida(1.5, 4, 150, 350)).toBeFalse();
    expect(compraValida(1, 4, 100, null)).toBeFalse();
  });

  it("filtra pelo nome sem diferenciar maiúsculas", () => {
    const itens = [{ nome: "Alma de Betelgeuse" }, { nome: "Pó de Meteorito" }];
    expect(filtrarPorNome(itens, "  ALMA ")).toEqual([{ nome: "Alma de Betelgeuse" }]);
    expect(filtrarPorNome(itens, "")).toEqual(itens);
  });

  it("selos e textos do cartão", () => {
    expect(seloDoItem(item({ disponivel: 0 }))?.texto).toBe("Indisponível");
    expect(seloDoItem(item({ limiteRestante: 0, limitePorMembro: 1, limitePeriodoDias: 7 }))?.texto).toBe(
      "Limite atingido",
    );
    expect(seloDoItem(item({ temConsignado: true }))?.texto).toBe("Consignado");
    expect(seloDoItem(item({ disponivel: 2 }))?.texto).toBe("Últimas unidades");
    expect(seloDoItem(item({ disponivel: 10 }))).toBeNull();
    expect(textoLimite(item({ limitePorMembro: 2, limitePeriodoDias: 7, limiteRestante: 1 }))).toBe(
      "2 a cada 7 dia(s) · restam 1",
    );
  });

  it("origem da compra para a fila do admin", () => {
    const c = {
      lotes: [
        { quantidade: 1, valorVendedor: 0, lote: { ordem: 1, origem: "MANUAL", dono: null } },
        { quantidade: 2, valorVendedor: 200, lote: { ordem: 2, origem: "OFERTA", dono: { apelido: "Ana" } } },
      ],
    } as unknown as Compra;
    expect(origemCompra(c)).toBe("Grupo + Ana");
  });

  it("só pendente ou à venda pode ser retirada (D25)", () => {
    expect(podeRetirar(oferta({ status: "PENDENTE" }))).toBe(true);
    expect(podeRetirar(oferta({ status: "APROVADA" }))).toBe(true);
    for (const status of ["ESGOTADA", "REJEITADA", "RETIRADA", "RETIRADA_SOLICITADA"] as const) {
      expect(podeRetirar(oferta({ status }))).toBe(false);
    }
  });
});
