import { comReserva, comVaga } from "./grupos.modelos";
import { campoGrupo, corpoNovoGrupo, novoRascunhoGrupo, pendenciasGrupo } from "./novo-grupo.modelos";

const agora = Date.parse("2026-11-23T12:00:00-03:00");

describe("Assistente de grupo novo", () => {
  it("cada passo aponta o campo pendente", () => {
    const r = { ...novoRascunhoGrupo(), vagas: comReserva(novoRascunhoGrupo().vagas, "OBRIGATORIA") };
    const p = pendenciasGrupo(r, agora);
    expect(p.instancia).toEqual([{ campo: campoGrupo.instancia, mensagem: "Escolha a instância." }]);
    expect(p.obrigatorias.map((x) => x.campo)).toEqual([campoGrupo.classe(0), campoGrupo.importancia(0)]);
    expect(p.obrigatorias[0]!.contexto).toBe("Reserva 1");
    expect(p.secundarias).toEqual([]);
    expect(p.horario).toEqual([{ campo: campoGrupo.horario, mensagem: "Informe a data e a hora." }]);
  });

  it("a partida precisa ser no futuro", () => {
    const r = { ...novoRascunhoGrupo(), instanciaId: "i", horario: "2026-11-23T11:00" };
    expect(pendenciasGrupo(r, agora).horario[0]!.mensagem).toBe("Escolha uma data e hora no futuro.");
    expect(pendenciasGrupo({ ...r, horario: "2026-11-24T20:30" }, agora).horario).toEqual([]);
  });

  it("monta o corpo com as 12 vagas e a partida com fuso", () => {
    const vagas = comVaga(comReserva(novoRascunhoGrupo().vagas, "SECUNDARIA"), 0, {
      classeId: "c",
      importancia: 2,
    });
    const corpo = corpoNovoGrupo({ instanciaId: "i", horario: "2026-11-24T20:30", vagas });
    expect(corpo).toEqual({ instanciaId: "i", agendadoEm: "2026-11-24T20:30:00-03:00", vagas });
    expect(corpo.vagas.length).toBe(12);
  });
});
