// Diário de farm (D48–D54): o que a API /api/farm devolve e o estado compartilhado pelas abas.
import { HttpClient } from "@angular/common/http";
import { computed, inject, Injectable, signal } from "@angular/core";
import { type Recarga, type Situacao, diaDoJogo, situacao } from "@betel/farm";
import { firstValueFrom } from "rxjs";

export interface PersonagemFarm {
  id: string;
  nome: string;
  classe: string | null;
}

export interface InstanciaFarm {
  id: string;
  nome: string;
  recarga: Recarga;
  instanciaId: string | null;
  personagemIds: string[];
  /** Itens que costuma dropar, na ordem do cadastro. */
  drops: string[];
}

export interface ItemFarm {
  id: string;
  nome: string;
  idJogo: number | null;
  precoZeny: number | null;
}

export interface DropCheckin {
  farmItemId: string;
  nome: string;
  quantidade: number;
}

export interface CheckinFarm {
  id: string;
  personagemId: string;
  farmInstanciaId: string;
  nomeInstancia: string;
  feitoEm: string;
  drops: DropCheckin[];
}

export interface EstadoFarm {
  vinculado: boolean;
  personagens: PersonagemFarm[];
  instancias: InstanciaFarm[];
  itens: ItemFarm[];
  checkinsRecentes: CheckinFarm[];
  divinePride: boolean;
}

export interface ResultadoBuscaItem {
  nome: string;
  idJogo: number | null;
  origem: "meus-itens" | "catalogo" | "divine-pride";
  farmItemId: string | null;
}

export interface InstanciaCatalogo {
  id: string;
  nome: string;
  recargaSugerida: Recarga | null;
}

export interface ResultadoImportacao {
  itensCriados: number;
  instanciasCriadas: number;
  checkinsImportados: number;
  checkinsJaImportados: number;
  checkinsSemPersonagem: number;
}

/** Situação de uma instância para um personagem, com o check-in que a deixou verde. */
export type SituacaoCard = Situacao & { checkin: CheckinFarm | null };

const API = "/api/farm";

/**
 * Estado do Diário de farm, carregado uma vez e atualizado a cada ação. As abas leem daqui; as
 * escritas vão para a API e, na volta, o estado é recarregado (a API é a fonte da verdade).
 */
@Injectable({ providedIn: "root" })
export class FarmStore {
  private readonly http = inject(HttpClient);

  readonly estado = signal<EstadoFarm | null>(null);
  /** Relógio da tela (atualizado a cada minuto), para o card mudar sozinho às 04:00. */
  readonly agora = signal(Date.now());
  readonly hoje = computed(() => diaDoJogo(this.agora()));

  readonly itemPorId = computed(() => new Map((this.estado()?.itens ?? []).map((i) => [i.id, i])));
  readonly personagemPorId = computed(
    () => new Map((this.estado()?.personagens ?? []).map((p) => [p.id, p])),
  );

  async carregar(): Promise<void> {
    this.estado.set(await firstValueFrom(this.http.get<EstadoFarm>(`${API}/estado`)));
    this.agora.set(Date.now());
  }

  instanciasDe(personagemId: string): InstanciaFarm[] {
    return (this.estado()?.instancias ?? []).filter((i) => i.personagemIds.includes(personagemId));
  }

  /** Mesma regra da API (packages/farm): verde até a recarga liberar. */
  situacaoDe(personagemId: string, instancia: InstanciaFarm): SituacaoCard {
    const ultimo =
      (this.estado()?.checkinsRecentes ?? []).find(
        (c) => c.personagemId === personagemId && c.farmInstanciaId === instancia.id,
      ) ?? null;
    const s = situacao(instancia.recarga, ultimo ? Date.parse(ultimo.feitoEm) : null, this.agora());
    return { ...s, checkin: s.feita ? ultimo : null };
  }

  precoDe = (itemId: string): number | null => this.itemPorId().get(itemId)?.precoZeny ?? null;

  /** Valor em zeny dos drops (só itens com preço). */
  valorDe(drops: readonly { farmItemId: string; quantidade: number }[]): number {
    return drops.reduce((soma, d) => soma + (this.precoDe(d.farmItemId) ?? 0) * d.quantidade, 0);
  }

  // ---------- escritas ----------

  private async e<T>(req: Promise<T>): Promise<T> {
    const r = await req;
    await this.carregar();
    return r;
  }

  fazerCheckin(
    personagemId: string,
    farmInstanciaId: string,
    drops: { farmItemId: string; quantidade: number }[],
  ) {
    return this.e(
      firstValueFrom(
        this.http.post<CheckinFarm>(`${API}/checkins`, { personagemId, farmInstanciaId, drops }),
      ),
    );
  }
  editarDrops(id: string, drops: { farmItemId: string; quantidade: number }[]) {
    return this.e(firstValueFrom(this.http.patch<CheckinFarm>(`${API}/checkins/${id}`, { drops })));
  }
  desfazer(id: string) {
    return this.e(firstValueFrom(this.http.delete<void>(`${API}/checkins/${id}`)));
  }
  criarInstancia(corpo: {
    nome: string;
    recarga: Recarga;
    instanciaId?: string | null;
    personagemIds?: string[];
  }) {
    return this.e(firstValueFrom(this.http.post<InstanciaFarm>(`${API}/instancias`, corpo)));
  }
  atualizarInstancia(id: string, corpo: { nome?: string; recarga?: Recarga; personagemIds?: string[] }) {
    return this.e(firstValueFrom(this.http.patch<InstanciaFarm>(`${API}/instancias/${id}`, corpo)));
  }
  excluirInstancia(id: string) {
    return this.e(firstValueFrom(this.http.delete<void>(`${API}/instancias/${id}`)));
  }
  adicionarDrop(
    instanciaId: string,
    item: { nome: string; idJogo?: number | null; precoZeny?: number | null },
  ) {
    return this.e(firstValueFrom(this.http.post<ItemFarm>(`${API}/instancias/${instanciaId}/drops`, item)));
  }
  removerDrop(instanciaId: string, itemId: string) {
    return this.e(firstValueFrom(this.http.delete<void>(`${API}/instancias/${instanciaId}/drops/${itemId}`)));
  }
  criarItem(item: { nome: string; idJogo?: number | null; precoZeny?: number | null }) {
    return this.e(firstValueFrom(this.http.post<ItemFarm>(`${API}/itens`, item)));
  }
  atualizarItem(id: string, corpo: { nome?: string; idJogo?: number | null; precoZeny?: number | null }) {
    return this.e(firstValueFrom(this.http.patch<ItemFarm>(`${API}/itens/${id}`, corpo)));
  }
  excluirItem(id: string) {
    return this.e(firstValueFrom(this.http.delete<void>(`${API}/itens/${id}`)));
  }

  // ---------- leituras avulsas ----------

  checkins(de: number, ate: number): Promise<CheckinFarm[]> {
    const params = { de: new Date(de).toISOString(), ate: new Date(ate).toISOString() };
    return firstValueFrom(this.http.get<CheckinFarm[]>(`${API}/checkins`, { params }));
  }
  buscarItens(q: string): Promise<{ resultados: ResultadoBuscaItem[]; divinePride: boolean }> {
    return firstValueFrom(
      this.http.get<{ resultados: ResultadoBuscaItem[]; divinePride: boolean }>(`${API}/itens/busca`, {
        params: { q },
      }),
    );
  }
  catalogoInstancias(): Promise<InstanciaCatalogo[]> {
    return firstValueFrom(this.http.get<InstanciaCatalogo[]>(`${API}/catalogo-instancias`));
  }
  importar(backup: unknown, personagens: Record<string, string | null>): Promise<ResultadoImportacao> {
    return firstValueFrom(this.http.post<ResultadoImportacao>(`${API}/importar`, { backup, personagens }));
  }
}
