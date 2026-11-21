/**
 * Calendário do servidor (D51): horário de Brasília (UTC-3, sem horário de verão) com o dia virando
 * às 04:00. Um "dia do jogo" é um inteiro: o número de dias desde 01/01/1970 contados a partir das
 * 04:00. Assim 03:59 de quinta ainda é quarta, e 04:00 já é quinta.
 */

export const HORA_MS = 3_600_000;
export const DIA_MS = 86_400_000;
/** 04:00 em UTC-3 é 07:00 em UTC. */
export const DESLOCAMENTO_RESET_MS = 7 * HORA_MS;
/** O servidor fica em UTC-3. */
export const FUSO_SERVIDOR_MS = -3 * HORA_MS;

export const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;
export const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

/** Dia do jogo em que cai o instante (ms desde a época). */
export function diaDoJogo(instanteMs: number): number {
  return Math.floor((instanteMs - DESLOCAMENTO_RESET_MS) / DIA_MS);
}

/** Instante (ms) em que o dia do jogo começa: 04:00 do servidor. */
export function inicioDoDia(dia: number): number {
  return dia * DIA_MS + DESLOCAMENTO_RESET_MS;
}

export interface DataDoDia {
  ano: number;
  /** 0 = janeiro. */
  mes: number;
  dia: number;
  /** 0 = domingo. */
  diaSemana: number;
}

/** Data de calendário do dia do jogo (a data de quem joga depois das 04:00). */
export function dataDoDia(dia: number): DataDoDia {
  const d = new Date(dia * DIA_MS);
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth(), dia: d.getUTCDate(), diaSemana: d.getUTCDay() };
}

/** Primeiro dia da semana (segunda-feira) que contém o dia. */
export function inicioDaSemana(dia: number): number {
  return dia - ((dataDoDia(dia).diaSemana + 6) % 7);
}

/** Dia do jogo que é o dia 1 do mês (mes pode passar de 11 ou ser negativo). */
export function diaDoMes(ano: number, mes: number): number {
  return Math.floor(Date.UTC(ano, mes, 1) / DIA_MS);
}

/** Primeiro dia do mês que contém o dia. */
export function inicioDoMes(dia: number): number {
  const { ano, mes } = dataDoDia(dia);
  return diaDoMes(ano, mes);
}

const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** "12/11" */
export function diaMes(dia: number): string {
  const d = dataDoDia(dia);
  return `${doisDigitos(d.dia)}/${doisDigitos(d.mes + 1)}`;
}

/** "14:32" no horário do servidor. */
export function horaDoServidor(instanteMs: number): string {
  const d = new Date(instanteMs + FUSO_SERVIDOR_MS);
  return `${doisDigitos(d.getUTCHours())}:${doisDigitos(d.getUTCMinutes())}`;
}

/** "hoje", "ontem", "amanhã" ou "qui 12/11", relativo ao dia de referência. */
export function rotuloDoDia(dia: number, hoje: number): string {
  if (dia === hoje) return "hoje";
  if (dia === hoje - 1) return "ontem";
  if (dia === hoje + 1) return "amanhã";
  return `${DIAS_SEMANA[dataDoDia(dia).diaSemana]} ${diaMes(dia)}`;
}
