import {
  campoGrupo,
  comNovaReserva,
  comReserva,
  corpoNovoGrupo,
  novoRascunhoGrupo,
  pendenciasGrupo,
  type RascunhoGrupo,
  reservasDoTipo,
  semReserva,
  vagasDoRascunho,
  vagasLivres,
} from "./novo-grupo.modelos";

const agora = Date.parse("2026-11-23T12:00:00-03:00");
const comTres = (): RascunhoGrupo =>
  comNovaReserva(
    comNovaReserva(comNovaReserva(novoRascunhoGrupo(), "OBRIGATORIA"), "OBRIGATORIA"),
    "OBRIGATORIA",
  );

describe("Assistente de grupo novo", () => {
  it("cada passo aponta o campo pendente, pela chave da reserva", () => {
    const r = comNovaReserva(novoRascunhoGrupo(), "OBRIGATORIA");
    const chave = r.reservas[0]!.chave;
    const p = pendenciasGrupo(r, agora);
    expect(p.instancia).toEqual([{ campo: campoGrupo.instancia, mensagem: "Escolha a instância." }]);
    expect(p.obrigatorias.map((x) => x.campo)).toEqual([
      campoGrupo.classe(chave),
      campoGrupo.importancia(chave),
    ]);
    expect(p.obrigatorias[0]!.contexto).toBe("Reserva 1");
    expect(p.secundarias).toEqual([]);
    expect(p.horario).toEqual([{ campo: campoGrupo.horario, mensagem: "Informe a data e a hora." }]);
  });

  it("remover do meio e adicionar: a nova vai para o fim, com chave nova e campos próprios", () => {
    const r = comTres();
    const [a, b, c] = r.reservas.map((x) => x.chave);
    const depois = comNovaReserva(semReserva(r, b!), "OBRIGATORIA");
    const chaves = reservasDoTipo(depois, "OBRIGATORIA").map((x) => x.chave);
    expect(chaves.slice(0, 2)).toEqual([a!, c!]);
    expect(chaves[2]).not.toBe(b);
    expect(new Set(chaves).size).toBe(3);
    expect(campoGrupo.classe(chaves[2]!)).not.toBe(campoGrupo.classe(b!));
  });

  it("uma obrigatória removida e uma secundária adicionada não compartilham campos", () => {
    const r = comNovaReserva(novoRascunhoGrupo(), "OBRIGATORIA");
    const removida = r.reservas[0]!.chave;
    const s = comNovaReserva(semReserva(r, removida), "SECUNDARIA");
    expect(s.reservas[0]!.chave).not.toBe(removida);
  });

  it("no máximo 12 reservas; as vagas saem obrigatórias, secundárias e o resto livre", () => {
    let r = comNovaReserva(novoRascunhoGrupo(), "SECUNDARIA");
    r = comNovaReserva(r, "OBRIGATORIA");
    r = comReserva(r, r.reservas[1]!.chave, { classeId: "c", importancia: 5 });
    const vagas = vagasDoRascunho(r);
    expect(vagas.length).toBe(12);
    expect(vagas.slice(0, 3).map((v) => v.tipo)).toEqual(["OBRIGATORIA", "SECUNDARIA", "LIVRE"]);
    expect(vagas[0]).toEqual({ tipo: "OBRIGATORIA", classeId: "c", importancia: 5, personagemId: null });
    for (let i = 0; i < 20; i++) r = comNovaReserva(r, "SECUNDARIA");
    expect(r.reservas.length).toBe(12);
    expect(vagasLivres(r)).toBe(0);
  });

  it("a partida precisa ser no futuro", () => {
    const r = { ...novoRascunhoGrupo(), instanciaId: "i", horario: "2026-11-23T11:00" };
    expect(pendenciasGrupo(r, agora).horario[0]!.mensagem).toBe("Escolha uma data e hora no futuro.");
    expect(pendenciasGrupo({ ...r, horario: "2026-11-24T20:30" }, agora).horario).toEqual([]);
  });

  it("o corpo leva as 12 vagas e a partida com fuso, e nenhuma chave das reservas", () => {
    const r = { ...comTres(), instanciaId: "i", horario: "2026-11-24T20:30" };
    const corpo = corpoNovoGrupo(r);
    expect(corpo.instanciaId).toBe("i");
    expect(corpo.agendadoEm).toBe("2026-11-24T20:30:00-03:00");
    expect(corpo.vagas.length).toBe(12);
    const json = JSON.stringify(corpo);
    expect(json).not.toContain("chave");
    for (const x of r.reservas) expect(json).not.toContain(x.chave);
  });
});
