import { Injectable, signal } from "@angular/core";
import type { CheckinFarm } from "../data/farm.modelos";

/**
 * Estado da aba Hoje que precisa sobreviver à troca de aba: o conteúdo do `mat-tab` é preguiçoso
 * e a aba é destruída ao sair. Provido pela página (`FarmPage`), vive enquanto ela viver.
 */
@Injectable()
export class RascunhoHoje {
  /** Personagem escolhido, ou "todos". */
  readonly selecionado = signal("todos");
  /** Cartão com o editor aberto: "personagem|instância". */
  readonly aberto = signal<string | null>(null);
  /** Check-in cujos drops estão sendo editados (null quando é um check-in novo). */
  readonly editando = signal<CheckinFarm | null>(null);
  /** Quantidade digitada por item. */
  readonly rascunho = signal<Record<string, string>>({});
  /** Itens adicionados só nesta run (sem "lembrar"). */
  readonly extras = signal<string[]>([]);
  readonly lembrar = signal(true);

  abrir(chave: string, checkin: CheckinFarm | null): void {
    this.aberto.set(chave);
    this.editando.set(checkin);
    this.extras.set([]);
    const r: Record<string, string> = {};
    for (const d of checkin?.drops ?? []) r[d.farmItemId] = String(d.quantidade);
    this.rascunho.set(r);
  }

  fechar(): void {
    this.aberto.set(null);
    this.editando.set(null);
    this.rascunho.set({});
    this.extras.set([]);
  }
}
