import { BadRequestException, UnprocessableEntityException } from "@nestjs/common";
import { objeto, texto, textoOpcional } from "../comum/validacao.js";
import { data, type EntradaRun, lerEntradaRun } from "./entrada-run.js";

/** Nome, nome em inglês e identificador de algo (instância, classe) como a origem o chama. */
export interface ReferenciaOrigem {
  nome: string;
  nomeIngles: string | null;
  slug: string | null;
}

export interface EntradaParticipanteRascunho {
  discordId: string;
  personagem: string;
  classe: ReferenciaOrigem | null;
}

/** Corpo de POST /api/integracao/rascunhos-run. */
export interface EntradaRascunhoRun {
  /** Chave de idempotência do envio (ex.: "party:123" ou "party:123:instance:7"). */
  idOrigem: string;
  partyId: string | null;
  guildId: string;
  data: Date;
  instancia: ReferenciaOrigem | null;
  participantes: EntradaParticipanteRascunho[];
}

const MAX_PARTICIPANTES = 50;
const ID_ORIGEM = /^[A-Za-z0-9:_-]{1,80}$/;
const SNOWFLAKE = /^\d{1,25}$/;

function referencia(valor: unknown, campo: string): ReferenciaOrigem | null {
  if (valor === undefined || valor === null) return null;
  const b = objeto(valor);
  return {
    nome: texto(b["nome"], `${campo}.nome`, 1, 80),
    nomeIngles: textoOpcional(b["nomeIngles"], `${campo}.nomeIngles`, 1, 80) ?? null,
    slug: textoOpcional(b["slug"], `${campo}.slug`, 1, 80) ?? null,
  };
}

function participante(valor: unknown, i: number): EntradaParticipanteRascunho {
  const b = objeto(valor);
  const campo = `participantes[${i}]`;
  const discordId = b["discordId"];
  if (typeof discordId !== "string" || !SNOWFLAKE.test(discordId)) {
    throw new BadRequestException(`${campo}.discordId inválido.`);
  }
  return {
    discordId,
    personagem: texto(
      typeof b["personagem"] === "string" ? b["personagem"].normalize("NFC") : b["personagem"],
      `${campo}.personagem`,
      1,
      40,
    ),
    classe: referencia(b["classe"], `${campo}.classe`),
  };
}

/**
 * Valida o rascunho enviado pela integração. Só confere o formato: quem não for encontrado aqui
 * (Discord sem vínculo, personagem ou classe desconhecidos) não derruba o envio, vira pendência.
 */
export function lerEntradaRascunhoRun(corpo: unknown): EntradaRascunhoRun {
  const b = objeto(corpo);
  const idOrigem = b["idOrigem"];
  if (typeof idOrigem !== "string" || !ID_ORIGEM.test(idOrigem)) {
    throw new BadRequestException("idOrigem deve ter de 1 a 80 letras, números, ':', '_' ou '-'.");
  }
  const guildId = b["guildId"];
  if (typeof guildId !== "string" || !SNOWFLAKE.test(guildId)) {
    throw new BadRequestException("guildId inválido.");
  }
  const lista = b["participantes"];
  if (!Array.isArray(lista) || lista.length === 0) {
    throw new BadRequestException("Informe ao menos um participante.");
  }
  if (lista.length > MAX_PARTICIPANTES) {
    throw new BadRequestException(`participantes: no máximo ${MAX_PARTICIPANTES} itens.`);
  }
  return {
    idOrigem,
    partyId: textoOpcional(b["partyId"], "partyId", 1, 40) ?? null,
    guildId,
    data: data(b["data"]),
    instancia: referencia(b["instancia"], "instancia"),
    participantes: lista.map(participante),
  };
}

/** O que o rascunho oferece como padrão para a confirmação. */
export interface PadraoConfirmacao {
  data: Date;
  instanciaId: string | null;
  /** Participantes na ordem do rascunho; `pendencia` nula quando personagem e classe foram resolvidos. */
  participantes: { personagemId: string | null; classeId: string | null; pendencia: string | null }[];
}

/**
 * Corpo de POST /api/rascunhos-run/:id/confirmar: o mesmo de POST /api/runs, em que `data`,
 * `instanciaId` e `participantes` podem faltar e vêm do rascunho. `status`, encontro, empréstimos e
 * drops são decisão do gestor. Sem `participantes`, todos os do rascunho precisam estar resolvidos.
 */
export function lerConfirmacao(corpo: unknown, padrao: PadraoConfirmacao): EntradaRun {
  const b = objeto(corpo);
  let participantes = b["participantes"];
  if (participantes === undefined) {
    const pendentes = padrao.participantes.filter((p) => p.pendencia !== null);
    if (pendentes.length > 0) {
      throw new UnprocessableEntityException(
        `${pendentes.length} participante(s) do rascunho com pendência: informe a lista de participantes.`,
      );
    }
    participantes = padrao.participantes.map((p) => ({ personagemId: p.personagemId, classeId: p.classeId }));
  }
  const semInstancia =
    b["instanciaId"] === undefined && b["encontroId"] === undefined && b["chefe"] === undefined;
  return lerEntradaRun({
    ...b,
    data: b["data"] ?? padrao.data.toISOString().slice(0, 10),
    ...(semInstancia ? { instanciaId: padrao.instanciaId } : {}),
    participantes,
  });
}
