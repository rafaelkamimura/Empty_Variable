import type { AtributosBuild, ItemEquipamento } from "../../../shared/dominio/build";
import {
  aplicarBuild,
  corpoDaFicha,
  erroDoMotivo,
  type Ficha,
  fichaDaSolicitacao,
  fichaValida,
  novaFicha,
  resumoDaImportacao,
  type Solicitacao,
  tituloDoSlot,
} from "./vinculo.modelos";

const ARMA: ItemEquipamento = { id: 600020, nome: "Espada de Duas Mãos", refino: 12, grau: "A" };
const ATRIBUTOS: AtributosBuild = { nivelClasse: 60, base: { str: 142 } };
const catalogo = (slot: string, id: number) =>
  slot === "arma" && id === 540031 ? "Livro Feiticeiro do Éden" : null;

describe("vinculo.modelos (D55, D57)", () => {
  it("aplica a build: classe e nível só se vierem, nomes pelo catálogo e equipamentos substituídos", () => {
    const ficha: Ficha = {
      ...novaFicha(),
      nome: "Nova",
      equipamentos: { topo: { id: 5011, nome: "Antena" } },
    };
    const nova = aplicarBuild(
      ficha,
      {
        classeId: "feiticeiro",
        classeNome: "Feiticeiro",
        nivelBase: 105,
        equipamentos: {
          arma: { id: 540031, nome: "Nome da Divine Pride" },
          escudo: { id: 28901, nome: "Coelho Macabro" },
          capa: { id: 20940, nome: null },
        },
      },
      catalogo,
    );
    expect(nova.classeId).toBe("feiticeiro");
    expect(nova.nivelBase).toBe(105);
    expect(nova.equipamentos).toEqual({
      arma: { id: 540031, nome: "Livro Feiticeiro do Éden" },
      escudo: { id: 28901, nome: "Coelho Macabro" },
      capa: { id: 20940, nome: "Item 20940" },
    });
    expect(ficha.equipamentos).toEqual({ topo: { id: 5011, nome: "Antena" } });
  });

  it("build sem classe nem nível mantém os da ficha; atributos entram ou saem com a build", () => {
    const ficha: Ficha = { ...novaFicha(), classeId: "rg", nivelBase: 200, atributos: ATRIBUTOS };
    const sem = aplicarBuild(
      ficha,
      { classeId: null, classeNome: "Feiticeiro", nivelBase: null, equipamentos: {} },
      catalogo,
    );
    expect(sem).toEqual({ ...novaFicha(), classeId: "rg", nivelBase: 200 });
    const com = aplicarBuild(
      ficha,
      {
        classeId: null,
        classeNome: null,
        nivelBase: 250,
        equipamentos: { arma: ARMA },
        atributos: ATRIBUTOS,
      },
      () => null,
    );
    expect(com.atributos).toEqual(ATRIBUTOS);
    expect(com.equipamentos).toEqual({ arma: ARMA });
  });

  it("resumo da importação diz o que entrou e o que falta", () => {
    expect(
      resumoDaImportacao({ classeId: "f", classeNome: "Feiticeiro", nivelBase: 105, equipamentos: {} }, 3),
    ).toBe("Build importada: Feiticeiro, nível 105, 3 equipamentos. Revise e salve.");
    expect(
      resumoDaImportacao({ classeId: null, classeNome: "Feiticeiro", nivelBase: null, equipamentos: {} }, 1),
    ).toContain("A classe Feiticeiro não está cadastrada no grupo");
  });

  it("validação, corpo enviado, título do slot e motivo", () => {
    expect(fichaValida({ ...novaFicha(), nome: "A", classeId: "x", nivelBase: 250 })).toBeTrue();
    expect(fichaValida({ ...novaFicha(), nome: "A", classeId: "x", nivelBase: 251 })).toBeFalse();
    expect(fichaValida({ ...novaFicha(), nome: " ", classeId: "x", nivelBase: 1 })).toBeFalse();
    expect(corpoDaFicha({ ...novaFicha(), nome: "  Nova-RG " })).toEqual({
      ...novaFicha(),
      nome: "Nova-RG",
      atributos: {},
    });
    expect(tituloDoSlot(ARMA)).toBe("Espada de Duas Mãos · +12 · Grau A");
    expect(tituloDoSlot("Antena antiga")).toBe("Antena antiga");
    expect(tituloDoSlot(undefined)).toBeNull();
    expect(erroDoMotivo("ab")).not.toBeNull();
    expect(erroDoMotivo("Personagem errado")).toBeNull();
  });

  it("ficha da solicitação pelo nome, ou só com o nome quando ainda não tem ficha", () => {
    const pedido = {
      fichas: [{ nome: "Nova-RG", classeId: "rg", nivelBase: 200, build: null, equipamentos: {} }],
    } as unknown as Solicitacao;
    expect(fichaDaSolicitacao(pedido, "Nova-RG")).toEqual({
      ...novaFicha(),
      nome: "Nova-RG",
      classeId: "rg",
      nivelBase: 200,
    });
    expect(fichaDaSolicitacao(pedido, "Outra")).toEqual({ ...novaFicha(), nome: "Outra" });
  });
});
