// Assistente de criação de grupo em passos: o rascunho e as pendências de cada passo, campo a campo.
// As reservas ficam numa lista na ordem em que foram adicionadas, cada uma com uma chave estável;
// as 12 vagas do corpo são montadas só no envio (obrigatórias, secundárias e o resto livre).
import type { Pendencia, PendenciasPorPasso } from "../../../shared/utils/pendencias";
import { partidaDe, TOTAL_VAGAS, type TipoReserva, type Vaga, vagaLivre } from "./grupos.modelos";

export type PassoGrupo = "instancia" | "obrigatorias" | "secundarias" | "horario";
export const PASSOS_GRUPO: readonly PassoGrupo[] = ["instancia", "obrigatorias", "secundarias", "horario"];

export interface ReservaRascunho {
  /** Identidade da reserva na tela (track, foco e ids de campo). Só existe no front: não vai para a API. */
  readonly chave: string;
  readonly tipo: TipoReserva;
  readonly classeId: string | null;
  /** 1 a 5. */
  readonly importancia: number | null;
}

export interface RascunhoGrupo {
  readonly instanciaId: string;
  /** datetime-local, no horário de São Paulo. */
  readonly horario: string;
  /** Na ordem em que foram adicionadas. */
  readonly reservas: readonly ReservaRascunho[];
}

export const novoRascunhoGrupo = (): RascunhoGrupo => ({ instanciaId: "", horario: "", reservas: [] });

let sequencia = 0;

/** Chave única de uma reserva. */
export function novaChave(): string {
  // randomUUID só existe em contexto seguro (https ou localhost); fora dele, um contador basta.
  return globalThis.crypto?.randomUUID?.() ?? `reserva-${Date.now()}-${++sequencia}`;
}

/** Ids dos campos (atributo `data-campo`). As reservas usam a chave, nunca a posição. */
export const campoGrupo = {
  instancia: "grupo.instanciaId",
  horario: "grupo.horario",
  classe: (chave: string) => `reservas.${chave}.classeId`,
  importancia: (chave: string) => `reservas.${chave}.importancia`,
};

export const reservasDoTipo = (r: RascunhoGrupo, tipo: TipoReserva): readonly ReservaRascunho[] =>
  r.reservas.filter((x) => x.tipo === tipo);

export const vagasLivres = (r: RascunhoGrupo): number => TOTAL_VAGAS - r.reservas.length;

/** Acrescenta uma reserva no fim da lista; sem vaga livre, não muda nada. */
export function comNovaReserva(r: RascunhoGrupo, tipo: TipoReserva): RascunhoGrupo {
  if (vagasLivres(r) <= 0) return r;
  return { ...r, reservas: [...r.reservas, { chave: novaChave(), tipo, classeId: null, importancia: null }] };
}

export function comReserva(r: RascunhoGrupo, chave: string, parte: Partial<ReservaRascunho>): RascunhoGrupo {
  return { ...r, reservas: r.reservas.map((x) => (x.chave === chave ? { ...x, ...parte, chave } : x)) };
}

export function semReserva(r: RascunhoGrupo, chave: string): RascunhoGrupo {
  return { ...r, reservas: r.reservas.filter((x) => x.chave !== chave) };
}

/** As 12 vagas do grupo: obrigatórias, secundárias (cada tipo na ordem de inclusão) e livres. */
export function vagasDoRascunho(r: RascunhoGrupo): Vaga[] {
  const reservas = [...reservasDoTipo(r, "OBRIGATORIA"), ...reservasDoTipo(r, "SECUNDARIA")].map(
    (x): Vaga => ({ tipo: x.tipo, classeId: x.classeId, importancia: x.importancia, personagemId: null }),
  );
  return [...reservas, ...Array.from({ length: TOTAL_VAGAS - reservas.length }, vagaLivre)];
}

export function pendenciasGrupo(r: RascunhoGrupo, agora: number): PendenciasPorPasso<PassoGrupo> {
  const horario: Pendencia[] = [];
  const partida = partidaDe(r.horario);
  if (partida === null) horario.push({ campo: campoGrupo.horario, mensagem: "Informe a data e a hora." });
  else if (Date.parse(partida) <= agora)
    horario.push({ campo: campoGrupo.horario, mensagem: "Escolha uma data e hora no futuro." });
  return {
    instancia: r.instanciaId ? [] : [{ campo: campoGrupo.instancia, mensagem: "Escolha a instância." }],
    obrigatorias: pendenciasReservas(reservasDoTipo(r, "OBRIGATORIA")),
    secundarias: pendenciasReservas(reservasDoTipo(r, "SECUNDARIA")),
    horario,
  };
}

function pendenciasReservas(reservas: readonly ReservaRascunho[]): Pendencia[] {
  return reservas.flatMap((x, n) => {
    const contexto = `Reserva ${n + 1}`;
    const lista: Pendencia[] = [];
    if (x.classeId === null)
      lista.push({ campo: campoGrupo.classe(x.chave), mensagem: "Escolha a classe.", contexto });
    if (x.importancia === null)
      lista.push({ campo: campoGrupo.importancia(x.chave), mensagem: "Escolha a importância.", contexto });
    return lista;
  });
}

/** Corpo do POST /api/gestao/grupos (sem as chaves das reservas). */
export function corpoNovoGrupo(r: RascunhoGrupo) {
  return { instanciaId: r.instanciaId, agendadoEm: partidaDe(r.horario), vagas: vagasDoRascunho(r) };
}
