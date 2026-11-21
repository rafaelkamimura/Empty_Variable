import { computed, inject, Injectable, signal } from "@angular/core";
import { diaDoJogo, type Recarga } from "@betel/farm";
import { FarmApi } from "./farm.api";
import {
  type CheckinFarm,
  type DropQuantidade,
  type EstadoFarm,
  type InstanciaFarm,
  instanciasDoPersonagem,
  type SituacaoCard,
  situacaoDoPersonagem,
  valorDosDrops,
} from "./farm.modelos";

/**
 * Estado do Diário de farm (diretrizes §4.5), carregado uma vez e recarregado depois de cada
 * escrita (a API é a fonte da verdade). As abas leem daqui; o HTTP fica no FarmApi.
 */
@Injectable({ providedIn: "root" })
export class FarmStore {
  private readonly api = inject(FarmApi);
  private readonly _estado = signal<EstadoFarm | null>(null);

  readonly estado = this._estado.asReadonly();
  /** Relógio da tela (atualizado pela página), para o card mudar sozinho às 04:00. */
  readonly agora = signal(Date.now());
  readonly hoje = computed(() => diaDoJogo(this.agora()));

  readonly itemPorId = computed(() => new Map((this._estado()?.itens ?? []).map((i) => [i.id, i])));
  readonly personagemPorId = computed(
    () => new Map((this._estado()?.personagens ?? []).map((p) => [p.id, p])),
  );

  async carregar(): Promise<void> {
    this._estado.set(await this.api.estado());
    this.agora.set(Date.now());
  }

  instanciasDe(personagemId: string): InstanciaFarm[] {
    return instanciasDoPersonagem(this._estado()?.instancias ?? [], personagemId);
  }

  situacaoDe(personagemId: string, instancia: InstanciaFarm): SituacaoCard {
    return situacaoDoPersonagem(
      this._estado()?.checkinsRecentes ?? [],
      personagemId,
      instancia,
      this.agora(),
    );
  }

  precoDe = (itemId: string): number | null => this.itemPorId().get(itemId)?.precoZeny ?? null;

  valorDe(drops: readonly DropQuantidade[]): number {
    return valorDosDrops(drops, this.precoDe);
  }

  // ---------- escritas: chamam a API e recarregam o estado ----------

  private async e<T>(req: Promise<T>): Promise<T> {
    const r = await req;
    await this.carregar();
    return r;
  }

  fazerCheckin(personagemId: string, farmInstanciaId: string, drops: DropQuantidade[]): Promise<CheckinFarm> {
    return this.e(this.api.fazerCheckin(personagemId, farmInstanciaId, drops));
  }
  editarDrops(id: string, drops: DropQuantidade[]): Promise<CheckinFarm> {
    return this.e(this.api.editarDrops(id, drops));
  }
  desfazer(id: string): Promise<void> {
    return this.e(this.api.desfazer(id));
  }
  criarInstancia(corpo: {
    nome: string;
    recarga: Recarga;
    instanciaId?: string | null;
    personagemIds?: string[];
  }) {
    return this.e(this.api.criarInstancia(corpo));
  }
  atualizarInstancia(id: string, corpo: { nome?: string; recarga?: Recarga; personagemIds?: string[] }) {
    return this.e(this.api.atualizarInstancia(id, corpo));
  }
  excluirInstancia(id: string) {
    return this.e(this.api.excluirInstancia(id));
  }
  adicionarDrop(
    instanciaId: string,
    item: { nome: string; idJogo?: number | null; precoZeny?: number | null },
  ) {
    return this.e(this.api.adicionarDrop(instanciaId, item));
  }
  adicionarDrops(instanciaId: string, itens: { nome: string; idJogo: number }[]) {
    return this.e(this.api.adicionarDrops(instanciaId, itens));
  }
  removerDrop(instanciaId: string, itemId: string) {
    return this.e(this.api.removerDrop(instanciaId, itemId));
  }
  criarItem(item: { nome: string; idJogo?: number | null; precoZeny?: number | null }) {
    return this.e(this.api.criarItem(item));
  }
  atualizarItem(id: string, corpo: { nome?: string; idJogo?: number | null; precoZeny?: number | null }) {
    return this.e(this.api.atualizarItem(id, corpo));
  }
  excluirItem(id: string) {
    return this.e(this.api.excluirItem(id));
  }

  // ---------- leituras avulsas (sem guardar no estado) ----------

  lootDaInstancia = (instanciaId: string) => this.api.lootDaInstancia(instanciaId);
  checkins = (de: number, ate: number) => this.api.checkins(de, ate);
  buscarItens = (q: string) => this.api.buscarItens(q);
  catalogoInstancias = () => this.api.catalogoInstancias();
  importar = (backup: unknown, personagens: Record<string, string | null>) =>
    this.api.importar(backup, personagens);
}
