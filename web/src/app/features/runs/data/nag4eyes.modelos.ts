// Rascunhos de run enviados pelo nag4eyes (grupos encerrados no Discord).
import { novoParticipante, type RascunhoRun } from "./runs.modelos";

export type PendenciaRascunho =
  | "USUARIO_DESCONHECIDO"
  | "SEM_VINCULO"
  | "PERSONAGEM_NAO_ENCONTRADO"
  | "PERSONAGEM_INATIVO"
  | "PERSONAGEM_REPETIDO"
  | "CLASSE_NAO_ENCONTRADA";

export const ROTULO_PENDENCIA: Record<PendenciaRascunho, string> = {
  USUARIO_DESCONHECIDO: "Discord sem usuário neste sistema",
  SEM_VINCULO: "Usuário sem vínculo com um jogador",
  PERSONAGEM_NAO_ENCONTRADO: "Personagem não cadastrado para o jogador",
  PERSONAGEM_INATIVO: "Personagem inativo",
  PERSONAGEM_REPETIDO: "Personagem repetido no grupo",
  CLASSE_NAO_ENCONTRADA: "Classe não encontrada",
};

/** Rascunho vindo do nag4eyes como GET /api/rascunhos-run/:id devolve. */
export interface RascunhoNag4eyes {
  id: string;
  partyId: string | null;
  data: string;
  status: "PENDENTE" | "CONFIRMADO" | "DESCARTADO";
  recebidoEm: string;
  instancia: { id: string; nome: string } | null;
  instanciaOrigem: { nome: string; nomeIngles: string | null; slug: string | null } | null;
  runId: string | null;
  participantes: {
    id: string;
    ordem: number;
    discordId: string;
    personagemNome: string;
    classeNome: string | null;
    pendencia: PendenciaRascunho | null;
    jogador: { id: string; apelido: string } | null;
    personagem: { id: string; nome: string } | null;
    classe: { id: string; nomeOficial: string; apelidoGrupo: string | null } | null;
  }[];
}

/** Resumo do rascunho como GET /api/rascunhos-run devolve. */
export interface ResumoRascunhoNag4eyes {
  id: string;
  partyId: string | null;
  data: string;
  status: RascunhoNag4eyes["status"];
  recebidoEm: string;
  instancia: { id: string; nome: string } | null;
  instanciaOrigem: RascunhoNag4eyes["instanciaOrigem"];
  participantes: number;
  pendentes: number;
}

/**
 * Pré-preenche o assistente com o rascunho do nag4eyes: a data e os participantes resolvidos (sem
 * função escolhida, vale a padrão da classe). A instância fica a de `base`, que o assistente já
 * escolhe pelo rascunho quando ela pode receber runs. Os participantes com pendência ficam de fora
 * e são mostrados à parte para o gestor incluir à mão. Resultado, encontro, empréstimos e drops
 * continuam com o gestor.
 */
export function rascunhoDeNag4eyes(d: RascunhoNag4eyes, base: RascunhoRun): RascunhoRun {
  const resolvidos = d.participantes.filter(
    (p) => p.pendencia === null && p.personagem !== null && p.classe !== null,
  );
  return {
    ...base,
    data: d.data.slice(0, 10),
    participantes: resolvidos.map((p) => ({
      ...novoParticipante(),
      personagemId: p.personagem?.id ?? null,
      classeId: p.classe?.id ?? null,
    })),
  };
}

/** Participantes do rascunho que não entraram no pré-preenchimento, com o motivo. */
export function pendentesDoRascunho(d: RascunhoNag4eyes) {
  return d.participantes
    .filter((p) => p.pendencia !== null || p.personagem === null || p.classe === null)
    .map((p) => ({
      discordId: p.discordId,
      personagem: p.personagemNome,
      classe: p.classeNome,
      jogador: p.jogador?.apelido ?? null,
      motivo: ROTULO_PENDENCIA[p.pendencia ?? "CLASSE_NAO_ENCONTRADA"],
    }));
}
