import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

export type FormatoSkeleton = "linhas" | "cartoes" | "tabela";

/**
 * Placeholder animado no formato do conteúdo (diretrizes §6.2: nada de "Carregando…").
 * Fica escondido de leitores de tela; quem o usa anuncia o carregamento (o `ui-estado` já faz).
 *
 * @nivel atomo
 */
@Component({
  selector: "ui-skeleton",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "aria-hidden": "true",
    "[class.formato-linhas]": "formato() === 'linhas'",
    "[class.formato-cartoes]": "formato() === 'cartoes'",
    "[class.formato-tabela]": "formato() === 'tabela'",
  },
  template: `
    @for (i of itens(); track i) {
      <span class="bloco"></span>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
    :host(.formato-cartoes) {
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: var(--esp-4);
    }
    .bloco {
      display: block;
      height: var(--esp-4);
      border-radius: var(--raio-p);
      background: linear-gradient(90deg, var(--cartao), var(--elevado), var(--cartao));
      background-size: 200% 100%;
      animation: brilho 1.4s var(--curva) infinite;
    }
    :host(.formato-linhas) .bloco:last-child {
      width: 60%;
    }
    :host(.formato-cartoes) .bloco {
      height: 160px;
      border-radius: var(--raio-g);
    }
    :host(.formato-tabela) .bloco {
      height: var(--esp-6);
    }
    :host(.formato-tabela) .bloco:first-child {
      height: var(--esp-5);
      opacity: 0.6;
    }
    @keyframes brilho {
      from {
        background-position: 100% 0;
      }
      to {
        background-position: -100% 0;
      }
    }
  `,
})
export class SkeletonComponent {
  /** Formato do conteúdo que vai aparecer. */
  readonly formato = input<FormatoSkeleton>("linhas");
  /** Quantos blocos (linhas, cartões ou linhas da tabela). */
  readonly quantidade = input(3);

  protected readonly itens = computed(() =>
    Array.from({ length: Math.max(1, this.quantidade()) }, (_, i) => i),
  );
}
