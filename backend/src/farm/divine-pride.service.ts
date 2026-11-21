import { Inject, Injectable, Logger } from "@nestjs/common";
import { CONFIGURACAO, type Configuracao } from "../configuracao.js";
import { PrismaService } from "../prisma/prisma.service.js";

/** Resposta mínima da API da Divine Pride (o `fetch` global cumpre este contrato). */
export interface RespostaDivinePride {
  status: number;
  json(): Promise<unknown>;
}
export type BuscadorDivinePride = (url: string, init: RequestInit) => Promise<RespostaDivinePride>;
export const BUSCADOR_DIVINE_PRIDE = Symbol("BUSCADOR_DIVINE_PRIDE");

const API = "https://www.divine-pride.net/api/database/Item";
const TIMEOUT_MS = 5_000;
/** Um ID que a Divine Pride não conhece é conferido de novo depois de uma semana. */
const REVISAR_AUSENTE_MS = 7 * 86_400_000;

/**
 * D53: nome do item pela API da Divine Pride, a partir do ID do jogo. Como nas imagens (D41), cada
 * ID é buscado uma vez e guardado no banco: a Divine Pride pede cache e proíbe varrer IDs. Sem a
 * chave (DIVINE_PRIDE_API_KEY), nada sai para a internet.
 */
@Injectable()
export class DivinePrideService {
  private readonly log = new Logger(DivinePrideService.name);
  private readonly emAndamento = new Map<number, Promise<string | null>>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONFIGURACAO) private readonly config: Configuracao,
    @Inject(BUSCADOR_DIVINE_PRIDE) private readonly buscar: BuscadorDivinePride,
  ) {}

  get configurada(): boolean {
    return this.config.divinePride !== null;
  }

  /** Nome do item na Divine Pride, ou null (sem chave, ID desconhecido ou Divine Pride fora do ar). */
  async nomePorId(idJogo: number): Promise<string | null> {
    const cache = await this.prisma.nomeItemDivinePride.findUnique({ where: { idJogo } });
    if (cache?.existe && cache.nome !== null) return cache.nome;
    if (cache && !cache.existe && Date.now() - cache.buscadoEm.getTime() < REVISAR_AUSENTE_MS) return null;
    if (this.config.divinePride === null) return null;

    let busca = this.emAndamento.get(idJogo);
    if (busca === undefined) {
      busca = this.buscarEGuardar(idJogo, this.config.divinePride).finally(() =>
        this.emAndamento.delete(idJogo),
      );
      this.emAndamento.set(idJogo, busca);
    }
    return busca;
  }

  private async buscarEGuardar(
    idJogo: number,
    { chave, servidor }: { chave: string; servidor: string },
  ): Promise<string | null> {
    // Como levantado no Épico IV (§1.1): chave em `apiKey` e servidor no cabeçalho `x-server`.
    const url = `${API}/${idJogo}?apiKey=${encodeURIComponent(chave)}`;
    let resposta: RespostaDivinePride;
    try {
      resposta = await this.buscar(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "EmptyVariable/1.0 (diario de farm)",
          "x-server": servidor,
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      // A URL leva a chave: o log diz só o ID.
      this.log.warn(`Divine Pride indisponível ao buscar o nome do item ${idJogo}.`);
      return null;
    }
    if (resposta.status === 404) {
      await this.guardar(idJogo, null);
      return null;
    }
    if (resposta.status !== 200) {
      this.log.warn(`Divine Pride respondeu ${resposta.status} ao buscar o nome do item ${idJogo}.`);
      return null;
    }
    let corpo: unknown;
    try {
      corpo = await resposta.json();
    } catch {
      return null;
    }
    const nomeBruto = (corpo as { name?: unknown } | null)?.name;
    const nome = typeof nomeBruto === "string" ? nomeBruto.trim().replace(/\s+/g, " ").slice(0, 80) : "";
    await this.guardar(idJogo, nome === "" ? null : nome);
    return nome === "" ? null : nome;
  }

  private async guardar(idJogo: number, nome: string | null): Promise<void> {
    const dados = { nome, existe: nome !== null, buscadoEm: new Date() };
    await this.prisma.nomeItemDivinePride.upsert({
      where: { idJogo },
      create: { idJogo, ...dados },
      update: dados,
    });
  }
}
