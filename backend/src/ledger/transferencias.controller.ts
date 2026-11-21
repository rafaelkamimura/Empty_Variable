import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Post,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { Usuario } from "@prisma/client";
import { UsuarioAtual } from "../auth/decoradores.js";
import { inteiro, objeto, uuid } from "../comum/validacao.js";
import { NotificacoesService } from "../notificacoes/notificacoes.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { LedgerService } from "./ledger.service.js";

@Controller("carteira/transferencias")
export class TransferenciasController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  @Get("destinatarios")
  async destinatarios(@UsuarioAtual() usuario: Usuario) {
    const remetente = await this.prisma.jogador.findUnique({ where: { usuarioId: usuario.id } });
    if (!remetente) throw new ForbiddenException("Vincule sua conta a um jogador para transferir pontos.");
    return this.prisma.jogador.findMany({
      where: { id: { not: remetente.id }, usuario: { is: { ativo: true } } },
      orderBy: { apelido: "asc" },
      select: { id: true, apelido: true },
    });
  }

  @Post()
  async enviar(@Body() corpo: unknown, @UsuarioAtual() usuario: Usuario) {
    const b = objeto(corpo);
    const id = uuid(b["id"], "Identificador da transferência").toLowerCase();
    const destinatarioId = uuid(b["destinatarioId"], "Destinatário").toLowerCase();
    const pontos = inteiro(b["pontos"], "Pontos", 1, 2_147_483_647);

    return this.prisma.$transaction(async (tx) => {
      const remetente = await tx.jogador.findUnique({
        where: { usuarioId: usuario.id },
        select: { id: true, apelido: true },
      });
      if (!remetente) throw new ForbiddenException("Vincule sua conta a um jogador para transferir pontos.");
      if (remetente.id === destinatarioId) throw new BadRequestException("Escolha outro jogador.");

      // A mesma trava usada nas compras impede gastar o saldo em duas operações simultâneas.
      // A ordem por ID também evita deadlocks em transferências em sentidos opostos.
      await tx.$queryRaw`SELECT id FROM jogador
        WHERE id IN (${remetente.id}::uuid, ${destinatarioId}::uuid) ORDER BY id FOR UPDATE`;

      const existente = await tx.transferenciaPontos.findUnique({ where: { id } });
      if (existente) {
        if (
          existente.remetenteId !== remetente.id ||
          existente.destinatarioId !== destinatarioId ||
          existente.pontos !== pontos
        ) {
          throw new ConflictException("Este identificador já foi usado em outra transferência.");
        }
        return existente;
      }

      const vinculo = await tx.jogador.findUnique({ where: { usuarioId: usuario.id }, select: { id: true } });
      if (vinculo?.id !== remetente.id)
        throw new ForbiddenException("Seu vínculo mudou. Recarregue a carteira.");
      const destinatario = await tx.jogador.findFirst({
        where: { id: destinatarioId, usuario: { is: { ativo: true } } },
        select: { id: true },
      });
      if (!destinatario) throw new NotFoundException("Destinatário sem vínculo ativo.");
      if ((await this.ledger.saldoTx(tx, remetente.id)) < pontos) {
        throw new UnprocessableEntityException("Saldo insuficiente na carteira.");
      }

      const transferencia = await tx.transferenciaPontos.create({
        data: { id, remetenteId: remetente.id, destinatarioId, pontos },
      });
      await this.ledger.lancar(tx, {
        jogadorId: remetente.id,
        valor: -pontos,
        tipo: "TRANSFERENCIA_ENVIADA",
        criadoPorId: usuario.id,
        transferenciaId: id,
      });
      await this.ledger.lancar(tx, {
        jogadorId: destinatarioId,
        valor: pontos,
        tipo: "TRANSFERENCIA_RECEBIDA",
        criadoPorId: usuario.id,
        transferenciaId: id,
      });
      await this.notificacoes.registrar(tx, [
        {
          destinatario: { jogadorId: destinatarioId },
          evento: {
            tipo: "TRANSFERENCIA_RECEBIDA",
            dados: { transferenciaId: id, pontos, remetente: remetente.apelido },
          },
        },
      ]);
      return transferencia;
    });
  }
}
