// Foco nas listas editáveis do assistente (diretrizes §7): quando uma linha some ou aparece, o foco
// vai para o próximo item lógico, e não se perde no topo da página.
import { afterNextRender, type Injector } from "@angular/core";

/** Depois do próximo render, foca o elemento que `encontrar` devolver (se houver). */
export function focarDepois(injector: Injector, encontrar: () => HTMLElement | null | undefined): void {
  afterNextRender(() => encontrar()?.focus(), { injector });
}

/** Primeiro controle habilitado dentro de `raiz`. */
export function primeiroControle(raiz: Element | null | undefined): HTMLElement | null {
  return (
    raiz?.querySelector<HTMLElement>(
      "select:not(:disabled), input:not(:disabled), textarea:not(:disabled)",
    ) ?? null
  );
}

/**
 * Depois de remover a linha `i` de `linhas()`: foca o "Remover" da linha que tomou o lugar dela
 * (a seguinte) ou, se era a última, o botão de adicionar.
 */
export function focarAposRemover(
  injector: Injector,
  linhas: () => readonly Element[],
  i: number,
  adicionar: () => HTMLElement | null,
): void {
  focarDepois(injector, () => linhas()[i]?.querySelector<HTMLElement>("[data-acao=remover]") ?? adicionar());
}

/** Campo (atributo `data-campo`) do controle que perdeu o foco, para marcar como tocado. */
export function campoQueSaiu(evento: FocusEvent): string | null {
  return evento.target instanceof HTMLElement ? (evento.target.dataset["campo"] ?? null) : null;
}
