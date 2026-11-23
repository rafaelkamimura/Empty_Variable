// Grupos de instância (escala com 12 vagas): tipos do contrato e regras puras da gestão.
// Uma vaga OBRIGATORIA precisa estar preenchida para fechar o grupo; uma SECUNDARIA reserva a
// classe e pode ficar aberta; uma LIVRE aceita qualquer classe. Um personagem por jogador.

export type TipoVaga = "OBRIGATORIA" | "SECUNDARIA" | "LIVRE";
export type TipoReserva = Exclude<TipoVaga, "LIVRE">;

export const TOTAL_VAGAS = 12;

export const ROTULO_TIPO_VAGA: Readonly<Record<TipoVaga, string>> = {
  OBRIGATORIA: "Obrigatória",
  SECUNDARIA: "Secundária",
  LIVRE: "Livre",
};

export interface Vaga {
  readonly tipo: TipoVaga;
  readonly classeId: string | null;
  /** 1 a 5 nas reservas; null nas livres. */
  readonly importancia: number | null;
  readonly personagemId: string | null;
}

export interface InstanciaGrupo {
  readonly id: string;
  readonly nome: string;
}

export interface ClasseGrupo {
  readonly id: string;
  readonly nomeOficial: string;
  /** Grupo da classe na LATAM ("1-1", "2-2", "Outras"…), para o optgroup. */
  readonly grupo: string;
}

export interface PersonagemGrupo {
  readonly id: string;
  readonly nome: string;
  readonly classeId: string | null;
  readonly jogadorId: string;
  readonly jogador: { readonly apelido: string };
}

/** GET /api/gestao/grupos/opcoes. */
export interface OpcoesGrupos {
  readonly instancias: readonly InstanciaGrupo[];
  readonly classes: readonly ClasseGrupo[];
  readonly personagens: readonly PersonagemGrupo[];
}

/** Um grupo como GET /api/gestao/grupos devolve. */
export interface Grupo {
  readonly id: string;
  readonly instancia: InstanciaGrupo;
  /** ISO com fuso. */
  readonly agendadoEm: string;
  readonly fechadoEm: string | null;
  readonly vagas: readonly Vaga[];
}

/** Resposta de POST e PATCH: o grupo sem a instância. */
export type GrupoSalvo = Omit<Grupo, "instancia">;

export const vagaLivre = (): Vaga => ({
  tipo: "LIVRE",
  classeId: null,
  importancia: null,
  personagemId: null,
});

export function vagasIniciais(): Vaga[] {
  return Array.from({ length: TOTAL_VAGAS }, vagaLivre);
}

export function comVaga(vagas: readonly Vaga[], i: number, parte: Partial<Vaga>): readonly Vaga[] {
  return vagas.map((v, j) => (j === i ? { ...v, ...parte } : v));
}

export const preenchidas = (vagas: readonly Vaga[]): number => vagas.filter((v) => v.personagemId).length;

export const faltamObrigatorias = (vagas: readonly Vaga[]): number =>
  vagas.filter((v) => v.tipo === "OBRIGATORIA" && !v.personagemId).length;

/**
 * Quem pode ocupar a vaga `i`: o ocupante atual, ou um personagem da classe da reserva (qualquer
 * classe, se livre) cujo jogador ainda não está em outra vaga.
 */
export function candidatos(
  vagas: readonly Vaga[],
  i: number,
  personagens: readonly PersonagemGrupo[],
): PersonagemGrupo[] {
  const vaga = vagas[i];
  if (vaga === undefined) return [];
  const ocupados = new Set(vagas.flatMap((v, j) => (j !== i && v.personagemId ? [v.personagemId] : [])));
  const jogadores = new Set(personagens.filter((p) => ocupados.has(p.id)).map((p) => p.jogadorId));
  return personagens.filter(
    (p) =>
      p.id === vaga.personagemId ||
      (!jogadores.has(p.jogadorId) && (vaga.tipo === "LIVRE" || p.classeId === vaga.classeId)),
  );
}

/** "Mestre Celestial (importância 5), Animista (importância 2)" ou "Nenhuma". */
export function resumoReservas(
  vagas: readonly Pick<Vaga, "tipo" | "classeId" | "importancia">[],
  tipo: TipoReserva,
  classes: readonly ClasseGrupo[],
): string {
  const nomes = new Map(classes.map((c) => [c.id, c.nomeOficial]));
  const lista = vagas
    .filter((v) => v.tipo === tipo)
    .map(
      (v) =>
        `${(v.classeId && nomes.get(v.classeId)) || "Classe indisponível"} (importância ${v.importancia})`,
    );
  return lista.join(", ") || "Nenhuma";
}

/** "2026-11-24T20:30" (datetime-local, horário de São Paulo) → ISO com fuso, ou null. */
export function partidaDe(horario: string): string | null {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(horario) ? `${horario}:00-03:00` : null;
}

/** Corpo do PATCH de escala: as vagas e a ocupação que a tela viu (o servidor recusa se mudou). */
export function corpoEscala(grupo: Grupo, vagas: readonly Vaga[], fechar: boolean) {
  return { vagas, fechar, ocupacaoAnterior: grupo.vagas.map((v) => v.personagemId) };
}
