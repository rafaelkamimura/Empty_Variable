// Largura do conteúdo do próprio componente (container, não a janela: diretrizes §6.6), para os
// passos de um mat-stepper ficarem um embaixo do outro quando não cabem lado a lado.
import { DestroyRef, ElementRef, inject, type Signal, signal } from "@angular/core";

/** Verdadeiro enquanto o host do componente tem menos de `limite` px. Chame no construtor. */
export function estreitoAbaixoDe(limite: number): Signal<boolean> {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const estreito = signal(false);
  const observador = new ResizeObserver(([e]) => estreito.set((e?.contentRect.width ?? 0) < limite));
  observador.observe(host);
  inject(DestroyRef).onDestroy(() => observador.disconnect());
  return estreito.asReadonly();
}
