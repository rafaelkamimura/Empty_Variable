import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import type { Usuario } from "@prisma/client";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { ehViolacaoUnicidade } from "../comum/filtro-prisma.js";
import {
  apelidoJogador,
  booleano,
  listaPersonagens,
  nomePersonagem,
  objeto,
  uuid,
} from "../comum/validacao.js";
import { Papeis, UsuarioAtual } from "../auth/decoradores.js";
import { PrismaService } from "../prisma/prisma.service.js";

const SELECAO_JOGADOR = {
  id: true,
  apelido: true,
  criadoEm: true,
  usuario: { select: { id: true, discordUsername: true, globalName: true } },
  personagens: {
    select: {
      id: true,
      nome: true,
      ativo: true,
      classeId: true,
      nivelBase: true,
      build: true,
      equipamentos: true,
      atributos: true,
    },
    orderBy: { nome: "asc" as const },
  },
};

/** Cadastro de jogadores e personagens pelos admins (T-09). Nada é apagado: personagens são desativados. */
@Controller()
@Papeis("GESTOR")
export class JogadoresController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  private async comConflito<T>(op: () => Promise<T>, mensagem: string): Promise<T> {
    try {
      return await op();
    } catch (erro) {
      if (ehViolacaoUnicidade(erro)) throw new ConflictException(mensagem);
      throw erro;
    }
  }

  @Get("jogadores")
  listar() {
    return this.prisma.jogador.findMany({ orderBy: { apelido: "asc" }, select: SELECAO_JOGADOR });
  }

  @Post("jogadores")
  async criar(@Body() corpo: unknown, @UsuarioAtual() admin: Usuario) {
    const b = objeto(corpo);
    const apelido = apelidoJogador(b["apelido"]);
    const personagens = listaPersonagens(b["personagens"], 20);
    return this.comConflito(
      () =>
        this.prisma.$transaction(async (tx) => {
          const jogador = await tx.jogador.create({
            data: { apelido, personagens: { create: personagens.map((nome) => ({ nome })) } },
            select: SELECAO_JOGADOR,
          });
          await this.auditoria.registrar(
            {
              usuarioId: admin.id,
              acao: "JOGADOR_CRIADO",
              entidade: "jogador",
              entidadeId: jogador.id,
              depois: { apelido, personagens },
            },
            tx,
          );
          return jogador;
        }),
      "Já existe jogador com esse apelido ou personagem com esse nome.",
    );
  }

  @Patch("jogadores/:id")
  async renomear(@Param("id") idBruto: string, @Body() corpo: unknown, @UsuarioAtual() admin: Usuario) {
    const id = uuid(idBruto, "id");
    const apelido = apelidoJogador(objeto(corpo)["apelido"]);
    return this.comConflito(
      () =>
        this.prisma.$transaction(async (tx) => {
          const antes = await tx.jogador.findUnique({ where: { id } });
          if (antes === null) throw new NotFoundException("Jogador não encontrado.");
          const jogador = await tx.jogador.update({
            where: { id },
            data: { apelido },
            select: SELECAO_JOGADOR,
          });
          await this.auditoria.registrar(
            {
              usuarioId: admin.id,
              acao: "JOGADOR_ALTERADO",
              entidade: "jogador",
              entidadeId: id,
              antes: { apelido: antes.apelido },
              depois: { apelido },
            },
            tx,
          );
          return jogador;
        }),
      "Já existe jogador com esse apelido.",
    );
  }

  @Post("jogadores/:id/personagens")
  async adicionarPersonagem(
    @Param("id") idBruto: string,
    @Body() corpo: unknown,
    @UsuarioAtual() admin: Usuario,
  ) {
    const jogadorId = uuid(idBruto, "id");
    const nome = nomePersonagem(objeto(corpo)["nome"]);
    return this.comConflito(
      () =>
        this.prisma.$transaction(async (tx) => {
          if ((await tx.jogador.count({ where: { id: jogadorId } })) === 0) {
            throw new NotFoundException("Jogador não encontrado.");
          }
          const p = await tx.personagem.create({
            data: { jogadorId, nome },
            select: { id: true, nome: true, ativo: true },
          });
          await this.auditoria.registrar(
            {
              usuarioId: admin.id,
              acao: "PERSONAGEM_CRIADO",
              entidade: "personagem",
              entidadeId: p.id,
              depois: { jogadorId, nome },
            },
            tx,
          );
          return p;
        }),
      "Já existe personagem com esse nome.",
    );
  }

  @Patch("personagens/:id")
  async alterarPersonagem(
    @Param("id") idBruto: string,
    @Body() corpo: unknown,
    @UsuarioAtual() admin: Usuario,
  ) {
    const id = uuid(idBruto, "id");
    const b = objeto(corpo);
    const nome = b["nome"] === undefined ? undefined : nomePersonagem(b["nome"]);
    const ativo = b["ativo"] === undefined ? undefined : booleano(b["ativo"], "ativo");
    return this.comConflito(
      () =>
        this.prisma.$transaction(async (tx) => {
          const antes = await tx.personagem.findUnique({ where: { id } });
          if (antes === null) throw new NotFoundException("Personagem não encontrado.");
          const p = await tx.personagem.update({
            where: { id },
            data: { ...(nome === undefined ? {} : { nome }), ...(ativo === undefined ? {} : { ativo }) },
            select: { id: true, nome: true, ativo: true },
          });
          await this.auditoria.registrar(
            {
              usuarioId: admin.id,
              acao: "PERSONAGEM_ALTERADO",
              entidade: "personagem",
              entidadeId: id,
              antes: { nome: antes.nome, ativo: antes.ativo },
              depois: { nome: p.nome, ativo: p.ativo },
            },
            tx,
          );
          return p;
        }),
      "Já existe personagem com esse nome.",
    );
  }
}
