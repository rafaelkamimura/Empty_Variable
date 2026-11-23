import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { type Pendencia, textoPendencia } from "../data/pendencias-run";

/**
 * Resumo do que falta para avançar no passo. É apoio: o erro de cada campo aparece no próprio
 * campo. Fica num `ui-aviso` informativo (`role="status"`), para o leitor de tela anunciar, e recebe
 * o foco quando a pendência não tem campo (ex.: lista sem participante).
 */
@Component({
  selector: "app-pendencias-passo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvisoComponent],
  host: { tabindex: "-1" },
  template: `
    @if (textos().length > 0) {
      <ui-aviso tom="info" titulo="O que falta neste passo">
        <ul>
          @for (t of textos(); track $index) {
            <li>{{ t }}</li>
          }
        </ul>
      </ui-aviso>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    :host:focus-visible {
      outline: 2px solid var(--foco);
      outline-offset: 2px;
    }
    ul {
      display: grid;
      gap: var(--esp-1);
      margin: 0;
      padding-left: var(--esp-5);
    }
  `,
})
export class PendenciasPassoComponent {
  readonly pendencias = input.required<readonly Pendencia[]>();
  protected readonly textos = computed(() => this.pendencias().map(textoPendencia));
}
