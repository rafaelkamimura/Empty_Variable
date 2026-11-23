// Quando mostrar o erro de cada campo do assistente (diretrizes §6.4): depois de a pessoa sair do
// campo ou de tentar avançar o passo, e nunca antes de ela mexer.
import { computed, signal, type Signal } from "@angular/core";
import { PASSOS_RUN, type PassoRun, type PendenciasRun } from "../data/pendencias-run";

export class ValidacaoPassos {
  private readonly tentou = signal<ReadonlySet<PassoRun>>(new Set());
  private readonly tocados = signal<ReadonlySet<string>>(new Set());

  constructor(private readonly pendencias: Signal<PendenciasRun>) {}

  /** Mensagem de erro visível por campo. */
  readonly erros = computed<ReadonlyMap<string, string>>(() => {
    const p = this.pendencias();
    const tentou = this.tentou();
    const tocados = this.tocados();
    const mapa = new Map<string, string>();
    for (const passo of PASSOS_RUN) {
      for (const pend of p[passo]) {
        if ((tentou.has(passo) || tocados.has(pend.campo)) && !mapa.has(pend.campo))
          mapa.set(pend.campo, pend.mensagem);
      }
    }
    return mapa;
  });

  /** A pessoa saiu do campo. */
  tocar(campo: string): void {
    if (!this.tocados().has(campo)) this.tocados.update((t) => new Set([...t, campo]));
  }

  /** A pessoa tentou avançar o passo: todos os erros dele aparecem. */
  tentar(passo: PassoRun): void {
    if (!this.tentou().has(passo)) this.tentou.update((t) => new Set([...t, passo]));
  }
}

/**
 * Foca o primeiro campo com pendência dentro de `raiz`, na ordem das pendências. Se nenhuma tem
 * campo na tela (ex.: lista vazia), foca o resumo de pendências do passo.
 */
export function focarPrimeiraPendencia(raiz: HTMLElement, campos: readonly string[], resumo: string): void {
  for (const campo of campos) {
    const el = raiz.querySelector<HTMLElement>(`[data-campo="${CSS.escape(campo)}"]`);
    if (el !== null && !(el as HTMLInputElement).disabled) {
      el.focus();
      return;
    }
  }
  raiz.querySelector<HTMLElement>(`[data-pendencias="${resumo}"]`)?.focus();
}
