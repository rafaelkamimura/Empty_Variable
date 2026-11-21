import { diaDoJogo, inicioDoDia } from "@betel/farm";
import {
  type CheckinFarm,
  checkinsDoDia,
  dropsDoRascunho,
  type InstanciaFarm,
  itensDoEditor,
  MAXIMO_POR_DROP,
  nomesDosDrops,
  quantidadeDoTexto,
  situacaoDoPersonagem,
  textoDosDrops,
  valorDosDrops,
} from "./farm.modelos";

const hoje = diaDoJogo(Date.parse("2026-11-20T15:00:00.000Z"));
const agora = inicioDoDia(hoje) + 3_600_000;
const inst = (x: Partial<InstanciaFarm> = {}): InstanciaFarm => ({
  id: "i1",
  nome: "Cripta",
  recarga: "DIARIA",
  instanciaId: null,
  personagemIds: ["p1"],
  drops: ["a", "b"],
  ...x,
});
const checkin = (x: Partial<CheckinFarm> = {}): CheckinFarm => ({
  id: "c1",
  personagemId: "p1",
  farmInstanciaId: "i1",
  nomeInstancia: "Cripta",
  feitoEm: new Date(agora - 60_000).toISOString(),
  drops: [{ farmItemId: "a", nome: "Oridecon", quantidade: 2 }],
  ...x,
});

describe("farm.modelos", () => {
  it("situação: feita hoje traz o check-in; de ontem (diária) volta a ficar disponível", () => {
    const s = situacaoDoPersonagem([checkin()], "p1", inst(), agora);
    expect(s.feita).toBeTrue();
    expect(s.checkin?.id).toBe("c1");
    const ontem = checkin({ feitoEm: new Date(agora - 86_400_000).toISOString() });
    const d = situacaoDoPersonagem([ontem], "p1", inst(), agora);
    expect(d.feita).toBeFalse();
    expect(d.checkin).toBeNull();
    expect(d.diaFeita).toBe(hoje - 1);
  });

  it("situação: o check-in de outro personagem não conta", () => {
    expect(situacaoDoPersonagem([checkin({ personagemId: "p2" })], "p1", inst(), agora).feita).toBeFalse();
  });

  it("check-ins do dia e valor dos drops (itens sem preço valem 0)", () => {
    const lista = [checkin(), checkin({ id: "c2", feitoEm: new Date(agora - 2 * 86_400_000).toISOString() })];
    expect(checkinsDoDia(lista, hoje).map((c) => c.id)).toEqual(["c1"]);
    const preco = (id: string) => (id === "a" ? 1_500_000 : null);
    expect(
      valorDosDrops(
        [
          { farmItemId: "a", quantidade: 2 },
          { farmItemId: "b", quantidade: 5 },
        ],
        preco,
      ),
    ).toBe(3_000_000);
  });

  it("textos dos drops", () => {
    expect(textoDosDrops(checkin())).toBe("Oridecon ×2");
    expect(textoDosDrops(checkin({ drops: [] }))).toBe("Sem drops registrados");
    const porId = new Map([["a", { id: "a", nome: "Oridecon", idJogo: 984, precoZeny: null }]]);
    expect(nomesDosDrops(inst(), porId)).toBe("Oridecon");
    expect(nomesDosDrops(inst({ drops: [] }), porId)).toBe("Sem itens cadastrados");
  });

  it("itens do editor juntam instância, check-in em edição e extras, sem repetir", () => {
    const c = checkin({ drops: [{ farmItemId: "x", nome: "X", quantidade: 1 }] });
    expect(itensDoEditor(inst(), c, ["a", "y"])).toEqual(["a", "b", "x", "y"]);
  });

  it("quantidade: vazio/inválido é 0, negativo é 0 e há um teto", () => {
    expect(quantidadeDoTexto(undefined)).toBe(0);
    expect(quantidadeDoTexto("abc")).toBe(0);
    expect(quantidadeDoTexto("-3")).toBe(0);
    expect(quantidadeDoTexto("7")).toBe(7);
    expect(quantidadeDoTexto("99999999")).toBe(MAXIMO_POR_DROP);
    expect(dropsDoRascunho(["a", "b", "c"], { a: "2", b: "0" })).toEqual([
      { farmItemId: "a", quantidade: 2 },
    ]);
  });
});
