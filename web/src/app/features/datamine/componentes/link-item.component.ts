import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { urlDoItemNaDivinePride } from "../data/itens";

/**
 * O ID de um item como link para a página dele na Divine Pride, em outra aba. O texto do link é só
 * o número, por isso o nome acessível diz para onde ele leva. O alvo tem 40 px de altura (§6.6).
 * Sem ID válido, mostra o número sem link.
 */
@Component({
  selector: "app-link-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (url(); as endereco) {
      <a [href]="endereco" target="_blank" rel="noopener noreferrer" [attr.aria-label]="rotulo()"
        >{{ id() }}<span class="fora" aria-hidden="true">↗</span></a
      >
    } @else {
      <span class="sem-link">{{ id() }}</span>
    }
  `,
  styles: `
    :host {
      position: relative;
      z-index: 1;
      display: inline-flex;
    }
    a,
    .sem-link {
      display: inline-flex;
      align-items: center;
      gap: var(--esp-1);
      min-height: 40px;
      font-family: var(--fonte-mono);
      font-size: var(--fs-s);
      font-variant-numeric: tabular-nums;
    }
    a {
      color: var(--acento);
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    a:hover {
      color: var(--texto-forte);
    }
    a:focus-visible {
      outline: 2px solid var(--foco);
      outline-offset: 2px;
      border-radius: var(--raio-p);
    }
    .sem-link {
      color: var(--texto-suave);
    }
    .fora {
      font-size: var(--fs-xs);
    }
  `,
})
export class LinkItemComponent {
  /** ID do item no jogo. */
  readonly id = input.required<number>();
  /** Nome do item, para o nome acessível do link ("Carta Agnes (item 300500)…"). */
  readonly nome = input("");

  protected readonly url = computed(() => urlDoItemNaDivinePride(this.id()));
  protected readonly rotulo = computed(() => {
    const quem = this.nome() ? `${this.nome()} (item ${this.id()})` : `Item ${this.id()}`;
    return `${quem} na Divine Pride, abre em outra aba`;
  });
}
