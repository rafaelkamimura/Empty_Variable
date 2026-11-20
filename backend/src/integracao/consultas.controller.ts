import { BadRequestException, Controller, Get, Inject, Module, Param, Query } from "@nestjs/common";
import type { TipoLancamento } from "@prisma/client";
import { Integracao } from "../auth/decoradores.js";
import { CONFIGURACAO, type Configuracao } from "../configuracao.js";
import { LedgerModule } from "../ledger/ledger.module.js";
import { LedgerService } from "../ledger/ledger.service.js";
import { LojaModule } from "../loja/loja.module.js";
import { LojaService } from "../loja/loja.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

/** Endereços públicos do site que o bot pode oferecer. Só telas já liberadas (`telasLiberadas` no web). */
export interface LinksPublicos {
  carteira: string;
  loja: string;
  vinculo: string;
}

/**
 * Resposta das consultas de membro quando não há jogador para mostrar. A situação é verificada nesta ordem:
 * - `desconhecido`: o Discord ID nunca entrou no site;
 * - `inativo`: o usuário foi desativado por um admin;
 * - `sem_vinculo`: entrou, mas ainda não tem jogador aprovado (D12).
 * Com jogador, a situação é `vinculado` e vêm saldo e extrato.
 */
export type MembroSemJogador =
  | { situacao: "desconhecido" | "inativo"; links: LinksPublicos }
  | { situacao: "sem_vinculo"; solicitacaoPendente: boolean; links: LinksPublicos };

export interface SaldoMembro {
  situacao: "vinculado";
  jogador: { apelido: string };
  saldo: number;
  links: LinksPublicos;
}

export interface LancamentoResumido {
  id: string;
  criadoEm: Date;
  tipo: TipoLancamento;
  valor: number;
  /** Complemento curto em nomes próprios (item, jogador, instância), sem frase: o bot traduz o tipo. */
  detalhe: string | null;
}

export interface ExtratoMembro extends Omit<SaldoMembro, "situacao"> {
  situacao: "vinculado";
  lancamentos: LancamentoResumido[];
  /** Quantos lançamentos o jogador tem ao todo (a lista vem limitada). */
  total: number;
}

export interface ItemLoja {
  itemId: string;
  nome: string;
  /** Preço vigente em pontos; null quando ainda não definido (o site mostra "Preço a definir"). */
  preco: number | null;
  quantidade: number;
}

export interface VitrineIntegracao {
  itens: ItemLoja[];
  /** Quantos itens estão à venda ao todo (a lista vem limitada). */
  total: number;
  links: LinksPublicos;
}

type LancamentoExtrato = Awaited<ReturnType<LedgerService["extrato"]>>[number];

const LIMITE_PADRAO_EXTRATO = 10;
const LIMITE_PADRAO_LOJA = 25;
const LIMITE_MAXIMO = 25;

/** Discord IDs são snowflakes: só dígitos. Qualquer outra coisa é erro do chamador. */
function discordIdValido(bruto: string): string {
  if (!/^\d{1,25}$/.test(bruto)) throw new BadRequestException("discordId inválido.");
  return bruto;
}

/** Lê o `?limite=` opcional (texto na query) como inteiro entre 1 e LIMITE_MAXIMO. */
function limiteDe(bruto: string | undefined, padrao: number): number {
  if (bruto === undefined || bruto === "") return padrao;
  const valor = Number(bruto);
  if (!Number.isInteger(valor) || valor < 1 || valor > LIMITE_MAXIMO) {
    throw new BadRequestException(`limite deve ser um número inteiro entre 1 e ${LIMITE_MAXIMO}.`);
  }
  return valor;
}

/**
 * Complemento de um lançamento só com nomes próprios, para o bot montar a linha no idioma do membro.
 * O site descreve o mesmo lançamento por extenso em `descreverLancamento` (web/src/app/core/runs.ts).
 */
export function detalheDoLancamento(l: LancamentoExtrato): string | null {
  switch (l.tipo) {
    case "PARTICIPACAO":
      return l.run === null ? null : `${l.run.versaoInstancia.instancia.nome} · ${l.run.encontro.nome}`;
    case "EMPRESTIMO_DEBITO":
    case "EMPRESTIMO_CREDITO":
      return l.emprestimo === null ? null : (l.emprestimo.item?.nome ?? l.emprestimo.itemDescricao ?? null);
    case "COMPRA":
      return l.compra === null ? null : `${l.compra.quantidade}× ${l.compra.item.nome}`;
    case "VENDA":
      return l.compra === null
        ? null
        : `${l.compraLote?.quantidade ?? l.compra.quantidade}× ${l.compra.item.nome}`;
    case "NEBULA":
      return l.solicitacaoNebula?.receita.nome ?? null;
    case "TRANSFERENCIA_ENVIADA":
      return l.transferencia?.destinatario.apelido ?? null;
    case "TRANSFERENCIA_RECEBIDA":
      return l.transferencia?.remetente.apelido ?? null;
    default:
      return l.observacao;
  }
}

/**
 * Consultas somente leitura para o bot do Discord (/saldo, /extrato, /loja), por Discord ID.
 * Os números vêm dos mesmos serviços do site (LedgerService, LojaService), então sempre batem.
 *
 * As situações sem jogador respondem 200 com `situacao`, não 4xx: o bot precisa distinguir cada
 * uma para orientar o membro, e um 4xx significaria erro do chamador. Nada aqui altera dados.
 */
@Integracao()
@Controller("integracao")
export class ConsultasIntegracaoController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly loja: LojaService,
    @Inject(CONFIGURACAO) private readonly config: Configuracao,
  ) {}

  /** Links absolutos para as telas liberadas, respeitando a sub-rota (APP_BASE_PATH). */
  private links(): LinksPublicos {
    const raiz = `${this.config.appOrigin}${this.config.caminhoBase}`;
    return { carteira: `${raiz}/carteira`, loja: `${raiz}/loja`, vinculo: `${raiz}/vinculo` };
  }

  /** Resolve o Discord ID até o jogador, ou devolve a situação que impede a consulta. */
  private async jogadorDe(
    discordId: string,
  ): Promise<{ jogador: { id: string; apelido: string } } | MembroSemJogador> {
    const links = this.links();
    const usuario = await this.prisma.usuario.findUnique({
      where: { discordId },
      select: { id: true, ativo: true, jogador: { select: { id: true, apelido: true } } },
    });
    if (usuario === null) return { situacao: "desconhecido", links };
    if (!usuario.ativo) return { situacao: "inativo", links };
    if (usuario.jogador === null) {
      const pendente = await this.prisma.solicitacaoVinculo.count({
        where: { usuarioId: usuario.id, status: "PENDENTE" },
      });
      return { situacao: "sem_vinculo", solicitacaoPendente: pendente > 0, links };
    }
    return { jogador: usuario.jogador };
  }

  /** Saldo atual do membro (o mesmo da barra superior do site). */
  @Get("membros/:discordId/saldo")
  async saldo(@Param("discordId") bruto: string): Promise<SaldoMembro | MembroSemJogador> {
    const r = await this.jogadorDe(discordIdValido(bruto));
    if (!("jogador" in r)) return r;
    return {
      situacao: "vinculado",
      jogador: { apelido: r.jogador.apelido },
      saldo: await this.ledger.saldo(r.jogador.id),
      links: this.links(),
    };
  }

  /** Lançamentos mais recentes do membro (padrão 10, máximo 25), do mais novo para o mais antigo. */
  @Get("membros/:discordId/extrato")
  async extrato(
    @Param("discordId") bruto: string,
    @Query("limite") limiteBruto?: string,
  ): Promise<ExtratoMembro | MembroSemJogador> {
    const discordId = discordIdValido(bruto);
    const limite = limiteDe(limiteBruto, LIMITE_PADRAO_EXTRATO);
    const r = await this.jogadorDe(discordId);
    if (!("jogador" in r)) return r;
    const [saldo, lancamentos] = await Promise.all([
      this.ledger.saldo(r.jogador.id),
      this.ledger.extrato(r.jogador.id),
    ]);
    return {
      situacao: "vinculado",
      jogador: { apelido: r.jogador.apelido },
      saldo,
      lancamentos: lancamentos.slice(0, limite).map((l) => ({
        id: l.id,
        criadoEm: l.criadoEm,
        tipo: l.tipo,
        valor: l.valor,
        detalhe: detalheDoLancamento(l),
      })),
      total: lancamentos.length,
      links: this.links(),
    };
  }

  /** O que está à venda agora, igual à página /loja do site (padrão e máximo 25 itens, por nome). */
  @Get("loja")
  async vitrine(@Query("limite") limiteBruto?: string): Promise<VitrineIntegracao> {
    const limite = limiteDe(limiteBruto, LIMITE_PADRAO_LOJA);
    const itens = await this.loja.catalogo();
    return {
      itens: itens.slice(0, limite).map(({ itemId, nome, preco, quantidade }) => ({
        itemId,
        nome,
        preco,
        quantidade,
      })),
      total: itens.length,
      links: this.links(),
    };
  }
}

@Module({ imports: [LedgerModule, LojaModule], controllers: [ConsultasIntegracaoController] })
export class ConsultasIntegracaoModule {}
