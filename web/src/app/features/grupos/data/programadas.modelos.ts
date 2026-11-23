// Instâncias programadas, do lado do membro: a agenda dos grupos abertos e as vagas em que ele pode entrar.
import type { TipoVaga } from "./grupos.modelos";

/** Vaga como o membro vê: sem o ocupante, só se está ocupada e se é dele. */
export interface VagaProgramada {
  readonly tipo: TipoVaga;
  readonly classeId: string | null;
  /** Nome oficial da classe reservada, ou null (vaga livre). */
  readonly classe: string | null;
  readonly importancia: number | null;
  readonly ocupada: boolean;
  /** Nome do personagem do membro nesta vaga, ou null. */
  readonly meuPersonagem: string | null;
}

export interface GrupoProgramado {
  readonly id: string;
  readonly instancia: { readonly nome: string };
  readonly agendadoEm: string;
  readonly fechadoEm: string | null;
  readonly vagas: readonly VagaProgramada[];
}

export interface MeuPersonagem {
  readonly id: string;
  readonly nome: string;
  readonly classeId: string | null;
}

/** GET /api/instancias-programadas. */
export interface AgendaProgramada {
  readonly grupos: readonly GrupoProgramado[];
  readonly personagens: readonly MeuPersonagem[];
}

/** Situação da vaga para o membro, que decide o que a tela mostra. */
export type SituacaoVaga = "minha" | "ocupada" | "indisponivel" | "elegivel" | "sem-personagem";

export const ocupadas = (g: GrupoProgramado): number => g.vagas.filter((v) => v.ocupada).length;

export const jaParticipa = (g: GrupoProgramado): boolean => g.vagas.some((v) => v.meuPersonagem !== null);

/** Personagens do membro que servem na vaga (a classe precisa bater, se a vaga reserva uma). */
export function elegiveis(vaga: VagaProgramada, personagens: readonly MeuPersonagem[]): MeuPersonagem[] {
  return personagens.filter((p) => vaga.classeId === null || p.classeId === vaga.classeId);
}

export function situacaoDaVaga(
  g: GrupoProgramado,
  vaga: VagaProgramada,
  personagens: readonly MeuPersonagem[],
): SituacaoVaga {
  if (vaga.meuPersonagem !== null) return "minha";
  if (vaga.ocupada) return "ocupada";
  if (g.fechadoEm !== null || jaParticipa(g)) return "indisponivel";
  return elegiveis(vaga, personagens).length > 0 ? "elegivel" : "sem-personagem";
}
