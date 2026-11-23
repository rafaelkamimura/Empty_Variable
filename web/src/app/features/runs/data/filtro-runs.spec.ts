import { enderecoDaLista, mesmoFiltro, paramsDoFiltro } from "./filtro-runs";

const vazio = { dataDe: "", dataAte: "", instanciaId: "", status: "" };

describe("Filtros da lista de runs", () => {
  it("vazios saem da URL", () => {
    expect(paramsDoFiltro({ ...vazio, status: "ESTORNADA" })).toEqual({
      dataDe: null,
      dataAte: null,
      instanciaId: null,
      status: "ESTORNADA",
    });
  });

  it("compara os quatro campos", () => {
    expect(mesmoFiltro(vazio, { ...vazio })).toBeTrue();
    expect(mesmoFiltro(vazio, { ...vazio, dataDe: "2026-11-01" })).toBeFalse();
  });

  it("endereço da lista: só aceita caminhos da própria lista", () => {
    expect(enderecoDaLista({ lista: "/gestao/runs?status=ESTORNADA" })).toBe("/gestao/runs?status=ESTORNADA");
    expect(enderecoDaLista({ lista: "https://fora.example" })).toBe("/gestao/runs");
    expect(enderecoDaLista(null)).toBe("/gestao/runs");
  });
});
