import { diaDoJogo, diaDoMes, dataDoDia, inicioDaSemana } from "./tempo.js";

/** D51: quando a instância pode ser feita de novo. */
export const RECARGAS = ["DIARIA", "TRES_DIAS", "SEMANAL", "MENSAL"] as const;
export type Recarga = (typeof RECARGAS)[number];

export const ROTULO_RECARGA: Record<Recarga, string> = {
  DIARIA: "Diária",
  TRES_DIAS: "A cada 3 dias",
  SEMANAL: "Semanal",
  MENSAL: "Mensal",
};

export function ehRecarga(valor: unknown): valor is Recarga {
  return typeof valor === "string" && (RECARGAS as readonly string[]).includes(valor);
}

export interface Ciclo {
  /** Primeiro dia do ciclo que contém o dia de referência. */
  inicio: number;
  /** Dia em que o próximo ciclo começa (a instância libera às 04:00 desse dia). */
  proximo: number;
}

/** Ciclo de calendário das recargas fixas. A de 3 dias depende do último check-in, não do calendário. */
export function cicloDoCalendario(recarga: Exclude<Recarga, "TRES_DIAS">, hoje: number): Ciclo {
  if (recarga === "DIARIA") return { inicio: hoje, proximo: hoje + 1 };
  if (recarga === "SEMANAL") {
    const inicio = inicioDaSemana(hoje);
    return { inicio, proximo: inicio + 7 };
  }
  const { ano, mes } = dataDoDia(hoje);
  return { inicio: diaDoMes(ano, mes), proximo: diaDoMes(ano, mes + 1) };
}

export type Situacao =
  { feita: true; diaFeita: number; liberaNoDia: number } | { feita: false; diaFeita: number | null };

/**
 * Situação da instância para um personagem, dado o instante do último check-in (ou null).
 * - Diária: libera no dia seguinte.
 * - 3 dias: libera no dia do check-in + 3 (feita na quinta, libera no domingo).
 * - Semanal: libera na segunda-feira seguinte.
 * - Mensal: libera no dia 1 do mês seguinte.
 */
export function situacao(recarga: Recarga, ultimoCheckinMs: number | null, agoraMs: number): Situacao {
  const hoje = diaDoJogo(agoraMs);
  if (ultimoCheckinMs === null) return { feita: false, diaFeita: null };
  const diaFeita = diaDoJogo(ultimoCheckinMs);
  if (recarga === "TRES_DIAS") {
    const liberaNoDia = diaFeita + 3;
    return hoje < liberaNoDia ? { feita: true, diaFeita, liberaNoDia } : { feita: false, diaFeita };
  }
  const ciclo = cicloDoCalendario(recarga, hoje);
  return diaFeita >= ciclo.inicio
    ? { feita: true, diaFeita, liberaNoDia: ciclo.proximo }
    : { feita: false, diaFeita };
}

/** Mais antigo instante cujo check-in ainda pode bloquear uma instância hoje (para buscar só o necessário). */
export function inicioDaJanelaDeRecarga(agoraMs: number): number {
  const hoje = diaDoJogo(agoraMs);
  const { ano, mes } = dataDoDia(hoje);
  // O ciclo mais longo é o mês; a semana pode começar no mês anterior; 3 dias olha até 2 dias atrás.
  return Math.min(diaDoMes(ano, mes), inicioDaSemana(hoje), hoje - 2);
}
