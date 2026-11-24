import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { TextoColoridoComponent } from "../../../shared/ui/texto-colorido/texto-colorido.component";
import { tokenizarTextoRo } from "../data/texto-ro";

/** Texto do jogo (descrição de item, skill ou quest): uma linha por linha, com as cores do cliente. */
@Component({
  selector: "app-texto-ro",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TextoColoridoComponent],
  template: `
    @for (trechos of tokenizadas(); track $index) {
      <ui-texto-colorido [trechos]="trechos" />
    }
  `,
  styles: `
    :host {
      display: block;
      max-width: 80ch;
      color: var(--texto);
      line-height: 1.5;
    }
  `,
})
export class TextoRoComponent {
  /** Linhas com a marcação do jogo (`^RRGGBB`, `<NAVI>`…). */
  readonly linhas = input.required<readonly string[]>();

  protected readonly tokenizadas = computed(() => this.linhas().map(tokenizarTextoRo));
}
