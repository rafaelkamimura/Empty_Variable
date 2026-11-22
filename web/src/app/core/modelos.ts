// Formatos das respostas da API (backend).

export type Papel = "ADMIN" | "GESTOR" | "MEMBRO";
export type StatusSolicitacao = "PENDENTE" | "APROVADA" | "REJEITADA";

export interface UsuarioMe {
  id: string;
  discordUsername: string;
  globalName: string | null;
  avatarUrl: string | null;
  papel: Papel;
  jogador: { id: string; apelido: string } | null;
  vinculoPendente: boolean;
}

// Tipos da build (D57) ficam em shared/dominio/build.ts, onde o domínio de RO compartilhado mora.
import type { AtributosBuild, EquipamentoFicha } from "../shared/dominio/build";
export type {
  AtributosBuild,
  EncaixeEquipamento,
  EquipamentoFicha,
  ItemEquipamento,
} from "../shared/dominio/build";

export interface PersonagemResumo {
  id: string;
  nome: string;
  ativo: boolean;
  classeId?: string | null;
  nivelBase?: number | null;
  build?: string | null;
  equipamentos?: Record<string, EquipamentoFicha>;
  atributos?: AtributosBuild;
  classe?: { nomeOficial: string; apelidoGrupo: string | null } | null;
}

export interface Jogador {
  id: string;
  apelido: string;
  criadoEm: string;
  usuario: { id: string; discordUsername: string; globalName: string | null } | null;
  personagens: PersonagemResumo[];
}

export interface JogadorDisponivel {
  id: string;
  apelido: string;
  personagens: { nome: string }[];
}

export interface Solicitacao {
  id: string;
  status: StatusSolicitacao;
  motivo: string | null;
  apelidoProposto: string | null;
  personagensNovos: string[];
  fichas?: {
    nome: string;
    classeId: string;
    nivelBase: number;
    build: string | null;
    equipamentos?: Record<string, EquipamentoFicha>;
    atributos?: AtributosBuild;
  }[];

  criadaEm: string;
  analisadaEm: string | null;
  usuario: { id: string; discordUsername: string; globalName: string | null };
  jogador: { id: string; apelido: string; personagens: { id: string; nome: string }[] } | null;
  analisadaPor: { id: string; discordUsername: string } | null;
}

export interface SituacaoVinculo {
  jogador: { id: string; apelido: string; personagens: PersonagemResumo[] } | null;
  solicitacao: Solicitacao | null;
}

/** Extrai a mensagem de erro da API (NestJS: { message }) para mostrar ao usuário. */
export function mensagemDeErro(erro: unknown): string {
  const corpo = (erro as { error?: { message?: unknown } } | null)?.error;
  const msg = corpo?.message;
  if (typeof msg === "string") return msg;
  if (Array.isArray(msg)) return msg.join(" ");
  return "Não foi possível concluir a operação. Tente novamente.";
}
