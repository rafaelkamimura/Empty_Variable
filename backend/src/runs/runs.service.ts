import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  calcularParticipacao,
  dividirEmprestimos,
  type ResultadoDivisao,
  type ResultadoParticipacao,
} from "@betel/scoring";
import type { Prisma, StatusRun, Usuario } from "@prisma/client";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { paraConfigMotor } from "../cadastros/config-pontuacao.service.js";
import { LedgerService } from "../ledger/ledger.service.js";
import { PrismaService, type Tx } from "../prisma/prisma.service.js";
import type { EntradaRun } from "./entrada-run.js";
import { InstanciasService } from "../instancias/instancias.service.js";
import { NotificacoesService } from "../notificacoes/notificacoes.service.js";

export interface ResultadoRegistro {
  runId: string;
  /** D9a/C11: participações em que as sugestões passaram do teto e foram reduzidas (aviso informativo). */
  avisosReducao: { personagemId: string; somaPercentuaisBp: number; tetoCredoresBp: number }[];
}

/** % efetivo com 6 casas, só para exibição (C2). O cálculo usa a fórmula inteira exata do motor. */
function pctEfetivo(aplicadoBp: number, div: ResultadoDivisao, tetoBp: number): string {
  // % = bp / 100. Com redução: bp × teto / soma.
  const num = div.reducaoProporcionalAplicada ? BigInt(aplicadoBp) * BigInt(tetoBp) : BigInt(aplicadoBp);
  const den = div.reducaoProporcionalAplicada ? BigInt(div.somaPercentuaisBp) * 100n : 100n;
  const micro = (num * 1_000_000n * 2n + den) / (2n * den); // arredonda meio para cima
  const inteiro = micro / 1_000_000n;
  const frac = (micro % 1_000_000n).toString().padStart(6, "0");
  return `${inteiro}.${frac}`;
}

const SELECAO_DETALHE = {
  id: true,
  data: true,
  encontro: { select: { id: true, nome: true, codigo: true, multiplicadorCentesimos: true } },
  versaoInstancia: { select: { id: true, versao: true, instancia: { select: { id: true, nome: true } } } },
  status: true,
  pontuacaoBetelgeuse: true,
  observacao: true,
  criadaEm: true,
  corrigeRunId: true,
  corrigidaPor: { select: { id: true } },
  config: { select: { id: true, versao: true } },
  registradaPor: { select: { id: true, discordUsername: true } },
  participacoes: {
    orderBy: { pontosGerados: "desc" as const },
    select: {
      id: true,
      personagem: { select: { id: true, nome: true } },
      jogador: { select: { id: true, apelido: true } },
      funcao: {
        select: {
          id: true,
          nome: true,
          classe: { select: { id: true, nomeOficial: true, apelidoGrupo: true } },
        },
      },
      fracaoCentesimos: true,
      rank: true,
      base: true,
      alphaCentesimos: true,
      pesoCentesimos: true,
      multiplicadorChefeCentesimos: true,
      multiplicadorStatusCentesimos: true,
      pontosGerados: true,
      emprestimos: {
        select: {
          id: true,
          credor: { select: { id: true, apelido: true } },
          item: { select: { id: true, nome: true, idJogo: true } },
          itemDescricao: true,
          categoria: true,
          pctSugeridoBp: true,
          pctInformadoBp: true,
          pctEfetivo: true,
          pontos: true,
        },
      },
    },
  },
  drops: {
    select: {
      id: true,
      quantidade: true,
      item: { select: { id: true, nome: true, idJogo: true } },
      // Épico II (D18): o drop já foi lançado no estoque do grupo?
      movimentos: { where: { tipo: "ENTRADA" as const }, select: { id: true } },
    },
  },
  lancamentos: {
    orderBy: { criadoEm: "asc" as const },
    select: {
      id: true,
      valor: true,
      tipo: true,
      jogador: { select: { id: true, apelido: true } },
      estornaLancamentoId: true,
    },
  },
} satisfies Prisma.RunSelect;

/**
 * T-14 / T-15: registro transacional da run e correção por estorno (D11, US-07).
 * Toda a gravação (run, participações com snapshot, empréstimos, drops e lançamentos) acontece numa
 * única transação: qualquer erro desfaz tudo (CT-72). Os pontos vêm sempre do motor `@betel/scoring`.
 */
@Injectable()
export class RunsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly auditoria: AuditoriaService,
    private readonly instancias: InstanciasService,
    private readonly notificacoes: NotificacoesService,
  ) {}

  /**
   * D44/D46: resolve a instância, a versão vigente e o encontro da run.
   * - `encontroId`: precisa ser da versão vigente da instância (versões antigas não recebem runs);
   * - `chefe`: apelido dos encontros da Torre (clientes anteriores ao Épico IV);
   * - só `instanciaId`: vale se a instância tiver um único encontro.
   * A instância precisa estar ativa e ter funções (CT-146).
   */
  private async resolverEncontro(tx: Tx, e: EntradaRun) {
    let instanciaId = e.instanciaId;
    if (e.encontroId !== null) {
      const enc = await tx.encontro.findUnique({
        where: { id: e.encontroId },
        include: { versaoInstancia: { select: { instanciaId: true } } },
      });
      if (enc === null) throw new BadRequestException("Encontro não encontrado.");
      if (instanciaId !== null && instanciaId !== enc.versaoInstancia.instanciaId) {
        throw new BadRequestException("O encontro não é dessa instância.");
      }
      instanciaId = enc.versaoInstancia.instanciaId;
    } else if (e.chefe !== null) {
      const torre = await this.instancias.torre(tx);
      if (instanciaId !== null && instanciaId !== torre.id) {
        throw new BadRequestException("chefe só vale para a Torre da Constelação; informe o encontro.");
      }
      instanciaId = torre.id;
    }
    if (instanciaId === null) throw new BadRequestException("Informe a instância e o encontro da run.");

    const instancia = await tx.instancia.findUnique({ where: { id: instanciaId } });
    if (instancia === null) throw new BadRequestException("Instância não encontrada.");
    if (!instancia.ativa)
      throw new UnprocessableEntityException(`A instância ${instancia.nome} está inativa.`);
    const versao = await this.instancias.vigente(tx, instanciaId);
    if (versao === null || versao.funcoes.length === 0) {
      throw new UnprocessableEntityException(`A instância ${instancia.nome} ainda não tem funções e ranks.`);
    }
    let encontro;
    if (e.encontroId !== null) {
      encontro = versao.encontros.find((x) => x.id === e.encontroId);
      if (encontro === undefined) {
        throw new UnprocessableEntityException(
          "Esse encontro é de uma versão antiga da instância: use a vigente.",
        );
      }
    } else if (e.chefe !== null) {
      encontro = versao.encontros.find((x) => x.codigo === e.chefe);
      if (encontro === undefined)
        throw new UnprocessableEntityException(`A Torre não tem o encontro ${e.chefe}.`);
    } else {
      const [unico, ...outros] = versao.encontros;
      if (unico === undefined || outros.length > 0) {
        throw new BadRequestException(`Informe o encontro de ${instancia.nome}: ela tem mais de um.`);
      }
      encontro = unico;
    }
    return { instancia, versao, encontro };
  }

  registrar(entrada: EntradaRun, admin: Usuario): Promise<ResultadoRegistro> {
    return this.prisma.$transaction(async (tx) => {
      const config = await tx.configPontuacao.findFirst({ orderBy: { versao: "desc" } });
      if (config === null) throw new ConflictException("Nenhuma versão de parâmetros cadastrada.");
      const r = await this.gravar(tx, entrada, admin, config.id, null);
      await this.notificacoes.registrarRun(tx, r.runId);
      return r;
    });
  }

  /**
   * US-07: estorna os lançamentos da run, marca-a como ESTORNADA e registra a run corrigida,
   * apontando para a original. A correção usa a versão de parâmetros da run original (D17).
   */
  corrigir(runId: string, entrada: EntradaRun, motivo: string, admin: Usuario): Promise<ResultadoRegistro> {
    return this.prisma.$transaction(async (tx) => {
      // Trava a run: duas correções simultâneas da mesma run não podem passar.
      await tx.$queryRaw`SELECT id FROM run WHERE id = ${runId}::uuid FOR UPDATE`;
      const original = await tx.run.findUnique({
        where: { id: runId },
        include: { versaoInstancia: { select: { instanciaId: true } } },
      });
      if (original === null) throw new NotFoundException("Run não encontrada.");
      if (original.status === "ESTORNADA")
        throw new ConflictException("Esta run já foi corrigida ou estornada.");

      const estornados = await this.ledger.estornarRun(tx, runId, admin.id, `Correção: ${motivo}`);
      await tx.run.update({ where: { id: runId }, data: { status: "ESTORNADA" } });
      // CT-148: sem instância informada, a correção é na mesma instância (versão vigente dela).
      const entradaCorrecao =
        entrada.instanciaId === null && entrada.encontroId === null && entrada.chefe === null
          ? { ...entrada, instanciaId: original.versaoInstancia.instanciaId }
          : entrada;
      const r = await this.gravar(tx, entradaCorrecao, admin, original.configId, runId);
      await this.notificacoes.registrarCorrecao(tx, runId, r.runId);
      await this.auditoria.registrar(
        {
          usuarioId: admin.id,
          acao: "RUN_CORRIGIDA",
          entidade: "run",
          entidadeId: runId,
          antes: { status: original.status },
          depois: { status: "ESTORNADA", novaRunId: r.runId, lancamentosEstornados: estornados, motivo },
        },
        tx,
      );
      return r;
    });
  }

  private async gravar(
    tx: Tx,
    e: EntradaRun,
    admin: Usuario,
    configId: string,
    corrigeRunId: string | null,
  ): Promise<ResultadoRegistro> {
    const configRow = await tx.configPontuacao.findUniqueOrThrow({ where: { id: configId } });
    const config = paraConfigMotor(configRow);
    const { versao, encontro } = await this.resolverEncontro(tx, e);

    // --- Resolver referências (tudo validado antes de gravar) ---
    const personagens = await tx.personagem.findMany({
      where: { id: { in: e.participantes.map((p) => p.personagemId) } },
    });
    const personagemPorId = new Map(personagens.map((p) => [p.id, p]));

    // D45: só valem as funções da versão vigente da instância desta run.
    const funcaoPorId = new Map(versao.funcoes.map((f) => [f.id, f]));
    const idsClasse = e.participantes.flatMap((p) =>
      p.funcaoId === null && p.classeId !== null ? [p.classeId] : [],
    );
    const classes = await tx.classe.findMany({ where: { id: { in: idsClasse } } });
    const classePorId = new Map(classes.map((c) => [c.id, c]));

    const idsCredor = [
      ...new Set(e.participantes.flatMap((p) => p.emprestimos.map((x) => x.credorJogadorId))),
    ];
    const credores = await tx.jogador.findMany({ where: { id: { in: idsCredor } }, select: { id: true } });
    const idsItem = [
      ...new Set([
        ...e.drops.map((d) => d.itemId),
        ...e.participantes.flatMap((p) =>
          p.emprestimos.flatMap((x) => (x.itemId === null ? [] : [x.itemId])),
        ),
      ]),
    ];
    const itens = await tx.itemCatalogo.findMany({
      where: { id: { in: idsItem }, ativo: true },
      select: { id: true },
    });
    const itensValidos = new Set(itens.map((i) => i.id));
    for (const id of idsItem) {
      if (!itensValidos.has(id)) throw new BadRequestException("Item fora do catálogo ou inativo (CT-61).");
    }
    const credoresValidos = new Set(credores.map((c) => c.id));
    for (const id of idsCredor) {
      if (!credoresValidos.has(id))
        throw new BadRequestException("O credor precisa ser um jogador cadastrado (C4).");
    }

    // --- Calcular tudo com o motor antes de gravar ---
    const calculos = e.participantes.map((p, i) => {
      const personagem = personagemPorId.get(p.personagemId);
      if (personagem === undefined)
        throw new BadRequestException(`participantes[${i}]: personagem não encontrado.`);
      if (!personagem.ativo) throw new BadRequestException(`O personagem ${personagem.nome} está inativo.`);
      let funcao;
      if (p.funcaoId !== null) {
        funcao = funcaoPorId.get(p.funcaoId);
        if (funcao === undefined) {
          // CT-145: função de outra instância (ou de outra versão) não pontua nesta run.
          throw new UnprocessableEntityException(
            `participantes[${i}]: a função não é da versão vigente de ${versao.instancia.nome}.`,
          );
        }
      } else {
        const classe = classePorId.get(p.classeId ?? "");
        if (classe === undefined)
          throw new BadRequestException(`participantes[${i}]: classe não encontrada.`);
        funcao = versao.funcoes.find((f) => f.classeId === classe.id && f.padrao);
        if (funcao === undefined) {
          throw new BadRequestException(
            `A classe ${classe.apelidoGrupo ?? classe.nomeOficial} não tem função padrão: escolha a função de ${personagem.nome} (D16).`,
          );
        }
      }
      const calc: ResultadoParticipacao = calcularParticipacao(
        {
          rank: funcao.rank,
          multiplicadorEncontroCentesimos: encontro.multiplicadorCentesimos,
          status: e.status,
          fracaoCentesimos: p.fracaoCentesimos,
        },
        config,
      );
      const div = dividirEmprestimos(
        calc.pontos,
        personagem.jogadorId,
        p.emprestimos.map((x) => ({
          credorJogadorId: x.credorJogadorId,
          categoria: x.categoria,
          ...(x.percentualInformadoBp === null ? {} : { percentualInformadoBp: x.percentualInformadoBp }),
        })),
        config,
      );
      return { p, personagem, funcao, calc, div };
    });

    // --- Gravar ---
    const run = await tx.run.create({
      data: {
        data: e.data,
        versaoInstanciaId: versao.id,
        encontroId: encontro.id,
        status: e.status as StatusRun,
        pontuacaoBetelgeuse: e.pontuacaoBetelgeuse,
        observacao: e.observacao,
        configId,
        registradaPorId: admin.id,
        corrigeRunId,
      },
    });

    for (const { p, personagem, funcao, calc, div } of calculos) {
      const part = await tx.participacao.create({
        data: {
          runId: run.id,
          personagemId: personagem.id,
          jogadorId: personagem.jogadorId,
          funcaoId: funcao.id,
          fracaoCentesimos: calc.fracaoCentesimos,
          rank: calc.rank,
          base: calc.base,
          alphaCentesimos: calc.alphaCentesimos,
          pesoCentesimos: calc.pesoCentesimos,
          multiplicadorChefeCentesimos: calc.multiplicadorEncontroCentesimos,
          multiplicadorStatusCentesimos: calc.multiplicadorStatusCentesimos,
          pontosGerados: calc.pontos,
        },
      });
      await this.ledger.lancar(tx, {
        jogadorId: personagem.jogadorId,
        valor: calc.pontos,
        tipo: "PARTICIPACAO",
        criadoPorId: admin.id,
        runId: run.id,
        participacaoId: part.id,
      });
      for (const parcela of div.parcelas) {
        const x = p.emprestimos[parcela.indice];
        if (x === undefined) throw new Error("Parcela sem empréstimo correspondente.");
        const emp = await tx.emprestimo.create({
          data: {
            participacaoId: part.id,
            tomadorJogadorId: personagem.jogadorId,
            credorJogadorId: x.credorJogadorId,
            itemId: x.itemId,
            itemDescricao: x.itemDescricao,
            categoria: x.categoria,
            pctSugeridoBp: parcela.percentualSugeridoBp,
            pctInformadoBp: parcela.percentualInformadoBp,
            pctEfetivo: pctEfetivo(parcela.percentualAplicadoBp, div, config.tetoCredoresBp),
            pontos: parcela.pontos,
          },
        });
        const origem = {
          criadoPorId: admin.id,
          runId: run.id,
          participacaoId: part.id,
          emprestimoId: emp.id,
        };
        await this.ledger.lancar(tx, {
          ...origem,
          jogadorId: personagem.jogadorId,
          valor: -parcela.pontos,
          tipo: "EMPRESTIMO_DEBITO",
        });
        await this.ledger.lancar(tx, {
          ...origem,
          jogadorId: x.credorJogadorId,
          valor: parcela.pontos,
          tipo: "EMPRESTIMO_CREDITO",
        });
      }
    }

    if (e.drops.length > 0) {
      await tx.dropRun.createMany({
        data: e.drops.map((d) => ({ runId: run.id, itemId: d.itemId, quantidade: d.quantidade })),
      });
    }

    await this.auditoria.registrar(
      {
        usuarioId: admin.id,
        acao: corrigeRunId === null ? "RUN_REGISTRADA" : "RUN_REGISTRADA_CORRECAO",
        entidade: "run",
        entidadeId: run.id,
        depois: {
          configId,
          corrigeRunId,
          instancia: versao.instancia.nome,
          versaoInstancia: versao.versao,
          encontro: encontro.nome,
          pontos: calculos.map((c) => ({ personagem: c.personagem.nome, pontos: c.calc.pontos })),
        },
      },
      tx,
    );

    return {
      runId: run.id,
      avisosReducao: calculos
        .filter((c) => c.div.reducaoProporcionalAplicada)
        .map((c) => ({
          personagemId: c.personagem.id,
          somaPercentuaisBp: c.div.somaPercentuaisBp,
          tetoCredoresBp: config.tetoCredoresBp,
        })),
    };
  }

  async detalhe(id: string) {
    const run = await this.prisma.run.findUnique({ where: { id }, select: SELECAO_DETALHE });
    if (run === null) throw new NotFoundException("Run não encontrada.");
    return {
      ...run,
      corrigidaPorRunId: run.corrigidaPor?.id ?? null,
      drops: run.drops.map(({ movimentos, ...d }) => ({ ...d, lancadoNoEstoque: movimentos.length > 0 })),
      participacoes: run.participacoes.map((p) => ({
        ...p,
        emprestimos: p.emprestimos.map((x) => ({ ...x, pctEfetivo: x.pctEfetivo.toString() })),
      })),
    };
  }

  async listar(f: { dataDe?: Date; dataAte?: Date; instanciaId?: string; status?: StatusRun }) {
    const runs = await this.prisma.run.findMany({
      where: {
        ...(f.instanciaId === undefined ? {} : { versaoInstancia: { instanciaId: f.instanciaId } }),
        ...(f.status === undefined ? {} : { status: f.status }),
        ...(f.dataDe === undefined && f.dataAte === undefined
          ? {}
          : {
              data: {
                ...(f.dataDe === undefined ? {} : { gte: f.dataDe }),
                ...(f.dataAte === undefined ? {} : { lte: f.dataAte }),
              },
            }),
      },
      orderBy: [{ data: "desc" }, { criadaEm: "desc" }],
      take: 200,
      select: {
        id: true,
        data: true,
        status: true,
        corrigeRunId: true,
        encontro: { select: { nome: true, codigo: true } },
        versaoInstancia: { select: { versao: true, instancia: { select: { id: true, nome: true } } } },
        config: { select: { versao: true } },
        _count: { select: { participacoes: true } },
        participacoes: { select: { pontosGerados: true } },
      },
    });
    return runs.map(({ participacoes, _count, ...r }) => ({
      ...r,
      participantes: _count.participacoes,
      pontosTotais: participacoes.reduce((a, p) => a + p.pontosGerados, 0),
    }));
  }
}
