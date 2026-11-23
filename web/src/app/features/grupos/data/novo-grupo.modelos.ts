// Assistente de criação de grupo em passos: o rascunho e as pendências de cada passo, campo a campo.
import type { Pendencia, PendenciasPorPasso } from "../../../shared/utils/pendencias";
import { indicesDoTipo, partidaDe, type TipoReserva, type Vaga, vagasIniciais } from "./grupos.modelos";

export type PassoGrupo = "instancia" | "obrigatorias" | "secundarias" | "horario";
export const PASSOS_GRUPO: readonly PassoGrupo[] = ["instancia", "obrigatorias", "secundarias", "horario"];

export interface RascunhoGrupo {
  readonly instanciaId: string;
  /** datetime-local, no horário de São Paulo. */
  readonly horario: string;
  readonly vagas: readonly Vaga[];
}

export const novoRascunhoGrupo = (): RascunhoGrupo => ({
  instanciaId: "",
  horario: "",
  vagas: vagasIniciais(),
});

/** Ids dos campos (atributo `data-campo`). As reservas usam o índice da vaga na escala de 12. */
export const campoGrupo = {
  instancia: "grupo.instanciaId",
  horario: "grupo.horario",
  classe: (i: number) => `vagas.${i}.classeId`,
  importancia: (i: number) => `vagas.${i}.importancia`,
};

export function pendenciasGrupo(r: RascunhoGrupo, agora: number): PendenciasPorPasso<PassoGrupo> {
  const horario: Pendencia[] = [];
  const partida = partidaDe(r.horario);
  if (partida === null) horario.push({ campo: campoGrupo.horario, mensagem: "Informe a data e a hora." });
  else if (Date.parse(partida) <= agora)
    horario.push({ campo: campoGrupo.horario, mensagem: "Escolha uma data e hora no futuro." });
  return {
    instancia: r.instanciaId ? [] : [{ campo: campoGrupo.instancia, mensagem: "Escolha a instância." }],
    obrigatorias: pendenciasReservas(r.vagas, "OBRIGATORIA"),
    secundarias: pendenciasReservas(r.vagas, "SECUNDARIA"),
    horario,
  };
}

function pendenciasReservas(vagas: readonly Vaga[], tipo: TipoReserva): Pendencia[] {
  return indicesDoTipo(vagas, tipo).flatMap((i, n) => {
    const v = vagas[i];
    if (v === undefined) return [];
    const contexto = `Reserva ${n + 1}`;
    const lista: Pendencia[] = [];
    if (v.classeId === null)
      lista.push({ campo: campoGrupo.classe(i), mensagem: "Escolha a classe.", contexto });
    if (v.importancia === null)
      lista.push({ campo: campoGrupo.importancia(i), mensagem: "Escolha a importância.", contexto });
    return lista;
  });
}

/** Corpo do POST /api/gestao/grupos. */
export function corpoNovoGrupo(r: RascunhoGrupo) {
  return { instanciaId: r.instanciaId, agendadoEm: partidaDe(r.horario), vagas: r.vagas };
}
