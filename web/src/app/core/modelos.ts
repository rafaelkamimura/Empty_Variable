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

/** D57: carta ou encantamento de um equipamento; o nome vem da Divine Pride quando ela responde. */
export interface EncaixeEquipamento {
  id: number;
  nome: string | null;
}
export interface ItemEquipamento {
  id: number;
  nome: string;
  /** D57: o que a build importada do simulador traz além do item. */
  refino?: number;
  grau?: "D" | "C" | "B" | "A";
  cartas?: EncaixeEquipamento[];
  encantamentos?: EncaixeEquipamento[];
}
type Pontos<Chave extends string> = Partial<Record<Chave, number>>;
/** D57: atributos da build importada do simulador, guardados na ficha. */
export interface AtributosBuild {
  nivelClasse?: number;
  base?: Pontos<"str" | "agi" | "vit" | "int" | "dex" | "luk">;
  bonusClasse?: Pontos<"str" | "agi" | "vit" | "int" | "dex" | "luk">;
  talentos?: Pontos<"pow" | "sta" | "wis" | "spl" | "con" | "crt">;
  habilidade?: { nome: string; nivel?: number };
  elementoAtaque?: string;
}
export type EquipamentoFicha = string | ItemEquipamento;

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
