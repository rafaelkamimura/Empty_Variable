// Validação de formulários em passos (diretrizes §6.4 e §7): cada pendência diz o campo e como
// corrigir; o erro de um campo aparece depois de a pessoa sair dele ou de tentar avançar o passo,
// e nunca antes de ela mexer. O `campo` é o atributo `data-campo` do controle na tela.
import { computed, signal, type Signal } from "@angular/core";

export interface Pendencia {
  /** Campo com o problema (`data-campo` do controle), ou o nome da lista quando não há campo. */
  readonly campo: string;
  /** Como corrigir, para aparecer junto do campo ("Escolha o personagem."). */
  readonly mensagem: string;
  /** De qual linha é ("Participante 2"), para o resumo do passo. */
  readonly contexto?: string;
}

/** Pendências de cada passo de um formulário em passos. */
export type PendenciasPorPasso<P extends string> = Readonly<Record<P, readonly Pendencia[]>>;

/** Texto da pendência no resumo do passo: "Participante 2: escolha a classe." */
export function textoPendencia(p: Pendencia): string {
  if (p.contexto === undefined) return p.mensagem;
  return `${p.contexto}: ${p.mensagem.charAt(0).toLowerCase()}${p.mensagem.slice(1)}`;
}

/** Quais erros mostrar: os dos campos tocados e os dos passos em que a pessoa tentou avançar. */
export class ValidacaoPassos<P extends string> {
  private readonly tentou = signal<ReadonlySet<P>>(new Set());
  private readonly tocados = signal<ReadonlySet<string>>(new Set());

  constructor(
    private readonly pendencias: Signal<PendenciasPorPasso<P>>,
    private readonly passos: readonly P[],
  ) {}

  /** Mensagem de erro visível por campo. */
  readonly erros = computed<ReadonlyMap<string, string>>(() => {
    const p = this.pendencias();
    const tentou = this.tentou();
    const tocados = this.tocados();
    const mapa = new Map<string, string>();
    for (const passo of this.passos) {
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
  tentar(passo: P): void {
    if (!this.tentou().has(passo)) this.tentou.update((t) => new Set([...t, passo]));
  }

  /** Recomeça (formulário novo): nenhum erro visível. */
  limpar(): void {
    this.tentou.set(new Set());
    this.tocados.set(new Set());
  }
}

/**
 * Foca o primeiro campo com pendência dentro de `raiz`, na ordem das pendências. Se nenhuma tem
 * campo na tela (ex.: lista vazia), foca o resumo do passo (`[data-pendencias=<resumo>]`).
 */
export function focarPrimeiraPendencia(raiz: HTMLElement, campos: readonly string[], resumo: string): void {
  for (const campo of campos) {
    const el = raiz.querySelector<HTMLElement>(`[data-campo="${CSS.escape(campo)}"]`);
    if (el !== null && !(el as HTMLInputElement).disabled) {
      el.focus();
      return;
    }
  }
  raiz.querySelector<HTMLElement>(`[data-pendencias="${CSS.escape(resumo)}"]`)?.focus();
}
