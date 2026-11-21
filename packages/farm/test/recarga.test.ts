import { describe, expect, it } from "vitest";
import {
  dataDoDia,
  diaDoJogo,
  inicioDaJanelaDeRecarga,
  inicioDoDia,
  rotuloDoDia,
  situacao,
} from "../src/index.js";

/** Instante a partir de um horário de Brasília. */
const br = (s: string) => Date.parse(`${s}-03:00`);
const semana = (ms: number) =>
  ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][dataDoDia(diaDoJogo(ms)).diaSemana];

describe("dia do jogo (D51: reset 04:00 em UTC-3)", () => {
  it("03:59 ainda é o dia anterior; 04:00 já é o novo dia", () => {
    expect(semana(br("2026-11-12T03:59"))).toBe("qua");
    expect(semana(br("2026-11-12T04:00"))).toBe("qui");
    expect(diaDoJogo(br("2026-11-12T04:00")) - diaDoJogo(br("2026-11-12T03:59"))).toBe(1);
  });

  it("o dia começa às 04:00 do servidor", () => {
    const dia = diaDoJogo(br("2026-11-12T15:00"));
    expect(inicioDoDia(dia)).toBe(br("2026-11-12T04:00"));
  });

  it("rótulos relativos", () => {
    const hoje = diaDoJogo(br("2026-11-12T10:00"));
    expect(rotuloDoDia(hoje, hoje)).toBe("hoje");
    expect(rotuloDoDia(hoje + 1, hoje)).toBe("amanhã");
    expect(rotuloDoDia(hoje - 1, hoje)).toBe("ontem");
    expect(rotuloDoDia(hoje + 3, hoje)).toBe("dom 15/11");
  });
});

describe("situação por recarga", () => {
  const feito = br("2026-11-12T10:00"); // quinta

  it("sem check-in: disponível", () => {
    expect(situacao("DIARIA", null, feito)).toEqual({ feita: false, diaFeita: null });
  });

  it("diária: feita até 03:59 do dia seguinte", () => {
    expect(situacao("DIARIA", feito, br("2026-11-13T03:59")).feita).toBe(true);
    expect(situacao("DIARIA", feito, br("2026-11-13T04:00")).feita).toBe(false);
  });

  it("3 dias: feita na quinta libera no domingo às 04:00", () => {
    const s = situacao("TRES_DIAS", feito, br("2026-11-14T22:00"));
    expect(s.feita).toBe(true);
    if (s.feita) expect(rotuloDoDia(s.liberaNoDia, diaDoJogo(feito))).toBe("dom 15/11");
    expect(situacao("TRES_DIAS", feito, br("2026-11-15T03:59")).feita).toBe(true);
    expect(situacao("TRES_DIAS", feito, br("2026-11-15T04:00")).feita).toBe(false);
  });

  it("3 dias: check-in de madrugada conta para o dia anterior", () => {
    // Quinta 02:00 ainda é quarta: libera no sábado.
    expect(situacao("TRES_DIAS", br("2026-11-12T02:00"), br("2026-11-14T04:00")).feita).toBe(false);
  });

  it("semanal: vira na segunda às 04:00", () => {
    expect(situacao("SEMANAL", feito, br("2026-11-16T03:59")).feita).toBe(true);
    expect(situacao("SEMANAL", feito, br("2026-11-16T04:00")).feita).toBe(false);
    // Domingo 03:00 ainda é sábado; segunda 03:00 ainda é domingo (mesma semana).
    expect(situacao("SEMANAL", br("2026-11-09T05:00"), br("2026-11-15T23:00")).feita).toBe(true);
  });

  it("mensal: vira no dia 1 às 04:00", () => {
    expect(situacao("MENSAL", br("2026-11-02T10:00"), br("2026-12-01T03:59")).feita).toBe(true);
    expect(situacao("MENSAL", br("2026-11-02T10:00"), br("2026-12-01T04:00")).feita).toBe(false);
    // Dia 1 às 02:00 ainda é o último dia do mês anterior.
    expect(situacao("MENSAL", br("2026-12-01T02:00"), br("2026-12-05T10:00")).feita).toBe(false);
  });

  it("a janela de busca cobre a semana que começa no mês anterior", () => {
    const agora = br("2026-12-02T10:00"); // quarta, semana começou em 30/11
    expect(inicioDaJanelaDeRecarga(agora)).toBe(diaDoJogo(br("2026-11-30T10:00")));
  });
});
