import { DIAS_SEMANA, MESES, dataDoDia, diaDoMes, diaMes, inicioDaSemana, inicioDoDia } from "./tempo.js";

export const MODOS_PERIODO = ["dia", "semana", "mes"] as const;
export type ModoPeriodo = (typeof MODOS_PERIODO)[number];

export interface Periodo {
  /** Primeiro dia do jogo do período. */
  inicioDia: number;
  /** Primeiro dia depois do período (exclusivo). */
  fimDia: number;
  /** Instantes (ms) correspondentes, para consultar check-ins: [inicioMs, fimMs). */
  inicioMs: number;
  fimMs: number;
  rotulo: string;
}

/**
 * Período de totais que contém o dia de referência, deslocado `deslocamento` períodos para trás
 * (negativo) ou para frente. A semana começa na segunda; o mês, no dia 1 (D51).
 */
export function periodo(modo: ModoPeriodo, hoje: number, deslocamento = 0): Periodo {
  let inicioDia: number;
  let fimDia: number;
  let rotulo: string;
  if (modo === "dia") {
    inicioDia = hoje + deslocamento;
    fimDia = inicioDia + 1;
    const d = dataDoDia(inicioDia);
    rotulo = `${DIAS_SEMANA[d.diaSemana]}, ${diaMes(inicioDia)}/${d.ano}`;
  } else if (modo === "semana") {
    inicioDia = inicioDaSemana(hoje) + 7 * deslocamento;
    fimDia = inicioDia + 7;
    rotulo = `${diaMes(inicioDia)} – ${diaMes(fimDia - 1)}`;
  } else {
    const { ano, mes } = dataDoDia(hoje);
    inicioDia = diaDoMes(ano, mes + deslocamento);
    fimDia = diaDoMes(ano, mes + deslocamento + 1);
    const d = dataDoDia(inicioDia);
    rotulo = `${MESES[d.mes]} ${d.ano}`;
  }
  return { inicioDia, fimDia, inicioMs: inicioDoDia(inicioDia), fimMs: inicioDoDia(fimDia), rotulo };
}
