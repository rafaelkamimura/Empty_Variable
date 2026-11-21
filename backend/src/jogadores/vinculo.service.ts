import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { StatusSolicitacao, Usuario } from "@prisma/client";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { grupoDaClasseLatam } from "../cadastros/classes-latam.js";
import { ehViolacaoUnicidade } from "../comum/filtro-prisma.js";
import { NotificacoesService } from "../notificacoes/notificacoes.service.js";
import { PrismaService, type Tx } from "../prisma/prisma.service.js";
import type { AtributosFicha, EquipamentoFicha } from "./ficha-build.js";

export interface FichaPersonagem {
  nome: string;
  classeId: string;
  nivelBase: number;
  build: string | null;
  equipamentos: Record<string, string | EquipamentoFicha>;
  /** D57: atributos da build; fichas antigas pendentes não trazem o campo. */
  atributos?: AtributosFicha;
}

export const SELECAO_FICHA = {
  id: true,
  nome: true,
  ativo: true,
  classeId: true,
  nivelBase: true,
  build: true,
  equipamentos: true,
  atributos: true,
  classe: { select: { nomeOficial: true, apelidoGrupo: true } },
} as const;

export interface NovaSolicitacao {
  jogadorId?: string;
  apelidoProposto?: string;
  personagensNovos: string[];
  fichas?: FichaPersonagem[];
}

interface PersonagensSolicitados {
  novos: string[];
  fichas?: FichaPersonagem[];
}

const SELECAO_SOLICITACAO = {
  id: true,
  status: true,
  motivo: true,
  apelidoProposto: true,
  personagens: true,
  criadaEm: true,
  analisadaEm: true,
  usuario: { select: { id: true, discordUsername: true, globalName: true } },
  jogador: {
    select: {
      id: true,
      apelido: true,
      personagens: { select: { id: true, nome: true }, orderBy: { nome: "asc" as const } },
    },
  },
  analisadaPor: { select: { id: true, discordUsername: true } },
};

function novosDe(json: unknown): string[] {
  const novos = (json as Partial<PersonagensSolicitados> | null)?.novos;
  return Array.isArray(novos) ? novos.filter((n): n is string => typeof n === "string") : [];
}

function fichasDe(json: unknown): FichaPersonagem[] {
  const fichas = (json as PersonagensSolicitados | null)?.fichas;
  return Array.isArray(fichas) ? fichas : [];
}

/**
 * Fluxo da D12: o membro reivindica um jogador e personagens; o vínculo só vale após aprovação de um admin.
 * As checagens de conflito são repetidas na aprovação, porque o cadastro pode ter mudado no meio-tempo.
 */
@Injectable()
export class VinculoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  async minhaSituacao(usuario: Usuario) {
    const [jogador, ultima] = await Promise.all([
      this.prisma.jogador.findUnique({
        where: { usuarioId: usuario.id },
        select: {
          id: true,
          apelido: true,
          personagens: { select: SELECAO_FICHA, orderBy: { nome: "asc" } },
        },
      }),
      this.prisma.solicitacaoVinculo.findFirst({
        where: { usuarioId: usuario.id },
        orderBy: { criadaEm: "desc" },
        select: SELECAO_SOLICITACAO,
      }),
    ]);
    return { jogador, solicitacao: ultima === null ? null : this.formatar(ultima) };
  }

  /** Jogadores que ainda não têm usuário: são os que podem ser reivindicados. */
  jogadoresDisponiveis() {
    return this.prisma.jogador.findMany({
      where: { usuarioId: null },
      orderBy: { apelido: "asc" },
      select: {
        id: true,
        apelido: true,
        personagens: { where: { ativo: true }, select: { nome: true }, orderBy: { nome: "asc" } },
      },
    });
  }

  async classes() {
    const classes = await this.prisma.classe.findMany({
      where: { ativa: true },
      orderBy: { nomeOficial: "asc" },
      select: { id: true, nomeOficial: true, apelidoGrupo: true },
    });
    return classes.map((classe) => ({ ...classe, grupo: grupoDaClasseLatam(classe.nomeOficial) }));
  }

  private async validarClasses(tx: Tx, fichas: FichaPersonagem[]): Promise<void> {
    const ids = [...new Set(fichas.map((ficha) => ficha.classeId))];
    if (ids.length && (await tx.classe.count({ where: { id: { in: ids }, ativa: true } })) !== ids.length) {
      throw new BadRequestException("Selecione uma classe ativa para cada personagem.");
    }
  }

  async salvarFicha(usuario: Usuario, ficha: FichaPersonagem, personagemId?: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const jogador = await tx.jogador.findUnique({
          where: { usuarioId: usuario.id },
          select: { id: true },
        });
        if (!jogador) throw new ForbiddenException("Seu vínculo precisa ser aprovado primeiro.");
        await this.validarClasses(tx, [ficha]);
        if (personagemId === undefined) {
          return tx.personagem.create({ data: { ...ficha, jogadorId: jogador.id }, select: SELECAO_FICHA });
        }
        const alterado = await tx.personagem.updateMany({
          where: { id: personagemId, jogadorId: jogador.id },
          data: ficha,
        });
        if (!alterado.count) throw new NotFoundException("Personagem não encontrado na sua conta.");
        return tx.personagem.findUniqueOrThrow({ where: { id: personagemId }, select: SELECAO_FICHA });
      });
    } catch (erro) {
      if (ehViolacaoUnicidade(erro)) throw new ConflictException("Este nickname já está cadastrado.");
      throw erro;
    }
  }

  private async conferirConflitos(tx: Tx, usuarioId: string, s: NovaSolicitacao): Promise<void> {
    await this.validarClasses(tx, s.fichas ?? []);
    if ((await tx.jogador.count({ where: { usuarioId } })) > 0) {
      throw new ConflictException("Você já está vinculado a um jogador.");
    }
    if (s.jogadorId !== undefined) {
      const jogador = await tx.jogador.findUnique({ where: { id: s.jogadorId } });
      if (jogador === null) throw new NotFoundException("Jogador não encontrado.");
      if (jogador.usuarioId !== null)
        throw new ConflictException("Este jogador já está vinculado a outro usuário."); // CT-78
    }
    if (s.apelidoProposto !== undefined) {
      const existe = await tx.jogador.count({
        where: { apelido: { equals: s.apelidoProposto, mode: "insensitive" } },
      });
      if (existe > 0)
        throw new ConflictException("Já existe um jogador com esse apelido. Reivindique-o na lista.");
    }
    if (s.personagensNovos.length > 0) {
      const existentes = await tx.personagem.findMany({
        where: {
          OR: s.personagensNovos.map((nome) => ({ nome: { equals: nome, mode: "insensitive" as const } })),
        },
        select: { nome: true },
      });
      if (existentes.length > 0) {
        throw new ConflictException(`Personagem já cadastrado: ${existentes.map((p) => p.nome).join(", ")}.`);
      }
    }
  }

  async solicitar(usuario: Usuario, s: NovaSolicitacao) {
    if (s.jogadorId !== undefined && s.apelidoProposto !== undefined) {
      throw new BadRequestException("Informe somente um jogador ou um novo apelido.");
    }
    if (s.jogadorId === undefined && s.personagensNovos.length === 0) {
      throw new BadRequestException("Informe ao menos um personagem.");
    }
    if (s.jogadorId === undefined && s.apelidoProposto === undefined && !s.fichas?.length) {
      throw new BadRequestException("Informe a ficha do personagem.");
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (
          (await tx.solicitacaoVinculo.count({ where: { usuarioId: usuario.id, status: "PENDENTE" } })) > 0
        ) {
          throw new ConflictException("Você já tem uma solicitação pendente."); // CT-77
        }
        if (s.jogadorId === undefined && s.apelidoProposto === undefined) {
          const apelido = usuario.discordUsername.trim().slice(0, 32);
          const ocupado = await tx.jogador.count({
            where: { apelido: { equals: apelido, mode: "insensitive" } },
          });
          s = {
            ...s,
            apelidoProposto:
              apelido.length >= 2 && ocupado === 0
                ? apelido
                : `${apelido.slice(0, Math.max(0, 31 - usuario.discordId.length))}-${usuario.discordId}`,
          };
        }
        await this.conferirConflitos(tx, usuario.id, s);
        const criada = await tx.solicitacaoVinculo.create({
          data: {
            usuarioId: usuario.id,
            jogadorId: s.jogadorId ?? null,
            apelidoProposto: s.apelidoProposto ?? null,
            personagens: {
              novos: s.personagensNovos,
              ...(s.fichas ? { fichas: s.fichas.map((ficha) => ({ ...ficha })) } : {}),
            },
          },
          select: SELECAO_SOLICITACAO,
        });
        await this.auditoria.registrar(
          {
            usuarioId: usuario.id,
            acao: "VINCULO_SOLICITADO",
            entidade: "solicitacao_vinculo",
            entidadeId: criada.id,
            depois: s,
          },
          tx,
        );
        return this.formatar(criada);
      });
    } catch (erro) {
      // Corrida entre duas solicitações simultâneas: o índice parcial único garante a regra.
      if (ehViolacaoUnicidade(erro)) throw new ConflictException("Você já tem uma solicitação pendente.");
      throw erro;
    }
  }

  async salvarFichaPendente(usuario: Usuario, id: string, ficha: FichaPersonagem, nomeAnterior?: string) {
    return this.prisma.$transaction(async (tx) => {
      const pedido = await this.travarPendente(tx, id, usuario.id);
      const nomes = novosDe(pedido.personagens);
      const fichas = fichasDe(pedido.personagens);
      if (nomeAnterior !== undefined && !nomes.includes(nomeAnterior)) {
        throw new NotFoundException("Personagem pendente indisponível. Atualize a página.");
      }
      const personagensNovos = nomes.filter((nome) => nome !== nomeAnterior);
      if (personagensNovos.length >= 10) throw new BadRequestException("Informe no máximo 10 personagens.");
      if (personagensNovos.some((nome) => nome.toLowerCase() === ficha.nome.toLowerCase())) {
        throw new ConflictException("Já existe um personagem com esse nickname na solicitação.");
      }
      personagensNovos.push(ficha.nome);
      await this.conferirConflitos(tx, usuario.id, {
        ...(pedido.jogadorId === null ? {} : { jogadorId: pedido.jogadorId }),
        ...(pedido.apelidoProposto === null ? {} : { apelidoProposto: pedido.apelidoProposto }),
        personagensNovos,
        fichas: [ficha],
      });
      const atualizada = await tx.solicitacaoVinculo.update({
        where: { id },
        data: {
          personagens: {
            novos: personagensNovos,
            fichas: [
              ...fichas.filter((atual) => atual.nome !== nomeAnterior).map((atual) => ({ ...atual })),
              { ...ficha },
            ],
          },
        },
        select: SELECAO_SOLICITACAO,
      });
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          acao: "VINCULO_EDITADO",
          entidade: "solicitacao_vinculo",
          entidadeId: id,
          depois: { nomeAnterior: nomeAnterior ?? null, ficha },
        },
        tx,
      );
      return this.formatar(atualizada);
    });
  }

  async listar(status: StatusSolicitacao | undefined) {
    const lista = await this.prisma.solicitacaoVinculo.findMany({
      where: status === undefined ? {} : { status },
      orderBy: { criadaEm: status === "PENDENTE" ? "asc" : "desc" },
      take: 200,
      select: SELECAO_SOLICITACAO,
    });
    return lista.map((s) => this.formatar(s));
  }

  async aprovar(id: string, admin: Usuario) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const s = await this.travarPendente(tx, id);
        if (s.usuarioId === admin.id) {
          throw new ForbiddenException("Outro administrador precisa aprovar este vínculo.");
        }
        const pedido: NovaSolicitacao = {
          ...(s.jogadorId === null ? {} : { jogadorId: s.jogadorId }),
          ...(s.apelidoProposto === null ? {} : { apelidoProposto: s.apelidoProposto }),
          personagensNovos: novosDe(s.personagens),
          fichas: fichasDe(s.personagens),
        };
        await this.conferirConflitos(tx, s.usuarioId, pedido);

        let jogadorId: string;
        let apelido: string;
        if (pedido.jogadorId !== undefined) {
          const r = await tx.jogador.updateMany({
            where: { id: pedido.jogadorId, usuarioId: null },
            data: { usuarioId: s.usuarioId },
          });
          if (r.count !== 1) throw new ConflictException("Este jogador já está vinculado a outro usuário.");
          jogadorId = pedido.jogadorId;
          apelido = (await tx.jogador.findUniqueOrThrow({ where: { id: jogadorId } })).apelido;
        } else {
          const novo = await tx.jogador.create({
            data: { apelido: pedido.apelidoProposto ?? "", usuarioId: s.usuarioId },
          });
          jogadorId = novo.id;
          apelido = novo.apelido;
        }
        if (pedido.personagensNovos.length > 0) {
          await tx.personagem.createMany({
            data: pedido.personagensNovos.map((nome) => ({
              ...pedido.fichas?.find((ficha) => ficha.nome === nome),
              nome,
              jogadorId,
            })),
          });
        }
        await tx.solicitacaoVinculo.update({
          where: { id },
          data: { status: "APROVADA", analisadaPorId: admin.id, analisadaEm: new Date(), jogadorId },
        });
        await this.notificacoes.registrar(tx, [
          {
            destinatario: { usuarioId: s.usuarioId },
            evento: {
              tipo: "VINCULO_APROVADO",
              dados: { solicitacaoId: id, jogador: apelido, personagens: pedido.personagensNovos },
            },
          },
        ]);
        await this.auditoria.registrar(
          {
            usuarioId: admin.id,
            acao: "VINCULO_APROVADO",
            entidade: "solicitacao_vinculo",
            entidadeId: id,
            depois: { jogadorId, ...pedido },
          },
          tx,
        );
        return this.formatar(
          await tx.solicitacaoVinculo.findUniqueOrThrow({ where: { id }, select: SELECAO_SOLICITACAO }),
        );
      });
    } catch (erro) {
      if (ehViolacaoUnicidade(erro)) {
        throw new ConflictException(
          "O cadastro mudou desde a solicitação (apelido ou personagem já existe). Rejeite com o motivo.",
        );
      }
      throw erro;
    }
  }

  async rejeitar(id: string, motivo: string, admin: Usuario) {
    return this.prisma.$transaction(async (tx) => {
      const pendente = await this.travarPendente(tx, id);
      const s = await tx.solicitacaoVinculo.update({
        where: { id },
        data: { status: "REJEITADA", motivo, analisadaPorId: admin.id, analisadaEm: new Date() },
        select: SELECAO_SOLICITACAO,
      });
      await this.notificacoes.registrar(
        tx,
        [
          {
            destinatario: { usuarioId: pendente.usuarioId },
            evento: { tipo: "VINCULO_REJEITADO", dados: { solicitacaoId: id, motivo } },
          },
        ],
        admin.id,
      );
      await this.auditoria.registrar(
        {
          usuarioId: admin.id,
          acao: "VINCULO_REJEITADO",
          entidade: "solicitacao_vinculo",
          entidadeId: id,
          depois: { motivo },
        },
        tx,
      );
      return this.formatar(s);
    });
  }

  /** Bloqueia a linha (SELECT ... FOR UPDATE) para que duas análises simultâneas não decidam a mesma solicitação. */
  private async travarPendente(tx: Tx, id: string, usuarioId?: string) {
    await tx.$queryRaw`SELECT id FROM solicitacao_vinculo WHERE id = ${id}::uuid FOR UPDATE`;
    const s = await tx.solicitacaoVinculo.findUnique({ where: { id } });
    if (s === null || (usuarioId !== undefined && s.usuarioId !== usuarioId)) {
      throw new NotFoundException("Solicitação não encontrada.");
    }
    if (s.status !== "PENDENTE") throw new ConflictException("Esta solicitação já foi analisada.");
    return s;
  }

  private formatar<T extends { personagens: unknown }>(s: T) {
    const { personagens, ...resto } = s;
    return { ...resto, personagensNovos: novosDe(personagens), fichas: fichasDe(personagens) };
  }
}
