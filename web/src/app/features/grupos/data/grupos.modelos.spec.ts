import {
  candidatos,
  type ClasseGrupo,
  comReserva,
  comVaga,
  corpoEscala,
  faltamObrigatorias,
  type Grupo,
  indicesDoTipo,
  partidaDe,
  type PersonagemGrupo,
  preenchidas,
  resumoReservas,
  semReserva,
  vagasIniciais,
} from "./grupos.modelos";

export const classesGrupo: ClasseGrupo[] = [
  { id: "c-mtk", nomeOficial: "Mestre Celestial", grupo: "1-1" },
  { id: "c-ani", nomeOficial: "Animista", grupo: "2-2" },
];

export const personagensGrupo: PersonagemGrupo[] = [
  { id: "p-ana", nome: "Ana-MTK", classeId: "c-mtk", jogadorId: "j-ana", jogador: { apelido: "Ana" } },
  { id: "p-ana2", nome: "Ana-Ani", classeId: "c-ani", jogadorId: "j-ana", jogador: { apelido: "Ana" } },
  { id: "p-beto", nome: "Beto-MTK", classeId: "c-mtk", jogadorId: "j-beto", jogador: { apelido: "Beto" } },
];

describe("Regras dos grupos de instância", () => {
  it("reserva a primeira vaga livre e devolve a vaga a livre ao remover, sem mutar", () => {
    const vagas = vagasIniciais();
    const com = comReserva(vagas, "OBRIGATORIA");
    expect(vagas[0]!.tipo).toBe("LIVRE");
    expect(indicesDoTipo(com, "OBRIGATORIA")).toEqual([0]);
    const duas = comReserva(com, "SECUNDARIA");
    expect(indicesDoTipo(duas, "SECUNDARIA")).toEqual([1]);
    const sem = semReserva(comVaga(duas, 0, { classeId: "c-mtk", importancia: 5 }), 0);
    expect(sem[0]).toEqual({ tipo: "LIVRE", classeId: null, importancia: null, personagemId: null });
  });

  it("sem vaga livre, não reserva", () => {
    let vagas = vagasIniciais() as ReturnType<typeof comReserva>;
    for (let i = 0; i < 12; i++) vagas = comReserva(vagas, "SECUNDARIA");
    expect(comReserva(vagas, "OBRIGATORIA")).toBe(vagas);
  });

  it("candidatos: classe da reserva, um personagem por jogador, e o ocupante atual sempre", () => {
    let vagas = comVaga(comReserva(vagasIniciais(), "OBRIGATORIA"), 0, { classeId: "c-mtk", importancia: 5 });
    expect(candidatos(vagas, 0, personagensGrupo).map((p) => p.id)).toEqual(["p-ana", "p-beto"]);
    vagas = comVaga(vagas, 1, { personagemId: "p-ana2" });
    // Ana já está na vaga 2: só o Beto serve na obrigatória.
    expect(candidatos(vagas, 0, personagensGrupo).map((p) => p.id)).toEqual(["p-beto"]);
    // Na vaga livre da Ana: qualquer personagem, inclusive outro da própria Ana.
    expect(candidatos(vagas, 1, personagensGrupo).map((p) => p.id)).toEqual(["p-ana", "p-ana2", "p-beto"]);
    expect(candidatos(vagas, 99, personagensGrupo)).toEqual([]);
  });

  it("conta preenchidas e obrigatórias faltando", () => {
    const vagas = comVaga(comReserva(comReserva(vagasIniciais(), "OBRIGATORIA"), "OBRIGATORIA"), 0, {
      personagemId: "p-ana",
    });
    expect(preenchidas(vagas)).toBe(1);
    expect(faltamObrigatorias(vagas)).toBe(1);
  });

  it("resumo das reservas e partida com o fuso de São Paulo", () => {
    const vagas = comVaga(comReserva(vagasIniciais(), "OBRIGATORIA"), 0, {
      classeId: "c-mtk",
      importancia: 5,
    });
    expect(resumoReservas(vagas, "OBRIGATORIA", classesGrupo)).toBe("Mestre Celestial (importância 5)");
    expect(resumoReservas(vagas, "SECUNDARIA", classesGrupo)).toBe("Nenhuma");
    expect(partidaDe("2026-11-24T20:30")).toBe("2026-11-24T20:30:00-03:00");
    expect(partidaDe("")).toBeNull();
  });

  it("corpo da escala leva a ocupação que a tela viu", () => {
    const g: Grupo = {
      id: "g1",
      instancia: { id: "i", nome: "Torre" },
      agendadoEm: "",
      fechadoEm: null,
      vagas: comVaga(vagasIniciais(), 0, { personagemId: "p-ana" }),
    };
    const novas = comVaga(g.vagas, 1, { personagemId: "p-beto" });
    const corpo = corpoEscala(g, novas, true);
    expect(corpo.fechar).toBeTrue();
    expect(corpo.ocupacaoAnterior.slice(0, 2)).toEqual(["p-ana", null]);
    expect(corpo.vagas).toBe(novas);
  });
});
