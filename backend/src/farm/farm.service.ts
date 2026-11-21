import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, RecargaFarm, Usuario } from "@prisma/client";
import {
  ErroBackup,
  type BackupDiario,
  diaDoJogo,
  inicioDaJanelaDeRecarga,
  inicioDoDia,
  lerBackup,
  rotuloDoDia,
  situacao,
} from "@betel/farm";
import { ehViolacaoUnicidade } from "../comum/filtro-prisma.js";
import { PrismaService, type Tx } from "../prisma/prisma.service.js";
import { DivinePrideService } from "./divine-pride.service.js";

export interface EntradaInstancia {
  nome: string;
  recarga: RecargaFarm;
  instanciaId?: string | null;
  personagemIds?: string[];
}

export interface EntradaItem {
  nome: string;
  idJogo?: number | null;
  precoZeny?: number | null;
}

export interface EntradaDrop {
  farmItemId: string;
  quantidade: number;
}

export interface ResultadoBusca {
  nome: string;
  idJogo: number | null;
  /** De onde veio o nome: dos itens do próprio membro, do catálogo do grupo ou da Divine Pride. */
  origem: "meus-itens" | "catalogo" | "divine-pride";
  farmItemId: string | null;
}

export interface ResultadoImportacao {
  itensCriados: number;
  instanciasCriadas: number;
  checkinsImportados: number;
  checkinsJaImportados: number;
  checkinsSemPersonagem: number;
}

const SELECAO_INSTANCIA = {
  id: true,
  nome: true,
  recarga: true,
  instanciaId: true,
  personagens: { select: { personagemId: true } },
  drops: { select: { farmItemId: true }, orderBy: { ordem: "asc" } },
} satisfies Prisma.FarmInstanciaSelect;

const SELECAO_ITEM = { id: true, nome: true, idJogo: true, precoZeny: true } satisfies Prisma.FarmItemSelect;

const SELECAO_CHECKIN = {
  id: true,
  personagemId: true,
  farmInstanciaId: true,
  feitoEm: true,
  farmInstancia: { select: { nome: true } },
  drops: { select: { farmItemId: true, quantidade: true, farmItem: { select: { nome: true } } } },
} satisfies Prisma.FarmCheckinSelect;

type CheckinBruto = Prisma.FarmCheckinGetPayload<{ select: typeof SELECAO_CHECKIN }>;
type InstanciaBruta = Prisma.FarmInstanciaGetPayload<{ select: typeof SELECAO_INSTANCIA }>;

function formatarCheckin(c: CheckinBruto) {
  return {
    id: c.id,
    personagemId: c.personagemId,
    farmInstanciaId: c.farmInstanciaId,
    nomeInstancia: c.farmInstancia.nome,
    feitoEm: c.feitoEm.toISOString(),
    drops: c.drops
      .map((d) => ({ farmItemId: d.farmItemId, nome: d.farmItem.nome, quantidade: d.quantidade }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
  };
}

function formatarInstancia(i: InstanciaBruta) {
  return {
    id: i.id,
    nome: i.nome,
    recarga: i.recarga,
    instanciaId: i.instanciaId,
    personagemIds: i.personagens.map((p) => p.personagemId),
    drops: i.drops.map((d) => d.farmItemId),
  };
}

/** D44 do catálogo → recarga do farm. "Horas" e "Outro" não têm equivalente: o membro escolhe. */
const RECARGA_DO_CATALOGO: Partial<Record<string, RecargaFarm>> = {
  DIARIO: "DIARIA",
  TRES_DIAS: "TRES_DIAS",
  SEMANAL: "SEMANAL",
};

/**
 * D48–D54: Diário de farm. Tudo é do usuário da sessão; nenhum método lê dados de outro usuário,
 * e os ids recebidos são sempre conferidos contra o dono.
 */
@Injectable()
export class FarmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly divinePride: DivinePrideService,
  ) {}

  // ---------- vínculo e personagens (D49) ----------

  private async personagensDe(usuarioId: string, tx: Tx | PrismaService = this.prisma) {
    const jogador = await tx.jogador.findUnique({
      where: { usuarioId },
      select: {
        personagens: {
          where: { ativo: true },
          select: { id: true, nome: true, classe: { select: { nomeOficial: true } } },
          orderBy: { nome: "asc" },
        },
      },
    });
    return jogador?.personagens ?? null;
  }

  /** Personagens ativos do vínculo; 403 sem vínculo aprovado. */
  private async exigirPersonagens(usuarioId: string, tx: Tx | PrismaService = this.prisma) {
    const personagens = await this.personagensDe(usuarioId, tx);
    if (personagens === null) {
      throw new ForbiddenException(
        "Para usar o Diário de farm, seu vínculo com um jogador precisa estar aprovado.",
      );
    }
    return personagens;
  }

  private async conferirPersonagens(usuarioId: string, ids: readonly string[], tx: Tx | PrismaService) {
    const meus = new Set((await this.exigirPersonagens(usuarioId, tx)).map((p) => p.id));
    for (const id of ids)
      if (!meus.has(id)) throw new BadRequestException("Personagem não é seu ou está inativo.");
  }

  // ---------- leitura ----------

  /** Tudo o que a tela Hoje precisa: cadastro e os check-ins que ainda podem bloquear alguma recarga. */
  async estado(usuario: Usuario, agoraMs = Date.now()) {
    const personagens = await this.personagensDe(usuario.id);
    const desde = new Date(inicioDoDia(inicioDaJanelaDeRecarga(agoraMs)));
    const [instancias, itens, checkins] = await Promise.all([
      this.prisma.farmInstancia.findMany({
        where: { usuarioId: usuario.id, ativa: true },
        select: SELECAO_INSTANCIA,
        orderBy: { nome: "asc" },
      }),
      this.prisma.farmItem.findMany({
        where: { usuarioId: usuario.id },
        select: SELECAO_ITEM,
        orderBy: { nome: "asc" },
      }),
      this.prisma.farmCheckin.findMany({
        where: { usuarioId: usuario.id, feitoEm: { gte: desde } },
        select: SELECAO_CHECKIN,
        orderBy: { feitoEm: "desc" },
      }),
    ]);
    return {
      vinculado: personagens !== null,
      personagens: (personagens ?? []).map((p) => ({
        id: p.id,
        nome: p.nome,
        classe: p.classe?.nomeOficial ?? null,
      })),
      instancias: instancias.map(formatarInstancia),
      itens,
      checkinsRecentes: checkins.map(formatarCheckin),
      divinePride: this.divinePride.configurada,
    };
  }

  /** Check-ins do período [de, ate), para os totais e o histórico. */
  async checkins(usuario: Usuario, de: Date, ate: Date) {
    const lista = await this.prisma.farmCheckin.findMany({
      where: { usuarioId: usuario.id, feitoEm: { gte: de, lt: ate } },
      select: SELECAO_CHECKIN,
      orderBy: { feitoEm: "desc" },
    });
    return lista.map(formatarCheckin);
  }

  /** D50: instâncias do catálogo do grupo, para servir de ponto de partida. */
  async catalogoInstancias() {
    const lista = await this.prisma.instancia.findMany({
      select: { id: true, nome: true, retorno: true },
      orderBy: { nome: "asc" },
    });
    return lista.map((i) => ({
      id: i.id,
      nome: i.nome,
      recargaSugerida: (i.retorno && RECARGA_DO_CATALOGO[i.retorno]) ?? null,
    }));
  }

  // ---------- instâncias (D50) ----------

  private async minhaInstancia(usuarioId: string, id: string, tx: Tx | PrismaService = this.prisma) {
    const i = await tx.farmInstancia.findFirst({
      where: { id, usuarioId, ativa: true },
      select: { id: true },
    });
    if (i === null) throw new NotFoundException("Instância não encontrada.");
    return i;
  }

  async criarInstancia(usuario: Usuario, e: EntradaInstancia) {
    const personagens = await this.exigirPersonagens(usuario.id);
    const personagemIds = e.personagemIds ?? personagens.map((p) => p.id);
    await this.conferirPersonagens(usuario.id, personagemIds, this.prisma);
    if (e.instanciaId) {
      const existe = await this.prisma.instancia.count({ where: { id: e.instanciaId } });
      if (existe === 0) throw new BadRequestException("Instância do catálogo não encontrada.");
    }
    return this.prisma.$transaction(async (tx) => {
      // Uma instância excluída com histórico fica desativada; recriar com o mesmo nome a reativa.
      const antiga = await tx.farmInstancia.findFirst({
        where: { usuarioId: usuario.id, nome: { equals: e.nome, mode: "insensitive" } },
        select: { id: true, ativa: true },
      });
      if (antiga?.ativa) throw new ConflictException("Você já tem uma instância com esse nome.");
      const dados = { nome: e.nome, recarga: e.recarga, instanciaId: e.instanciaId ?? null, ativa: true };
      const id = antiga
        ? (await tx.farmInstancia.update({ where: { id: antiga.id }, data: dados })).id
        : (await tx.farmInstancia.create({ data: { ...dados, usuarioId: usuario.id } })).id;
      await tx.farmInstanciaPersonagem.deleteMany({ where: { farmInstanciaId: id } });
      await tx.farmInstanciaPersonagem.createMany({
        data: personagemIds.map((personagemId) => ({ farmInstanciaId: id, personagemId })),
      });
      return formatarInstancia(
        await tx.farmInstancia.findUniqueOrThrow({ where: { id }, select: SELECAO_INSTANCIA }),
      );
    });
  }

  async atualizarInstancia(
    usuario: Usuario,
    id: string,
    e: { nome?: string; recarga?: RecargaFarm; personagemIds?: string[] },
  ) {
    await this.minhaInstancia(usuario.id, id);
    if (e.personagemIds) await this.conferirPersonagens(usuario.id, e.personagemIds, this.prisma);
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.farmInstancia.update({
          where: { id },
          data: {
            ...(e.nome !== undefined && { nome: e.nome }),
            ...(e.recarga !== undefined && { recarga: e.recarga }),
          },
        });
        if (e.personagemIds) {
          await tx.farmInstanciaPersonagem.deleteMany({ where: { farmInstanciaId: id } });
          await tx.farmInstanciaPersonagem.createMany({
            data: e.personagemIds.map((personagemId) => ({ farmInstanciaId: id, personagemId })),
          });
        }
        return formatarInstancia(
          await tx.farmInstancia.findUniqueOrThrow({ where: { id }, select: SELECAO_INSTANCIA }),
        );
      });
    } catch (erro) {
      if (ehViolacaoUnicidade(erro)) throw new ConflictException("Você já tem uma instância com esse nome.");
      throw erro;
    }
  }

  /** Sem check-ins, apaga; com check-ins, só desativa (o histórico e os totais continuam). */
  async excluirInstancia(usuario: Usuario, id: string): Promise<void> {
    await this.minhaInstancia(usuario.id, id);
    const usada = await this.prisma.farmCheckin.count({ where: { farmInstanciaId: id } });
    if (usada === 0) await this.prisma.farmInstancia.delete({ where: { id } });
    else await this.prisma.farmInstancia.update({ where: { id }, data: { ativa: false } });
  }

  async adicionarDrop(usuario: Usuario, instanciaId: string, item: EntradaItem) {
    await this.minhaInstancia(usuario.id, instanciaId);
    return this.prisma.$transaction(async (tx) => {
      const criado = await this.obterOuCriarItem(tx, usuario.id, item);
      const ultima = await tx.farmInstanciaDrop.aggregate({
        where: { farmInstanciaId: instanciaId },
        _max: { ordem: true },
      });
      await tx.farmInstanciaDrop.upsert({
        where: { farmInstanciaId_farmItemId: { farmInstanciaId: instanciaId, farmItemId: criado.id } },
        create: { farmInstanciaId: instanciaId, farmItemId: criado.id, ordem: (ultima._max.ordem ?? 0) + 1 },
        update: {},
      });
      return criado;
    });
  }

  async removerDrop(usuario: Usuario, instanciaId: string, farmItemId: string): Promise<void> {
    await this.minhaInstancia(usuario.id, instanciaId);
    await this.prisma.farmInstanciaDrop.deleteMany({ where: { farmInstanciaId: instanciaId, farmItemId } });
  }

  // ---------- itens e preços (D52) ----------

  /** Item do membro com esse nome (sem diferenciar maiúsculas), criado se não existir. Completa ID e preço vazios. */
  private async obterOuCriarItem(tx: Tx, usuarioId: string, e: EntradaItem) {
    const existente = await tx.farmItem.findFirst({
      where: { usuarioId, nome: { equals: e.nome, mode: "insensitive" } },
      select: SELECAO_ITEM,
    });
    if (existente === null) {
      return tx.farmItem.create({
        data: { usuarioId, nome: e.nome, idJogo: e.idJogo ?? null, precoZeny: e.precoZeny ?? null },
        select: SELECAO_ITEM,
      });
    }
    const completar = {
      ...(existente.idJogo === null && e.idJogo != null && { idJogo: e.idJogo }),
      ...(existente.precoZeny === null && e.precoZeny != null && { precoZeny: e.precoZeny }),
    };
    if (Object.keys(completar).length === 0) return existente;
    return tx.farmItem.update({ where: { id: existente.id }, data: completar, select: SELECAO_ITEM });
  }

  async criarItem(usuario: Usuario, e: EntradaItem) {
    await this.exigirPersonagens(usuario.id);
    return this.prisma.$transaction((tx) => this.obterOuCriarItem(tx, usuario.id, e));
  }

  async atualizarItem(
    usuario: Usuario,
    id: string,
    e: { nome?: string; idJogo?: number | null; precoZeny?: number | null },
  ) {
    const item = await this.prisma.farmItem.findFirst({
      where: { id, usuarioId: usuario.id },
      select: { id: true },
    });
    if (item === null) throw new NotFoundException("Item não encontrado.");
    try {
      return await this.prisma.farmItem.update({
        where: { id },
        data: {
          ...(e.nome !== undefined && { nome: e.nome }),
          ...(e.idJogo !== undefined && { idJogo: e.idJogo }),
          ...(e.precoZeny !== undefined && { precoZeny: e.precoZeny }),
        },
        select: SELECAO_ITEM,
      });
    } catch (erro) {
      if (ehViolacaoUnicidade(erro)) throw new ConflictException("Você já tem um item com esse nome.");
      throw erro;
    }
  }

  /** Só itens sem check-ins podem ser apagados (os totais antigos dependem deles). */
  async excluirItem(usuario: Usuario, id: string): Promise<void> {
    const item = await this.prisma.farmItem.findFirst({
      where: { id, usuarioId: usuario.id },
      select: { id: true },
    });
    if (item === null) throw new NotFoundException("Item não encontrado.");
    const usado = await this.prisma.farmCheckinDrop.count({ where: { farmItemId: id } });
    if (usado > 0) throw new ConflictException("Esse item já aparece em check-ins e não pode ser excluído.");
    await this.prisma.farmItem.delete({ where: { id } });
  }

  // ---------- busca de itens (D53) ----------

  async buscarItens(
    usuario: Usuario,
    termo: string,
  ): Promise<{ resultados: ResultadoBusca[]; divinePride: boolean }> {
    const resultados: ResultadoBusca[] = [];
    const vistos = new Set<string>();
    const incluir = (r: ResultadoBusca) => {
      const chave = r.nome.toLowerCase();
      if (vistos.has(chave)) return;
      vistos.add(chave);
      resultados.push(r);
    };

    if (/^\d{1,9}$/.test(termo)) {
      const idJogo = Number(termo);
      const [meus, catalogo] = await Promise.all([
        this.prisma.farmItem.findMany({ where: { usuarioId: usuario.id, idJogo }, select: SELECAO_ITEM }),
        this.prisma.itemCatalogo.findFirst({ where: { idJogo }, select: { nome: true } }),
      ]);
      for (const m of meus) incluir({ nome: m.nome, idJogo, origem: "meus-itens", farmItemId: m.id });
      if (catalogo) incluir({ nome: catalogo.nome, idJogo, origem: "catalogo", farmItemId: null });
      const nomeDp = idJogo > 0 ? await this.divinePride.nomePorId(idJogo) : null;
      if (nomeDp) incluir({ nome: nomeDp, idJogo, origem: "divine-pride", farmItemId: null });
    } else {
      const filtro = { contains: termo, mode: "insensitive" as const };
      const [meus, catalogo, dp] = await Promise.all([
        this.prisma.farmItem.findMany({
          where: { usuarioId: usuario.id, nome: filtro },
          select: SELECAO_ITEM,
          orderBy: { nome: "asc" },
          take: 10,
        }),
        this.prisma.itemCatalogo.findMany({
          where: { ativo: true, nome: filtro },
          select: { nome: true, idJogo: true },
          orderBy: { nome: "asc" },
          take: 10,
        }),
        this.prisma.nomeItemDivinePride.findMany({
          where: { existe: true, nome: filtro },
          select: { nome: true, idJogo: true },
          orderBy: { nome: "asc" },
          take: 10,
        }),
      ]);
      for (const m of meus)
        incluir({ nome: m.nome, idJogo: m.idJogo, origem: "meus-itens", farmItemId: m.id });
      for (const c of catalogo)
        incluir({ nome: c.nome, idJogo: c.idJogo, origem: "catalogo", farmItemId: null });
      for (const d of dp)
        incluir({ nome: d.nome ?? "", idJogo: d.idJogo, origem: "divine-pride", farmItemId: null });
    }
    return { resultados: resultados.slice(0, 10), divinePride: this.divinePride.configurada };
  }

  // ---------- check-ins (D51) ----------

  private async conferirDrops(tx: Tx, usuarioId: string, drops: readonly EntradaDrop[]) {
    const ids = [...new Set(drops.map((d) => d.farmItemId))];
    if (ids.length !== drops.length) throw new BadRequestException("Item repetido nos drops.");
    const meus = await tx.farmItem.count({ where: { usuarioId, id: { in: ids } } });
    if (meus !== ids.length) throw new BadRequestException("Item dos drops não encontrado.");
    return drops.filter((d) => d.quantidade > 0);
  }

  async fazerCheckin(
    usuario: Usuario,
    e: { personagemId: string; farmInstanciaId: string; drops: EntradaDrop[] },
    agoraMs = Date.now(),
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.conferirPersonagens(usuario.id, [e.personagemId], tx);
      const instancia = await tx.farmInstancia.findFirst({
        where: { id: e.farmInstanciaId, usuarioId: usuario.id, ativa: true },
        select: { id: true, recarga: true },
      });
      if (instancia === null) throw new NotFoundException("Instância não encontrada.");
      // Dois cliques (ou duas abas) ao mesmo tempo: um check-in de cada vez por personagem e instância.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${e.personagemId}:${instancia.id}`}))`;
      const ultimo = await tx.farmCheckin.findFirst({
        where: { personagemId: e.personagemId, farmInstanciaId: instancia.id },
        orderBy: { feitoEm: "desc" },
        select: { feitoEm: true },
      });
      const s = situacao(instancia.recarga, ultimo?.feitoEm.getTime() ?? null, agoraMs);
      if (s.feita) {
        throw new ConflictException(
          `Essa instância já foi feita neste ciclo. Libera ${rotuloDoDia(s.liberaNoDia, diaDoJogo(agoraMs))} às 04:00.`,
        );
      }
      const drops = await this.conferirDrops(tx, usuario.id, e.drops);
      const criado = await tx.farmCheckin.create({
        data: {
          usuarioId: usuario.id,
          personagemId: e.personagemId,
          farmInstanciaId: instancia.id,
          feitoEm: new Date(agoraMs),
          drops: { create: drops.map((d) => ({ farmItemId: d.farmItemId, quantidade: d.quantidade })) },
        },
        select: SELECAO_CHECKIN,
      });
      return formatarCheckin(criado);
    });
  }

  private async meuCheckin(tx: Tx | PrismaService, usuarioId: string, id: string) {
    const c = await tx.farmCheckin.findFirst({ where: { id, usuarioId }, select: { id: true } });
    if (c === null) throw new NotFoundException("Check-in não encontrado.");
  }

  async editarDrops(usuario: Usuario, id: string, drops: EntradaDrop[]) {
    return this.prisma.$transaction(async (tx) => {
      await this.meuCheckin(tx, usuario.id, id);
      const validos = await this.conferirDrops(tx, usuario.id, drops);
      await tx.farmCheckinDrop.deleteMany({ where: { checkinId: id } });
      await tx.farmCheckinDrop.createMany({
        data: validos.map((d) => ({ checkinId: id, farmItemId: d.farmItemId, quantidade: d.quantidade })),
      });
      return formatarCheckin(
        await tx.farmCheckin.findUniqueOrThrow({ where: { id }, select: SELECAO_CHECKIN }),
      );
    });
  }

  async desfazerCheckin(usuario: Usuario, id: string): Promise<void> {
    await this.meuCheckin(this.prisma, usuario.id, id);
    await this.prisma.farmCheckin.delete({ where: { id } });
  }

  // ---------- importação do artefato (D54) ----------

  /**
   * Importa um backup (ou um pedaço dele) do artefato. Itens e instâncias são casados pelo nome;
   * personagens, pelo mapa escolhido pelo membro (id do artefato → personagem do vínculo).
   * Repetir a importação não duplica nada: cada check-in guarda o id do artefato.
   */
  async importar(
    usuario: Usuario,
    dados: unknown,
    mapa: Record<string, string>,
  ): Promise<ResultadoImportacao> {
    let backup: BackupDiario;
    try {
      backup = lerBackup(dados);
    } catch (erro) {
      if (erro instanceof ErroBackup) throw new BadRequestException(erro.message);
      throw erro;
    }
    const personagemDe = new Map<string, string>();
    for (const [idArtefato, personagemId] of Object.entries(mapa)) personagemDe.set(idArtefato, personagemId);
    await this.conferirPersonagens(usuario.id, [...new Set(personagemDe.values())], this.prisma);

    return this.prisma.$transaction(
      async (tx) => {
        const r: ResultadoImportacao = {
          itensCriados: 0,
          instanciasCriadas: 0,
          checkinsImportados: 0,
          checkinsJaImportados: 0,
          checkinsSemPersonagem: 0,
        };

        // Itens: pelo nome. Os que só aparecem nos drops (apagados no artefato) também entram.
        const nomesDeItem = new Map<string, { nome: string; precoZeny: number | null }>();
        for (const i of backup.itens) nomesDeItem.set(i.id, { nome: i.nome, precoZeny: i.precoZeny });
        for (const c of backup.checkins)
          for (const d of c.drops)
            if (!nomesDeItem.has(d.item) && d.nome !== "")
              nomesDeItem.set(d.item, { nome: d.nome, precoZeny: null });
        const itemDe = new Map<string, string>();
        const antes = await tx.farmItem.count({ where: { usuarioId: usuario.id } });
        for (const [idArtefato, { nome, precoZeny }] of nomesDeItem) {
          itemDe.set(
            idArtefato,
            (await this.obterOuCriarItem(tx, usuario.id, { nome: nome.slice(0, 80), precoZeny })).id,
          );
        }
        r.itensCriados = (await tx.farmItem.count({ where: { usuarioId: usuario.id } })) - antes;

        // Instâncias: pelo nome; as que faltam são criadas com os personagens mapeados.
        const nomesDeInstancia = new Map<
          string,
          { nome: string; recarga: RecargaFarm; personagens: string[]; drops: string[] }
        >();
        for (const i of backup.instancias) nomesDeInstancia.set(i.id, i);
        const instanciaDe = new Map<string, string>();
        for (const [idArtefato, i] of nomesDeInstancia) {
          const nome = i.nome.slice(0, 80);
          let atual = await tx.farmInstancia.findFirst({
            where: { usuarioId: usuario.id, nome: { equals: nome, mode: "insensitive" } },
            select: { id: true },
          });
          if (atual === null) {
            const personagens = [...new Set(i.personagens.flatMap((p) => personagemDe.get(p) ?? []))];
            atual = await tx.farmInstancia.create({
              data: {
                usuarioId: usuario.id,
                nome,
                recarga: i.recarga,
                personagens: { create: personagens.map((personagemId) => ({ personagemId })) },
              },
              select: { id: true },
            });
            r.instanciasCriadas++;
          }
          instanciaDe.set(idArtefato, atual.id);
          const ja = new Set(
            (
              await tx.farmInstanciaDrop.findMany({
                where: { farmInstanciaId: atual.id },
                select: { farmItemId: true },
              })
            ).map((d) => d.farmItemId),
          );
          let ordem = ja.size;
          for (const d of i.drops) {
            const itemId = itemDe.get(d);
            if (itemId === undefined || ja.has(itemId)) continue;
            ja.add(itemId);
            await tx.farmInstanciaDrop.create({
              data: { farmInstanciaId: atual.id, farmItemId: itemId, ordem: ++ordem },
            });
          }
        }

        // Check-ins: só os de personagens mapeados e ainda não importados.
        const jaImportados = new Set(
          (
            await tx.farmCheckin.findMany({
              where: { usuarioId: usuario.id, idExterno: { in: backup.checkins.map((c) => c.id) } },
              select: { idExterno: true },
            })
          ).map((c) => c.idExterno),
        );
        const novos: Prisma.FarmCheckinCreateManyInput[] = [];
        const novosDrops: Prisma.FarmCheckinDropCreateManyInput[] = [];
        for (const c of backup.checkins) {
          const personagemId = personagemDe.get(c.personagem);
          if (personagemId === undefined) {
            r.checkinsSemPersonagem++;
            continue;
          }
          if (jaImportados.has(c.id)) {
            r.checkinsJaImportados++;
            continue;
          }
          let farmInstanciaId = instanciaDe.get(c.instancia);
          if (farmInstanciaId === undefined) {
            // Instância apagada no artefato: recria pelo nome guardado no check-in, desativada.
            const nome = (c.nomeInstancia || "Instância removida").slice(0, 80);
            const existente = await tx.farmInstancia.findFirst({
              where: { usuarioId: usuario.id, nome: { equals: nome, mode: "insensitive" } },
              select: { id: true },
            });
            farmInstanciaId =
              existente?.id ??
              (
                await tx.farmInstancia.create({
                  data: { usuarioId: usuario.id, nome, recarga: "DIARIA", ativa: false },
                  select: { id: true },
                })
              ).id;
            instanciaDe.set(c.instancia, farmInstanciaId);
          }
          const id = randomUUID();
          novos.push({
            id,
            usuarioId: usuario.id,
            personagemId,
            farmInstanciaId,
            feitoEm: new Date(c.feitoEm),
            idExterno: c.id,
          });
          const somados = new Map<string, number>();
          for (const d of c.drops) {
            const itemId = itemDe.get(d.item);
            if (itemId !== undefined) somados.set(itemId, (somados.get(itemId) ?? 0) + d.quantidade);
          }
          for (const [farmItemId, quantidade] of somados)
            novosDrops.push({ checkinId: id, farmItemId, quantidade });
          jaImportados.add(c.id);
        }
        if (novos.length > 0) await tx.farmCheckin.createMany({ data: novos });
        if (novosDrops.length > 0) await tx.farmCheckinDrop.createMany({ data: novosDrops });
        r.checkinsImportados = novos.length;
        return r;
      },
      { timeout: 60_000 },
    );
  }
}
