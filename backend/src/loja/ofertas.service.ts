import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { StatusOferta, Usuario } from "@prisma/client";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { motivoInelegivel } from "../estoque/elegibilidade.js";
import { NotificacoesService } from "../notificacoes/notificacoes.service.js";
import { PrismaService, type Tx } from "../prisma/prisma.service.js";

const SELECAO_OFERTA = {
  id: true,
  quantidade: true,
  status: true,
  motivo: true,
  criadaEm: true,
  analisadaEm: true,
  item: { select: { id: true, nome: true, tipo: true } },
  jogador: { select: { id: true, apelido: true } },
  analisadaPor: { select: { discordUsername: true } },
  lote: { select: { id: true, ordem: true, ativo: true } },
};

/**
 * Épico II, M9 (T-34): ofertas de jogadores em consignação (D22, C12, C13, D25, D28).
 *
 * PENDENTE → (admin recebe o item no jogo) APROVADA → [vendida até zerar] ESGOTADA
 *          ↘ REJEITADA (com motivo)        ↘ RETIRADA_SOLICITADA → (admin devolve no jogo) RETIRADA
 * Uma oferta pendente retirada pelo vendedor vai direto para RETIRADA (o item nunca saiu dele).
 * O preço é o do item no catálogo (C12); o vendedor recebe na entrega de cada compra (D28).
 */
@Injectable()
export class OfertasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  private async jogadorDe(usuario: Usuario, tx: Tx | PrismaService = this.prisma): Promise<string> {
    const j = await tx.jogador.findUnique({ where: { usuarioId: usuario.id }, select: { id: true } });
    if (j === null) throw new ForbiddenException("Seu vínculo com um jogador ainda não foi aprovado.");
    return j.id;
  }

  /** Itens que um membro pode oferecer: os elegíveis para a loja (D20), com ou sem preço definido. */
  async itensOfertaveis(usuario: Usuario) {
    await this.jogadorDe(usuario);
    const itens = await this.prisma.itemCatalogo.findMany({
      where: { ativo: true, negociavel: true, vinculadoConta: false },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        tipo: true,
        precos: { orderBy: { versao: "desc" }, take: 1, select: { precoPontos: true } },
      },
    });
    return itens.map(({ precos, ...i }) => ({ ...i, precoVigente: precos[0]?.precoPontos ?? null }));
  }

  async criar(usuario: Usuario, itemId: string, quantidade: number) {
    return this.prisma.$transaction(async (tx) => {
      const jogadorId = await this.jogadorDe(usuario, tx);
      const item = await tx.itemCatalogo.findUnique({ where: { id: itemId } });
      if (item === null) throw new NotFoundException("Item não encontrado.");
      const motivo = motivoInelegivel(item);
      if (motivo !== null)
        throw new UnprocessableEntityException(`Este item não pode ser oferecido: ${motivo}`);
      const oferta = await tx.ofertaVenda.create({
        data: { jogadorId, itemId, quantidade },
        select: SELECAO_OFERTA,
      });
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          acao: "OFERTA_CRIADA",
          entidade: "oferta_venda",
          entidadeId: oferta.id,
          depois: { item: item.nome, quantidade },
        },
        tx,
      );
      return oferta;
    });
  }

  minhas(usuario: Usuario) {
    return this.jogadorDe(usuario).then((jogadorId) =>
      this.prisma.ofertaVenda.findMany({
        where: { jogadorId },
        orderBy: { criadaEm: "desc" },
        take: 200,
        select: SELECAO_OFERTA,
      }),
    );
  }

  /** Fila do admin: pendentes e retiradas a concluir, das mais antigas para as mais novas. */
  listar(status: StatusOferta | undefined) {
    return this.prisma.ofertaVenda.findMany({
      where: status === undefined ? {} : { status },
      orderBy: { criadaEm: status === undefined ? "desc" : "asc" },
      take: 300,
      select: SELECAO_OFERTA,
    });
  }

  private async travar(tx: Tx, id: string) {
    await tx.$queryRaw`SELECT id FROM oferta_venda WHERE id = ${id}::uuid FOR UPDATE`;
    const oferta = await tx.ofertaVenda.findUnique({ where: { id }, include: { item: true, lote: true } });
    if (oferta === null) throw new NotFoundException("Oferta não encontrada.");
    return oferta;
  }

  private async exigir(tx: Tx, id: string, ...status: StatusOferta[]) {
    const oferta = await this.travar(tx, id);
    if (!status.includes(oferta.status)) {
      throw new ConflictException(`Esta oferta está ${oferta.status.toLowerCase().replace(/_/g, " ")}.`);
    }
    return oferta;
  }

  /** Aprovar = o admin já recebeu o item no jogo: vira lote consignado do vendedor (D22). */
  async aprovar(id: string, admin: Usuario) {
    return this.prisma.$transaction(async (tx) => {
      const oferta = await this.exigir(tx, id, "PENDENTE");
      // O item pode ter deixado de ser elegível depois da oferta (ex.: descobriu-se que é vinculado à conta).
      const motivo = motivoInelegivel(oferta.item);
      if (motivo !== null)
        throw new UnprocessableEntityException(`O item não pode ir para a loja: ${motivo} Rejeite a oferta.`);
      const lote = await tx.loteEstoque.create({
        data: {
          itemId: oferta.itemId,
          donoJogadorId: oferta.jogadorId,
          origem: "OFERTA",
          ofertaId: id,
          criadoPorId: admin.id,
        },
      });
      await tx.movimentoEstoque.create({
        data: {
          loteId: lote.id,
          quantidade: oferta.quantidade,
          tipo: "ENTRADA",
          motivo: "Oferta aprovada",
          criadoPorId: admin.id,
        },
      });
      await tx.ofertaVenda.update({
        where: { id },
        data: { status: "APROVADA", analisadaPorId: admin.id, analisadaEm: new Date() },
      });
      await this.notificacoes.registrar(
        tx,
        [
          {
            destinatario: { jogadorId: oferta.jogadorId },
            evento: {
              tipo: "OFERTA_APROVADA",
              dados: { ofertaId: id, item: oferta.item.nome, quantidade: oferta.quantidade },
            },
          },
        ],
        admin.id,
      );
      await this.auditoria.registrar(
        { usuarioId: admin.id, acao: "OFERTA_APROVADA", entidade: "oferta_venda", entidadeId: id },
        tx,
      );
      return tx.ofertaVenda.findUniqueOrThrow({ where: { id }, select: SELECAO_OFERTA });
    });
  }

  async rejeitar(id: string, motivo: string, admin: Usuario) {
    return this.prisma.$transaction(async (tx) => {
      await this.exigir(tx, id, "PENDENTE");
      const oferta = await tx.ofertaVenda.update({
        where: { id },
        data: { status: "REJEITADA", motivo, analisadaPorId: admin.id, analisadaEm: new Date() },
        select: SELECAO_OFERTA,
      });
      await this.notificacoes.registrar(
        tx,
        [
          {
            destinatario: { jogadorId: oferta.jogador.id },
            evento: {
              tipo: "OFERTA_REJEITADA",
              dados: { ofertaId: id, item: oferta.item.nome, quantidade: oferta.quantidade, motivo },
            },
          },
        ],
        admin.id,
      );
      await this.auditoria.registrar(
        {
          usuarioId: admin.id,
          acao: "OFERTA_REJEITADA",
          entidade: "oferta_venda",
          entidadeId: id,
          depois: { motivo },
        },
        tx,
      );
      return oferta;
    });
  }

  /**
   * D25: o vendedor retira enquanto não foi vendida. Pendente: sai na hora (o item nunca saiu dele).
   * Aprovada: o lote para de vender agora e o admin conclui ao devolver o item no jogo.
   */
  async retirar(id: string, usuario: Usuario) {
    return this.prisma.$transaction(async (tx) => {
      const jogadorId = await this.jogadorDe(usuario, tx);
      const oferta = await this.travar(tx, id);
      if (oferta.jogadorId !== jogadorId) throw new ForbiddenException("Esta oferta não é sua.");
      if (oferta.status === "PENDENTE") {
        await tx.ofertaVenda.update({ where: { id }, data: { status: "RETIRADA" } });
      } else if (oferta.status === "APROVADA") {
        if (oferta.lote !== null)
          await tx.loteEstoque.update({ where: { id: oferta.lote.id }, data: { ativo: false } });
        await tx.ofertaVenda.update({ where: { id }, data: { status: "RETIRADA_SOLICITADA" } });
      } else {
        throw new ConflictException(
          oferta.status === "ESGOTADA"
            ? "Todas as unidades já foram vendidas."
            : "Esta oferta não pode mais ser retirada.",
        );
      }
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          acao: "OFERTA_RETIRADA_PEDIDA",
          entidade: "oferta_venda",
          entidadeId: id,
          antes: { status: oferta.status },
        },
        tx,
      );
      return tx.ofertaVenda.findUniqueOrThrow({ where: { id }, select: SELECAO_OFERTA });
    });
  }

  /**
   * O admin devolveu no jogo o que sobrou: baixa o saldo restante do lote (RETIRADA).
   * Compras já feitas desse lote continuam válidas e podem ser entregues (CT-102).
   */
  async concluirRetirada(id: string, admin: Usuario) {
    return this.prisma.$transaction(async (tx) => {
      const oferta = await this.exigir(tx, id, "RETIRADA_SOLICITADA");
      let devolvido = 0;
      if (oferta.lote !== null) {
        await tx.$queryRaw`SELECT id FROM lote_estoque WHERE id = ${oferta.lote.id}::uuid FOR UPDATE`;
        // Uma compra pendente cancelada depois devolveria unidades a um lote já encerrado.
        const pendentes = await tx.compraLote.count({
          where: { loteId: oferta.lote.id, compra: { status: "PENDENTE_ENTREGA" } },
        });
        if (pendentes > 0) {
          throw new ConflictException(
            `Há ${pendentes} compra(s) pendente(s) deste lote: entregue ou cancele antes de concluir a retirada.`,
          );
        }
        const r = await tx.movimentoEstoque.aggregate({
          where: { loteId: oferta.lote.id },
          _sum: { quantidade: true },
        });
        devolvido = r._sum.quantidade ?? 0;
        if (devolvido > 0) {
          await tx.movimentoEstoque.create({
            data: {
              loteId: oferta.lote.id,
              quantidade: -devolvido,
              tipo: "RETIRADA",
              motivo: "Devolvido ao vendedor",
              criadoPorId: admin.id,
            },
          });
        }
      }
      await tx.ofertaVenda.update({ where: { id }, data: { status: "RETIRADA" } });
      await this.auditoria.registrar(
        {
          usuarioId: admin.id,
          acao: "OFERTA_RETIRADA_CONCLUIDA",
          entidade: "oferta_venda",
          entidadeId: id,
          depois: { devolvido },
        },
        tx,
      );
      return {
        ...(await tx.ofertaVenda.findUniqueOrThrow({ where: { id }, select: SELECAO_OFERTA })),
        devolvido,
      };
    });
  }
}
