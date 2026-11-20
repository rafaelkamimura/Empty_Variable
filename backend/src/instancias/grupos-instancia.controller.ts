import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import type { Usuario } from "@prisma/client";
import { Papeis, UsuarioAtual } from "../auth/decoradores.js";
import { grupoDaClasseLatam } from "../cadastros/classes-latam.js";
import { inteiro, objeto, uuid } from "../comum/validacao.js";
import { PrismaService, type Tx } from "../prisma/prisma.service.js";

export type Vaga = {
  tipo: "OBRIGATORIA" | "SECUNDARIA" | "LIVRE";
  classeId: string | null;
  importancia: number | null;
  personagemId: string | null;
};

/** Lê e valida as 12 vagas de um grupo (corpo da requisição ou coluna `vagas`). */
export function lerVagas(valor: unknown): Vaga[] {
  if (!Array.isArray(valor) || valor.length !== 12) throw new BadRequestException("Informe as 12 vagas.");
  return valor.map((linha) => {
    const b = objeto(linha);
    const tipo = b["tipo"];
    if (tipo !== "OBRIGATORIA" && tipo !== "SECUNDARIA" && tipo !== "LIVRE") {
      throw new BadRequestException("Tipo de vaga invalido.");
    }
    return {
      tipo,
      classeId: tipo === "LIVRE" ? null : uuid(b["classeId"], "Classe"),
      importancia: tipo === "LIVRE" ? null : inteiro(b["importancia"], "Importancia", 1, 5),
      personagemId: b["personagemId"] == null ? null : uuid(b["personagemId"], "Personagem"),
    };
  });
}

const personagemElegivel = { ativo: true, jogador: { usuario: { ativo: true } } };
const instancia = { select: { id: true, nome: true } } as const;

async function travarGrupo(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM grupo_instancia WHERE id = ${id}::uuid FOR UPDATE`;
  const grupo = await tx.grupoInstancia.findUnique({ where: { id } });
  if (!grupo) throw new NotFoundException("Grupo não encontrado.");
  if (grupo.fechadoEm) throw new ConflictException("Este grupo já foi fechado.");
  return grupo;
}

@Controller("instancias-programadas")
class InstanciasProgramadasController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listar(@UsuarioAtual() usuario: Usuario) {
    const [grupos, classes, personagens] = await Promise.all([
      this.prisma.grupoInstancia.findMany({
        where: { agendadoEm: { gte: new Date() }, instancia: { ativa: true } },
        select: { id: true, instancia, agendadoEm: true, fechadoEm: true, vagas: true },
        orderBy: { agendadoEm: "asc" },
        take: 100,
      }),
      this.prisma.classe.findMany({ select: { id: true, nomeOficial: true } }),
      this.prisma.personagem.findMany({
        where: { ativo: true, jogador: { usuarioId: usuario.id } },
        select: { id: true, nome: true, classeId: true },
        orderBy: { nome: "asc" },
      }),
    ]);
    const nomes = new Map(classes.map((classe) => [classe.id, classe.nomeOficial]));
    const meus = new Map(personagens.map((personagem) => [personagem.id, personagem.nome]));
    return {
      personagens,
      grupos: grupos.map(({ vagas, ...grupo }) => ({
        ...grupo,
        vagas: lerVagas(vagas).map(({ personagemId, ...vaga }) => ({
          ...vaga,
          classe: vaga.classeId ? (nomes.get(vaga.classeId) ?? null) : null,
          ocupada: personagemId !== null,
          meuPersonagem: personagemId ? (meus.get(personagemId) ?? null) : null,
        })),
      })),
    };
  }

  @Post(":id/participar")
  participar(@Param("id") valor: string, @Body() corpo: unknown, @UsuarioAtual() usuario: Usuario) {
    const id = uuid(valor, "Grupo");
    const b = objeto(corpo);
    const posicao = inteiro(b["vaga"], "Vaga", 1, 12) - 1;
    const personagemId = uuid(b["personagemId"], "Personagem");
    return this.prisma.$transaction(async (tx) => {
      const grupo = await travarGrupo(tx, id);
      if (
        +grupo.agendadoEm <= Date.now() ||
        !(await tx.instancia.findFirst({
          where: { id: grupo.instanciaId, ativa: true },
          select: { id: true },
        }))
      )
        throw new ConflictException("Este grupo não recebe mais inscrições.");

      const vagas = lerVagas(grupo.vagas);
      const vaga = vagas[posicao];
      if (!vaga || vaga.personagemId) throw new ConflictException("Esta vaga já está ocupada.");
      const personagem = await tx.personagem.findFirst({
        where: { id: personagemId, ativo: true, jogador: { usuarioId: usuario.id } },
        select: { jogadorId: true, classeId: true },
      });
      if (!personagem) throw new NotFoundException("Personagem ativo não encontrado na sua conta.");
      if (vaga.classeId && vaga.classeId !== personagem.classeId) {
        throw new BadRequestException("A classe do personagem precisa corresponder à vaga.");
      }
      const ocupantes = vagas.flatMap((item) => (item.personagemId ? [item.personagemId] : []));
      if (await tx.personagem.count({ where: { id: { in: ocupantes }, jogadorId: personagem.jogadorId } })) {
        throw new ConflictException("Você já tem um personagem neste grupo.");
      }
      vaga.personagemId = personagemId;
      await tx.grupoInstancia.update({ where: { id }, data: { vagas } });
      return { vaga: posicao + 1 };
    });
  }
}

@Controller("gestao/grupos")
@Papeis("GESTOR")
class GruposInstanciaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("opcoes")
  async opcoes() {
    const [instancias, classes, personagens] = await Promise.all([
      this.prisma.instancia.findMany({
        where: { ativa: true },
        select: instancia.select,
        orderBy: { nome: "asc" },
      }),
      this.prisma.classe.findMany({
        where: { ativa: true },
        select: { id: true, nomeOficial: true },
        orderBy: { nomeOficial: "asc" },
      }),
      this.prisma.personagem.findMany({
        where: personagemElegivel,
        select: {
          id: true,
          nome: true,
          classeId: true,
          jogadorId: true,
          jogador: { select: { apelido: true } },
        },
        orderBy: { nome: "asc" },
      }),
    ]);
    return {
      instancias,
      classes: classes.map((classe) => ({ ...classe, grupo: grupoDaClasseLatam(classe.nomeOficial) })),
      personagens,
    };
  }

  @Get()
  listar() {
    return this.prisma.grupoInstancia.findMany({
      include: { instancia },
      orderBy: { agendadoEm: "desc" },
      take: 100,
    });
  }

  @Post()
  criar(@Body() corpo: unknown, @UsuarioAtual() usuario: Usuario) {
    const b = objeto(corpo);
    const instanciaId = uuid(b["instanciaId"], "Instancia");
    const texto = b["agendadoEm"];
    const agendadoEm =
      typeof texto === "string" && /(?:Z|[+-]\d{2}:\d{2})$/.test(texto) ? new Date(texto) : null;
    if (agendadoEm === null || !Number.isFinite(+agendadoEm) || +agendadoEm <= Date.now()) {
      throw new BadRequestException("Informe uma data e hora futura para o grupo.");
    }
    const vagas = lerVagas(b["vagas"]);
    return this.prisma.$transaction(async (tx) => {
      if (
        !(await tx.instancia.findFirst({ where: { id: instanciaId, ativa: true }, select: { id: true } }))
      ) {
        throw new BadRequestException("Selecione uma instancia ativa.");
      }
      await this.validarVagas(tx, vagas);
      return tx.grupoInstancia.create({ data: { instanciaId, agendadoEm, criadoPorId: usuario.id, vagas } });
    });
  }

  @Patch(":id")
  salvar(@Param("id") valor: string, @Body() corpo: unknown) {
    const id = uuid(valor, "Grupo");
    const b = objeto(corpo);
    const vagas = lerVagas(b["vagas"]);
    const fechar = b["fechar"] === true;
    return this.prisma.$transaction(async (tx) => {
      const grupo = await travarGrupo(tx, id);
      const anteriores = lerVagas(grupo.vagas);
      const ocupacao = b["ocupacaoAnterior"];
      if (
        !Array.isArray(ocupacao) ||
        ocupacao.length !== anteriores.length ||
        anteriores.some((vaga, i) => vaga.personagemId !== ocupacao[i])
      ) {
        throw new ConflictException("A escala mudou. Atualize a página antes de salvar.");
      }
      if (
        vagas.some((vaga, i) => {
          const anterior = anteriores[i];
          return (
            vaga.classeId !== anterior?.classeId ||
            vaga.tipo !== anterior.tipo ||
            vaga.importancia !== anterior.importancia
          );
        })
      )
        throw new BadRequestException("A composicao deve ser definida na criacao do grupo.");
      if (fechar && vagas.some((vaga) => vaga.tipo === "OBRIGATORIA" && vaga.personagemId === null)) {
        throw new ConflictException("Preencha todas as vagas obrigatorias antes de fechar o grupo.");
      }
      await this.validarVagas(tx, vagas);
      return tx.grupoInstancia.update({
        where: { id },
        data: { vagas, ...(fechar ? { fechadoEm: new Date() } : {}) },
      });
    });
  }

  private async validarVagas(tx: Tx, vagas: Vaga[]) {
    const classes = [...new Set(vagas.flatMap((vaga) => (vaga.classeId ? [vaga.classeId] : [])))];
    if (classes.length !== (await tx.classe.count({ where: { id: { in: classes }, ativa: true } }))) {
      throw new BadRequestException("Selecione apenas classes ativas.");
    }
    const ids = vagas.flatMap((vaga) => (vaga.personagemId ? [vaga.personagemId] : []));
    const personagens = await tx.personagem.findMany({
      where: { ...personagemElegivel, id: { in: ids } },
      select: { id: true, jogadorId: true, classeId: true },
    });
    if (new Set(personagens.map((p) => p.jogadorId)).size !== ids.length) {
      throw new BadRequestException("Use personagens ativos de jogadores vinculados, um por jogador.");
    }
    const porId = new Map(personagens.map((p) => [p.id, p]));
    if (
      vagas.some(
        (vaga) =>
          vaga.classeId && vaga.personagemId && porId.get(vaga.personagemId)?.classeId !== vaga.classeId,
      )
    ) {
      throw new BadRequestException("A classe do personagem precisa corresponder a classe da vaga.");
    }
  }
}

@Module({ controllers: [GruposInstanciaController, InstanciasProgramadasController] })
export class GruposInstanciaModule {}
