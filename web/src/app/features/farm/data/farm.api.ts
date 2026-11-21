import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import type { Recarga } from "@betel/farm";
import { firstValueFrom } from "rxjs";
import type {
  CheckinFarm,
  DropQuantidade,
  EstadoFarm,
  InstanciaCatalogo,
  InstanciaFarm,
  ItemFarm,
  LootInstancia,
  ResultadoBuscaItem,
  ResultadoImportacao,
} from "./farm.modelos";

const API = "/api/farm";

/** Chamadas HTTP do Diário de farm (diretrizes §4.5): devolvem o que o servidor enviou. */
@Injectable({ providedIn: "root" })
export class FarmApi {
  private readonly http = inject(HttpClient);

  estado(): Promise<EstadoFarm> {
    return firstValueFrom(this.http.get<EstadoFarm>(`${API}/estado`));
  }

  fazerCheckin(personagemId: string, farmInstanciaId: string, drops: DropQuantidade[]): Promise<CheckinFarm> {
    return firstValueFrom(
      this.http.post<CheckinFarm>(`${API}/checkins`, { personagemId, farmInstanciaId, drops }),
    );
  }
  editarDrops(id: string, drops: DropQuantidade[]): Promise<CheckinFarm> {
    return firstValueFrom(this.http.patch<CheckinFarm>(`${API}/checkins/${id}`, { drops }));
  }
  async desfazer(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${API}/checkins/${id}`));
  }
  checkins(de: number, ate: number): Promise<CheckinFarm[]> {
    const params = { de: new Date(de).toISOString(), ate: new Date(ate).toISOString() };
    return firstValueFrom(this.http.get<CheckinFarm[]>(`${API}/checkins`, { params }));
  }

  criarInstancia(corpo: {
    nome: string;
    recarga: Recarga;
    instanciaId?: string | null;
    personagemIds?: string[];
  }): Promise<InstanciaFarm> {
    return firstValueFrom(this.http.post<InstanciaFarm>(`${API}/instancias`, corpo));
  }
  atualizarInstancia(
    id: string,
    corpo: { nome?: string; recarga?: Recarga; personagemIds?: string[] },
  ): Promise<InstanciaFarm> {
    return firstValueFrom(this.http.patch<InstanciaFarm>(`${API}/instancias/${id}`, corpo));
  }
  async excluirInstancia(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${API}/instancias/${id}`));
  }
  adicionarDrop(
    instanciaId: string,
    item: { nome: string; idJogo?: number | null; precoZeny?: number | null },
  ): Promise<ItemFarm> {
    return firstValueFrom(this.http.post<ItemFarm>(`${API}/instancias/${instanciaId}/drops`, item));
  }
  adicionarDrops(instanciaId: string, itens: { nome: string; idJogo: number }[]): Promise<ItemFarm[]> {
    return firstValueFrom(
      this.http.post<ItemFarm[]>(`${API}/instancias/${instanciaId}/drops/lote`, { itens }),
    );
  }
  async removerDrop(instanciaId: string, itemId: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${API}/instancias/${instanciaId}/drops/${itemId}`));
  }
  /** D60: loot da instância do catálogo, pelos drops dos chefes cadastrados nela. */
  lootDaInstancia(instanciaId: string): Promise<LootInstancia> {
    return firstValueFrom(this.http.get<LootInstancia>(`/api/simulador/instancias/${instanciaId}/loot`));
  }

  criarItem(item: { nome: string; idJogo?: number | null; precoZeny?: number | null }): Promise<ItemFarm> {
    return firstValueFrom(this.http.post<ItemFarm>(`${API}/itens`, item));
  }
  atualizarItem(
    id: string,
    corpo: { nome?: string; idJogo?: number | null; precoZeny?: number | null },
  ): Promise<ItemFarm> {
    return firstValueFrom(this.http.patch<ItemFarm>(`${API}/itens/${id}`, corpo));
  }
  async excluirItem(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${API}/itens/${id}`));
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
