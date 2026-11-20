import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { StatusCompra, Usuario } from "@prisma/client";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { motivoInelegivel } from "../estoque/elegibilidade.js";
import { LedgerService } from "../ledger/ledger.service.js";
import { NotificacoesService } from "../notificacoes/notificacoes.service.js";
import { PrismaService, type Tx } from "../prisma/prisma.service.js";

const DIA_MS = 86_400_000;

export interface ItemVitrine {
  itemId: string;
  nome: string;
  /** ID do jogo, para a imagem da Divine Pride (D41). */
  idJogo: number | null;
  tipo: string | null;
  preco: number;
  /** Quanto este membro pode comprar agora: reserva da Nebula descontada e lotes dele mesmo excluídos. */
  disponivel: number;
  /** Há unidades consignadas por outros jogadores à venda. */
  temConsignado: boolean;
  limitePorMembro: number | null;
  limitePeriodoDias: number | null;
  /** Quanto ainda cabe no limite do período (nulo = sem limite). */
  limiteRestante: number | null;
}

interface LoteDisponivel {
  id: string;
  donoJogadorId: string | null;
  ofertaId: string | null;
  quantidade: number;
}

const SELECAO_COMPRA = {
  id: true,
  quantidade: true,
  precoUnitario: true,
  total: true,
  status: true,
  criadaEm: true,
  entregueEm: true,
  canceladaEm: true,
  motivoCancelamento: true,
  item: { select: { id: true, nome: true } },
  comprador: { select: { id: true, apelido: true } },
  entreguePor: { select: { discordUsername: true } },
  canceladaPor: { select: { discordUsername: true } },
  lotes: {
    select: {
      quantidade: true,
      valorVendedor: true,
      lote: { select: { ordem: true, origem: true, dono: { select: { apelido: true } } } },
    },
  },
};

/**
 * Épico II, M8 (T-30, T-31): vitrine, compra, entrega e cancelamento.
 *
 * - D19: os pontos saem na compra e o item fica reservado (o estoque já é baixado); o admin marca a entrega.
 * - D27: as unidades saem dos lotes por ordem de chegada; lotes do próprio comprador são pulados.
 * - D26: a reserva mínima nunca sai dos lotes do grupo.
 * - D24: saldo nunca negativo; limite opcional por membro no período.
 * - D28: o vendedor consignado recebe na ENTREGA. Cancelar antes da entrega só devolve ao comprador.
 */
@Injectable()
export class LojaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly auditoria: AuditoriaService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  /** D12: só membro com vínculo aprovado usa a loja. */
  private async jogadorDe(usuario: Usuario, tx: Tx | PrismaService = this.prisma): Promise<string> {
    const j = await tx.jogador.findUnique({ where: { usuarioId: usuario.id }, select: { id: true } });
    if (j === null) throw new ForbiddenException("Seu vínculo com um jogador ainda não foi aprovado.");
    return j.id;
  }

  /** Lotes ativos do item, na ordem de chegada, com a quantidade atual. */
  private async lotesDoItem(tx: Tx | PrismaService, itemId: string): Promise<LoteDisponivel[]> {
    const linhas = await tx.$queryRaw<
      { id: string; dono_jogador_id: string | null; oferta_id: string | null; quantidade: bigint }[]
    >`
      SELECT l.id, l.dono_jogador_id, l.oferta_id, COALESCE(SUM(m.quantidade), 0)::bigint AS quantidade
      FROM lote_estoque l LEFT JOIN movimento_estoque m ON m.lote_id = l.id
      WHERE l.item_id = ${itemId}::uuid AND l.ativo
      GROUP BY l.id ORDER BY l.ordem`;
    return linhas.map((l) => ({
      id: l.id,
      donoJogadorId: l.dono_jogador_id,
      ofertaId: l.oferta_id,
      quantidade: Number(l.quantidade),
    }));
  }

  /**
   * Quanto se pode tirar de cada lote, na ordem de chegada, sem tocar na reserva do grupo
   * nem nos lotes do próprio comprador.
   */
  private alocacoes(
    lotes: LoteDisponivel[],
    reserva: number,
    compradorId: string,
  ): { lote: LoteDisponivel; max: number }[] {
    const totalGrupo = lotes.filter((l) => l.donoJogadorId === null).reduce((a, l) => a + l.quantidade, 0);
    let livreGrupo = Math.max(0, totalGrupo - reserva);
    const r: { lote: LoteDisponivel; max: number }[] = [];
    for (const l of lotes) {
      if (l.quantidade <= 0 || l.donoJogadorId === compradorId) continue;
      if (l.donoJogadorId === null) {
        const max = Math.min(l.quantidade, livreGrupo);
        livreGrupo -= max;
        if (max > 0) r.push({ lote: l, max });
      } else {
        r.push({ lote: l, max: l.quantidade });
      }
    }
    return r;
  }

  private async compradoNoPeriodo(
    tx: Tx | PrismaService,
    compradorId: string,
    itemId: string,
    dias: number,
  ): Promise<number> {
    const r = await tx.compra.aggregate({
      where: {
        compradorJogadorId: compradorId,
        itemId,
        status: { not: "CANCELADA" },
        criadaEm: { gte: new Date(Date.now() - dias * DIA_MS) },
      },
      _sum: { quantidade: true },
    });
    return r._sum.quantidade ?? 0;
  }

  async catalogo() {
    const saldos = await this.prisma.$queryRaw<{ item_id: string; quantidade: bigint }[]>`
      SELECT item_id, SUM(quantidade)::bigint AS quantidade
      FROM saldo_lote WHERE ativo
      GROUP BY item_id HAVING SUM(quantidade) > 0`;
    const quantidadePorItem = new Map(saldos.map((saldo) => [saldo.item_id, Number(saldo.quantidade)]));
    const itens = await this.prisma.itemCatalogo.findMany({
      where: {
        id: { in: [...quantidadePorItem.keys()] },
        ativo: true,
        negociavel: true,
        vinculadoConta: false,
      },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        idJogo: true,
        tipo: true,
        precos: { orderBy: { versao: "desc" }, take: 1, select: { precoPontos: true } },
      },
    });
    return itens.map((item) => ({
      itemId: item.id,
      nome: item.nome,
      idJogo: item.idJogo,
      tipo: item.tipo,
      quantidade: quantidadePorItem.get(item.id) ?? 0,
      preco: item.precos[0]?.precoPontos ?? null,
    }));
  }

  /** US-10: itens elegíveis com preço vigente (D20, D21), com o disponível para este membro. */
  async vitrine(usuario: Usuario): Promise<{ saldo: number; itens: ItemVitrine[] }> {
    const compradorId = await this.jogadorDe(usuario);
    const itens = await this.prisma.itemCatalogo.findMany({
      where: { ativo: true, negociavel: true, vinculadoConta: false },
      orderBy: { nome: "asc" },
      include: { precos: { orderBy: { versao: "desc" }, take: 1 } },
    });
    const resultado: ItemVitrine[] = [];
    for (const item of itens) {
      const preco = item.precos[0]?.precoPontos ?? null;
      if (preco === null) continue;
      const aloc = this.alocacoes(
        await this.lotesDoItem(this.prisma, item.id),
        item.reservaMinima,
        compradorId,
      );
      const limiteRestante =
        item.limitePorMembro === null || item.limitePeriodoDias === null
          ? null
          : Math.max(
              0,
              item.limitePorMembro -
                (await this.compradoNoPeriodo(this.prisma, compradorId, item.id, item.limitePeriodoDias)),
            );
      resultado.push({
        itemId: item.id,
        nome: item.nome,
        idJogo: item.idJogo,
        tipo: item.tipo,
        preco,
        disponivel: aloc.reduce((a, x) => a + x.max, 0),
        temConsignado: aloc.some((x) => x.lote.donoJogadorId !== null),
        limitePorMembro: item.limitePorMembro,
        limitePeriodoDias: item.limitePeriodoDias,
        limiteRestante,
      });
    }
    return { saldo: await this.ledger.saldo(compradorId), itens: resultado };
  }

  /** US-11 (T-30): tudo numa transação, com o comprador e os lotes travados. */
  async comprar(usuario: Usuario, itemId: string, quantidade: number, precoEsperado?: number) {
    return this.prisma.$transaction(async (tx) => {
      const compradorId = await this.jogadorDe(usuario, tx);
      // 1. Trava o comprador: duas compras simultâneas dele passam uma de cada vez (CT-83).
      await tx.$queryRaw`SELECT id FROM jogador WHERE id = ${compradorId}::uuid FOR UPDATE`;

      // 2. Elegibilidade e preço vigente (D20, D21).
      const item = await tx.itemCatalogo.findUnique({
        where: { id: itemId },
        include: { precos: { orderBy: { versao: "desc" }, take: 1 } },
      });
      if (item === null) throw new NotFoundException("Item não encontrado.");
      const inelegivel = motivoInelegivel(item);
      if (inelegivel !== null) throw new UnprocessableEntityException(`Item fora da loja: ${inelegivel}`);
      const preco = item.precos[0]?.precoPontos ?? null;
      if (preco === null) throw new UnprocessableEntityException("Item sem preço: não está à venda.");
      if (precoEsperado !== undefined && precoEsperado !== preco) {
        throw new ConflictException("O preço mudou. Feche e reabra o item para conferir o preço atualizado.");
      }
      const config = await tx.configLoja.findFirst({ orderBy: { versao: "desc" } });
      if (config === null) throw new ConflictException("Parâmetros da loja não cadastrados.");

      // 3. Trava os lotes do item (CT-84) e calcula a alocação por ordem de chegada (D27, D26).
      await tx.$queryRaw`SELECT id FROM lote_estoque WHERE item_id = ${itemId}::uuid AND ativo ORDER BY ordem FOR UPDATE`;
      const aloc = this.alocacoes(await this.lotesDoItem(tx, itemId), item.reservaMinima, compradorId);
      const disponivel = aloc.reduce((a, x) => a + x.max, 0);
      if (disponivel < quantidade) {
        throw new ConflictException(
          disponivel === 0
            ? "Item sem unidades disponíveis."
            : `Só há ${disponivel} unidade(s) disponível(is).`,
        );
      }

      // 4. Limite do período (D24).
      if (item.limitePorMembro !== null && item.limitePeriodoDias !== null) {
        const ja = await this.compradoNoPeriodo(tx, compradorId, itemId, item.limitePeriodoDias);
        if (ja + quantidade > item.limitePorMembro) {
          throw new ConflictException(
            `Limite de ${item.limitePorMembro} a cada ${item.limitePeriodoDias} dia(s): você ainda pode comprar ${Math.max(0, item.limitePorMembro - ja)}.`,
          );
        }
      }

      // 5. Saldo nunca negativo (D24, CT-82).
      const total = quantidade * preco;
      const saldo = await this.ledger.saldoTx(tx, compradorId);
      if (saldo < total) {
        throw new UnprocessableEntityException(
          `Saldo insuficiente: a compra custa ${total} e você tem ${saldo}.`,
        );
      }

      // 6. Grava a compra, as linhas por lote, a baixa no estoque e o débito do comprador.
      const compra = await tx.compra.create({
        data: {
          compradorJogadorId: compradorId,
          itemId,
          quantidade,
          precoUnitario: preco,
          total,
          configLojaId: config.id,
        },
      });
      let falta = quantidade;
      for (const { lote, max } of aloc) {
        if (falta === 0) break;
        const q = Math.min(max, falta);
        falta -= q;
        const valor = q * preco;
        // D22/D28: o valor do vendedor fica gravado agora (taxa vigente na compra) e é creditado na entrega.
        const valorVendedor =
          lote.donoJogadorId === null ? 0 : valor - Math.floor((valor * config.taxaConsignacaoBp) / 10_000);
        await tx.compraLote.create({
          data: { compraId: compra.id, loteId: lote.id, quantidade: q, valorVendedor },
        });
        await tx.movimentoEstoque.create({
          data: {
            loteId: lote.id,
            quantidade: -q,
            tipo: "VENDA",
            compraId: compra.id,
            criadoPorId: usuario.id,
          },
        });
        if (lote.ofertaId !== null && q === lote.quantidade) {
          await tx.ofertaVenda.updateMany({
            where: { id: lote.ofertaId, status: "APROVADA" },
            data: { status: "ESGOTADA" },
          });
        }
      }
      await this.ledger.lancar(tx, {
        jogadorId: compradorId,
        valor: -total,
        tipo: "COMPRA",
        criadoPorId: usuario.id,
        compraId: compra.id,
        observacao: `${quantidade}× ${item.nome}`,
      });
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          acao: "LOJA_COMPRA",
          entidade: "compra",
          entidadeId: compra.id,
          depois: { item: item.nome, quantidade, preco, total },
        },
        tx,
      );
      return { compraId: compra.id, total, saldo: saldo - total };
    });
  }

  /** Trava a compra e confere que ainda está pendente. */
  private async travarPendente(tx: Tx, compraId: string) {
    await tx.$queryRaw`SELECT id FROM compra WHERE id = ${compraId}::uuid FOR UPDATE`;
    const compra = await tx.compra.findUnique({
      where: { id: compraId },
      include: {
        item: true,
        lotes: { include: { lote: { select: { donoJogadorId: true, ofertaId: true, ativo: true } } } },
      },
    });
    if (compra === null) throw new NotFoundException("Compra não encontrada.");
    if (compra.status === "ENTREGUE") throw new ConflictException("Esta compra já foi entregue.");
    if (compra.status === "CANCELADA") throw new ConflictException("Esta compra já foi cancelada.");
    return compra;
  }

  /** US-12: o admin marca a entrega depois da troca no jogo. D28: só aqui o vendedor consignado recebe. */
  async entregar(compraId: string, admin: Usuario) {
    return this.prisma.$transaction(async (tx) => {
      const compra = await this.travarPendente(tx, compraId);
      const vendas = new Map<string, { quantidade: number; pontos: number }>();
      for (const linha of compra.lotes) {
        if (linha.lote.donoJogadorId === null || linha.valorVendedor === 0) continue;
        await this.ledger.lancar(tx, {
          jogadorId: linha.lote.donoJogadorId,
          valor: linha.valorVendedor,
          tipo: "VENDA",
          criadoPorId: admin.id,
          compraId,
          compraLoteId: linha.id,
          observacao: `${linha.quantidade}× ${compra.item.nome}`,
        });
        const venda = vendas.get(linha.lote.donoJogadorId) ?? { quantidade: 0, pontos: 0 };
        vendas.set(linha.lote.donoJogadorId, {
          quantidade: venda.quantidade + linha.quantidade,
          pontos: venda.pontos + linha.valorVendedor,
        });
      }
      await tx.compra.update({
        where: { id: compraId },
        data: { status: "ENTREGUE", entregueEm: new Date(), entreguePorId: admin.id },
      });
      await this.notificacoes.registrar(tx, [
        {
          destinatario: { jogadorId: compra.compradorJogadorId },
          evento: {
            tipo: "COMPRA_ENTREGUE",
            dados: { compraId, item: compra.item.nome, quantidade: compra.quantidade, total: compra.total },
          },
        },
        ...[...vendas].map(([jogadorId, v]) => ({
          destinatario: { jogadorId },
          evento: {
            tipo: "VENDA_CREDITADA" as const,
            dados: { compraId, item: compra.item.nome, quantidade: v.quantidade, pontos: v.pontos },
          },
        })),
      ]);
      await this.auditoria.registrar(
        { usuarioId: admin.id, acao: "LOJA_ENTREGA", entidade: "compra", entidadeId: compraId },
        tx,
      );
      return this.detalhe(tx, compraId);
    });
  }

  /**
   * US-12, D25: cancela antes da entrega — estorna o débito do comprador e devolve as unidades aos lotes.
   * O membro só cancela as próprias compras; o admin cancela qualquer uma (com motivo).
   */
  async cancelar(compraId: string, usuario: Usuario, motivo: string | null, comoAdmin: boolean) {
    return this.prisma.$transaction(async (tx) => {
      const compra = await this.travarPendente(tx, compraId);
      if (!comoAdmin) {
        const proprio = await this.jogadorDe(usuario, tx);
        if (compra.compradorJogadorId !== proprio) throw new ForbiddenException("Esta compra não é sua.");
      } else if (motivo === null) {
        throw new BadRequestException("Informe o motivo do cancelamento.");
      }
      await this.ledger.estornarCompra(
        tx,
        compraId,
        usuario.id,
        `Compra cancelada${motivo ? `: ${motivo}` : ""}`,
      );
      for (const linha of compra.lotes) {
        await tx.movimentoEstoque.create({
          data: {
            loteId: linha.loteId,
            quantidade: linha.quantidade,
            tipo: "DEVOLUCAO",
            compraId,
            criadoPorId: usuario.id,
          },
        });
        // A oferta esgotada volta a vender se o lote dela ainda estiver ativo (CT-103).
        if (linha.lote.ofertaId !== null && linha.lote.ativo) {
          await tx.ofertaVenda.updateMany({
            where: { id: linha.lote.ofertaId, status: "ESGOTADA" },
            data: { status: "APROVADA" },
          });
        }
      }
      await tx.compra.update({
        where: { id: compraId },
        data: {
          status: "CANCELADA",
          canceladaEm: new Date(),
          canceladaPorId: usuario.id,
          motivoCancelamento: motivo,
        },
      });
      if (comoAdmin) {
        await this.notificacoes.registrar(
          tx,
          [
            {
              destinatario: { jogadorId: compra.compradorJogadorId },
              evento: {
                tipo: "COMPRA_CANCELADA",
                dados: {
                  compraId,
                  item: compra.item.nome,
                  quantidade: compra.quantidade,
                  total: compra.total,
                  motivo,
                },
              },
            },
          ],
          usuario.id,
        );
      }
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          acao: comoAdmin ? "LOJA_CANCELAMENTO_ADMIN" : "LOJA_CANCELAMENTO",
          entidade: "compra",
          entidadeId: compraId,
          depois: { motivo },
        },
        tx,
      );
      return this.detalhe(tx, compraId);
    });
  }

  private detalhe(tx: Tx | PrismaService, compraId: string) {
    return tx.compra.findUniqueOrThrow({ where: { id: compraId }, select: SELECAO_COMPRA });
  }

  /** US-13: compras do próprio membro (D14). */
  async minhas(usuario: Usuario) {
    const compradorId = await this.jogadorDe(usuario);
    return this.prisma.compra.findMany({
      where: { compradorJogadorId: compradorId },
      orderBy: { criadaEm: "desc" },
      take: 200,
      select: SELECAO_COMPRA,
    });
  }

  /** Fila do admin: pendentes das mais antigas para as mais novas (risco de entrega parada). */
  listar(status: StatusCompra | undefined) {
    return this.prisma.compra.findMany({
      where: status === undefined ? {} : { status },
      orderBy: { criadaEm: status === "PENDENTE_ENTREGA" ? "asc" : "desc" },
      take: 300,
      select: SELECAO_COMPRA,
    });
  }
}
