import type { VersaoParametros } from "../../../shared/dominio/cadastros";
import {
  credoresDe,
  destinoDoRegistro,
  instanciaInicial,
  nomeDoParticipante,
  sugestoesPorCategoria,
  textoTeto,
} from "./assistente-run.modelos";
import type { RascunhoNag4eyes } from "./nag4eyes.modelos";
import { cat, torre } from "./runs.modelos.spec";
import { novoParticipante } from "./runs.modelos";

const v = {
  pctEssencialBp: 2000,
  pctImportanteBp: 1000,
  pctComplementarBp: 500,
  tetoCredoresBp: 5000,
} as VersaoParametros;

describe("Regras do assistente de run", () => {
  it("textos dos percentuais e do teto", () => {
    expect(sugestoesPorCategoria(v)).toEqual({ ESSENCIAL: "20%", IMPORTANTE: "10%", COMPLEMENTAR: "5%" });
    expect(textoTeto(v)).toBe("50%");
    expect(sugestoesPorCategoria(null).ESSENCIAL).toBe("");
  });

  it("nome do participante e credores sem o dono do personagem (C3)", () => {
    const p = { ...novoParticipante(), personagemId: "p-ana2" };
    expect(nomeDoParticipante(cat.jogadores, p)).toBe("Ana-Magus (Ana)");
    expect(nomeDoParticipante(cat.jogadores, novoParticipante())).toBe("Participante sem personagem");
    expect(credoresDe(cat.jogadores, p).map((j) => j.apelido)).toEqual(["Beto", "X", "Y"]);
  });

  it("instância inicial: a do rascunho, depois a Torre, depois a primeira", () => {
    const outra = { ...torre, id: "i-outra", codigo: "OUTRA" };
    const origem = { instancia: { id: "i-outra", nome: "Outra" } } as RascunhoNag4eyes;
    expect(instanciaInicial([torre, outra], origem)?.id).toBe("i-outra");
    expect(instanciaInicial([outra, torre], null)?.id).toBe("i-torre");
    expect(instanciaInicial([outra], null)?.id).toBe("i-outra");
    expect(instanciaInicial([], null)).toBeUndefined();
  });

  it("destino: correção tem prioridade sobre o rascunho", () => {
    const origem = { id: "r-1" } as RascunhoNag4eyes;
    expect(destinoDoRegistro("run-1", "  erro de rank ", origem)).toEqual({
      tipo: "correcao",
      runId: "run-1",
      motivo: "erro de rank",
    });
    expect(destinoDoRegistro(null, "", origem)).toEqual({ tipo: "rascunho", rascunhoId: "r-1" });
    expect(destinoDoRegistro(null, "", null)).toEqual({ tipo: "nova" });
  });
});
