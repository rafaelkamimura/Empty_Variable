import { inject, Injectable, signal } from "@angular/core";
import type { ItemEquipamento } from "../../../shared/dominio/build";
import { VinculoApi } from "./vinculo.api";

/** Catálogo de equipamentos do RO LATAM por slot (`equipamentos-latam.json`), carregado uma vez. */
@Injectable({ providedIn: "root" })
export class EquipamentosStore {
  private readonly api = inject(VinculoApi);
  private readonly _slots = signal<Record<string, ItemEquipamento[]> | null>(null);
  private readonly _erro = signal(false);
  readonly slots = this._slots.asReadonly();
  readonly erro = this._erro.asReadonly();
  private emAndamento: Promise<void> | null = null;

  /** Carrega o catálogo (uma vez; chamadas seguidas esperam a mesma carga). */
  carregar(): Promise<void> {
    if (this._slots()) return Promise.resolve();
    this.emAndamento ??= this.api
      .equipamentos()
      .then((dados) => {
        this._erro.set(false);
        this._slots.set(dados.slots);
      })
      .catch(() => this._erro.set(true))
      .finally(() => (this.emAndamento = null));
    return this.emAndamento;
  }

  /** Nome do equipamento com esse ID no slot, ou null se o catálogo não o tiver (ou não tiver carregado). */
  nomeDoItem(slot: string, id: number): string | null {
    return this._slots()?.[slot]?.find((item) => item.id === id)?.nome ?? null;
  }
}
