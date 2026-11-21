import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

/** Tamanho padrão e máximo de uma página da listagem de todos os membros. */
export const LIMITE_PADRAO_MEMBROS = 100;
export const LIMITE_MAXIMO_MEMBROS = 200;

/** Personagem como o nag4eyes o enxerga: sem ficha (build, equipamentos), só o que ele usa. */
export interface PersonagemIntegracao {
  id: string;
  nome: string;
  classe: { id: string; nomeOficial: string } | null;
  nivelBase: number | null;
  /** Impressão digital dos campos acima: muda quando qualquer um deles muda. */
  versao: string;
}

export interface MembroIntegracao {
  discordId: string;
  personagens: PersonagemIntegracao[];
}

export interface PaginaMembros {
  membros: MembroIntegracao[];
  /** discordId a passar em `apos` para a próxima página; null na última. */
  proximo: string | null;
}

export interface PersonagensDoMembro extends MembroIntegracao {
  /** false quando o usuário não existe, está inativo ou não tem vínculo aprovado. */
  vinculado: boolean;
}

const SELECAO_PERSONAGEM = {
  id: true,
  nome: true,
  nivelBase: true,
  classe: { select: { id: true, nomeOficial: true } },
} as const satisfies Prisma.PersonagemSelect;

type PersonagemSelecionado = Prisma.PersonagemGetPayload<{ select: typeof SELECAO_PERSONAGEM }>;

const SELECAO_MEMBRO = {
  discordId: true,
  jogador: {
    select: {
      personagens: { where: { ativo: true }, select: SELECAO_PERSONAGEM, orderBy: { nome: "asc" } },
    },
  },
} as const satisfies Prisma.UsuarioSelect;

/**
 * Só contam usuários ativos com vínculo aprovado: o jogador só recebe `usuarioId` quando um admin
 * aprova a solicitação (D12).
 */
const MEMBRO_VINCULADO = {
  ativo: true,
  jogador: { isNot: null },
} as const satisfies Prisma.UsuarioWhereInput;

/** Calcula a impressão digital que permite ao chamador perceber que o personagem mudou. */
function versaoDe(p: PersonagemSelecionado): string {
  const campos = JSON.stringify([p.nome, p.classe?.id ?? null, p.classe?.nomeOficial ?? null, p.nivelBase]);
  return createHash("sha256").update(campos).digest("hex").slice(0, 16);
}

/** Converte o registro do banco no formato exposto pela integração. */
function paraIntegracao(p: PersonagemSelecionado): PersonagemIntegracao {
  return { id: p.id, nome: p.nome, classe: p.classe, nivelBase: p.nivelBase, versao: versaoDe(p) };
}

/**
 * Cadastro aprovado de personagens, lido por outro sistema (o nag4eyes) para não pedir ao membro que
 * cadastre tudo de novo. Somente leitura: nada aqui altera personagens.
 */
@Injectable()
export class PersonagensIntegracaoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Personagens ativos de todos os membros vinculados, paginados por discordId em ordem crescente.
   * Membros vinculados sem personagem ativo aparecem com a lista vazia.
   */
  async listar(limite: number, apos: string | null): Promise<PaginaMembros> {
    const usuarios = await this.prisma.usuario.findMany({
      where: { ...MEMBRO_VINCULADO, ...(apos === null ? {} : { discordId: { gt: apos } }) },
      orderBy: { discordId: "asc" },
      take: limite + 1,
      select: SELECAO_MEMBRO,
    });
    const pagina = usuarios.slice(0, limite);
    const ultimo = pagina.at(-1);
    return {
      membros: pagina.map((u) => ({
        discordId: u.discordId,
        personagens: (u.jogador?.personagens ?? []).map(paraIntegracao),
      })),
      proximo: usuarios.length > limite && ultimo !== undefined ? ultimo.discordId : null,
    };
  }

  /** Personagens ativos de um membro; lista vazia e `vinculado: false` quando ele não conta. */
  async doMembro(discordId: string): Promise<PersonagensDoMembro> {
    const usuario = await this.prisma.usuario.findFirst({
      where: { ...MEMBRO_VINCULADO, discordId },
      select: SELECAO_MEMBRO,
    });
    return {
      discordId,
      vinculado: usuario !== null,
      personagens: (usuario?.jogador?.personagens ?? []).map(paraIntegracao),
    };
  }
}
