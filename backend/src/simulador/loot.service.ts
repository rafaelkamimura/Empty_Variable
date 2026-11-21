import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import { MonstrosService } from "./monstros.service.js";

export const TIPOS_DROP = ["COMUM", "MVP", "MAPA"] as const;
/** COMUM: drop do monstro; MVP: prêmio de quem mata o MVP; MAPA: só cai naquele mapa (instância). */
export type TipoDrop = (typeof TIPOS_DROP)[number];

export interface DropMonstro {
  idItem: number;
  nome: string | null;
  tipo: TipoDrop;
  /** Chance de cair, de 0 a 1; null quando a fonte não informa. */
  chance: number | null;
}

export interface ItemLoot {
  idJogo: number;
  nome: string | null;
  /** Maior chance entre os chefes que dropam o item, de 0 a 1. */
  chance: number | null;
  origens: { idMonstro: number; monstro: string; tipo: TipoDrop; chance: number | null }[];
}

export interface LootInstancia {
  instancia: { id: string; nome: string };
  /** Chefes ativos da instância e quantos ainda não tiveram os drops buscados. */
  chefes: number;
  pendentes: number;
  divinePride: boolean;
  itens: ItemLoot[];
}

/** Tempo total para buscar os drops que faltam numa consulta; o resto fica pendente para a próxima. */
const PRAZO_MS = 8_000;
/** Os drops guardados são buscados de novo depois de 30 dias; um ID desconhecido, depois de uma semana. */
const REVISAR_MS = 30 * 86_400_000;
const REVISAR_AUSENTE_MS = 7 * 86_400_000;
const ID_MAXIMO = 2_147_483_647;

function dropsDe(lista: unknown, tipo: TipoDrop): DropMonstro[] {
  if (!Array.isArray(lista)) return [];
  const drops: DropMonstro[] = [];
  for (const bruto of lista) {
    if (typeof bruto !== "object" || bruto === null) continue;
    const item = bruto as Record<string, unknown>;
    const idItem = item["itemId"];
    if (typeof idItem !== "number" || !Number.isInteger(idItem) || idItem < 1 || idItem > ID_MAXIMO) continue;
    const nomeBruto = item["displayName"] ?? item["itemName"];
    const nome = typeof nomeBruto === "string" ? nomeBruto.trim().replace(/\s+/g, " ").slice(0, 160) : "";
    const chance = item["probability"];
    drops.push({
      idItem,
      nome: nome === "" ? null : nome,
      tipo,
      chance:
        typeof chance === "number" && Number.isFinite(chance) && chance >= 0 && chance <= 1 ? chance : null,
    });
  }
  return drops;
}

/**
 * Lê os drops da resposta de `/api/database/Monster/{id}` da Divine Pride: `drops`, `mvpDrops` e
 * `mapSpecificDrops` (os de instância). Um item repetido no mesmo tipo fica com a maior chance.
 * @param corpo JSON devolvido pela API
 */
export function lerDropsDivinePride(corpo: unknown): DropMonstro[] {
  if (typeof corpo !== "object" || corpo === null || Array.isArray(corpo)) return [];
  const raiz = corpo as Record<string, unknown>;
  const porChave = new Map<string, DropMonstro>();
  for (const drop of [
    ...dropsDe(raiz["drops"], "COMUM"),
    ...dropsDe(raiz["mvpDrops"], "MVP"),
    ...dropsDe(raiz["mapSpecificDrops"], "MAPA"),
  ]) {
    const chave = `${drop.tipo}:${drop.idItem}`;
    const anterior = porChave.get(chave);
    if (anterior === undefined) porChave.set(chave, drop);
    else if ((drop.chance ?? -1) > (anterior.chance ?? -1))
      porChave.set(chave, { ...anterior, chance: drop.chance });
  }
  return [...porChave.values()];
}

function dropsGuardados(itens: Prisma.JsonValue): DropMonstro[] {
  if (!Array.isArray(itens)) return [];
  return itens.flatMap((bruto) => {
    if (typeof bruto !== "object" || bruto === null || Array.isArray(bruto)) return [];
    const { idItem, nome, tipo, chance } = bruto;
    const tipoLido = TIPOS_DROP.find((t) => t === tipo);
    if (typeof idItem !== "number" || tipoLido === undefined) return [];
    return [
      {
        idItem,
        nome: typeof nome === "string" ? nome : null,
        tipo: tipoLido,
        chance: typeof chance === "number" ? chance : null,
      },
    ];
  });
}

/**
 * D60: lista de loot de uma instância, montada com os drops dos chefes cadastrados nela. Os drops
 * vêm da Divine Pride (servidor LATAM), um monstro por vez, e ficam guardados.
 */
@Injectable()
export class LootService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly monstros: MonstrosService,
  ) {}

  /**
   * Loot da instância: os itens que os chefes ativos dropam, com a chance e de quem vêm. Busca os
   * drops que faltam até o prazo; o que não couber volta como `pendentes` e entra na próxima consulta.
   * @param instanciaId ID da instância no catálogo
   */
  async daInstancia(instanciaId: string): Promise<LootInstancia> {
    const instancia = await this.prisma.instancia.findUnique({
      where: { id: instanciaId },
      select: {
        id: true,
        nome: true,
        chefes: { where: { ativo: true }, orderBy: { nome: "asc" }, select: { idMonstro: true, nome: true } },
      },
    });
    if (instancia === null) throw new NotFoundException("Instância não encontrada.");

    const ids = instancia.chefes.map((chefe) => chefe.idMonstro);
    const guardados = new Map(
      (await this.prisma.lootMonstro.findMany({ where: { idMonstro: { in: ids } } })).map((linha) => [
        linha.idMonstro,
        linha,
      ]),
    );
    const agora = Date.now();
    const limite = agora + PRAZO_MS;
    const drops = new Map<number, DropMonstro[]>();
    let pendentes = 0;
    for (const id of ids) {
      const linha = guardados.get(id);
      const idade = linha === undefined ? Infinity : agora - linha.buscadoEm.getTime();
      const valido = linha !== undefined && idade < (linha.existe ? REVISAR_MS : REVISAR_AUSENTE_MS);
      if (valido) {
        drops.set(id, dropsGuardados(linha.itens));
        continue;
      }
      const buscados = Date.now() > limite ? null : await this.buscar(id);
      if (buscados !== null) drops.set(id, buscados);
      else if (linha !== undefined) drops.set(id, dropsGuardados(linha.itens));
      else pendentes++;
    }

    const itens = new Map<number, ItemLoot>();
    for (const chefe of instancia.chefes) {
      for (const drop of drops.get(chefe.idMonstro) ?? []) {
        const item = itens.get(drop.idItem) ?? {
          idJogo: drop.idItem,
          nome: drop.nome,
          chance: null,
          origens: [],
        };
        item.nome ??= drop.nome;
        if (drop.chance !== null && drop.chance > (item.chance ?? -1)) item.chance = drop.chance;
        item.origens.push({
          idMonstro: chefe.idMonstro,
          monstro: chefe.nome,
          tipo: drop.tipo,
          chance: drop.chance,
        });
        itens.set(drop.idItem, item);
      }
    }
    return {
      instancia: { id: instancia.id, nome: instancia.nome },
      chefes: ids.length,
      pendentes,
      divinePride: this.monstros.configurada,
      itens: [...itens.values()].sort(
        (a, b) => (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR") || a.idJogo - b.idJogo,
      ),
    };
  }

  /** Busca e guarda os drops de um monstro; null quando a consulta não saiu (sem chave, teto ou falha). */
  private async buscar(idMonstro: number): Promise<DropMonstro[] | null> {
    const resposta = await this.monstros.consultarApi(idMonstro);
    if (resposta.estado === "INDISPONIVEL") return null;
    const itens = resposta.estado === "OK" ? lerDropsDivinePride(resposta.corpo) : [];
    const dados = {
      existe: resposta.estado === "OK",
      servidor: resposta.servidor,
      itens: itens as unknown as Prisma.InputJsonValue,
      buscadoEm: new Date(),
    };
    await this.prisma.lootMonstro.upsert({
      where: { idMonstro },
      create: { idMonstro, ...dados },
      update: dados,
    });
    return itens;
  }
}
