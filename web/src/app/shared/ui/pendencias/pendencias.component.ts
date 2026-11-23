import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { type Pendencia, textoPendencia } from "../../utils/validacao-passos";
import { AvisoComponent } from "../aviso/aviso.component";

/**
 * Resumo do que falta num passo de formulário (diretrizes §6.4). É apoio: o erro de cada campo
 * aparece no próprio `ui-campo`. Fica num `ui-aviso` informativo (`role="status"`), para o leitor
 * de tela anunciar, e recebe o foco quando a pendência não tem campo (ex.: lista vazia); por isso,
 * dê a ele um `data-pendencias` com o nome do passo (ver `focarPrimeiraPendencia`).
 *
 * ```html
 * <ui-pendencias [pendencias]="pend().participantes" data-pendencias="participantes" />
 * ```
 *
 * @nivel molecula
 */
@Component({
  selector: "ui-pendencias",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvisoComponent],
  host: { tabindex: "-1" },
  template: `
    @if (textos().length > 0) {
      <ui-aviso tom="info" [titulo]="titulo()">
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
export class PendenciasComponent {
  readonly pendencias = input.required<readonly Pendencia[]>();
  readonly titulo = input("O que falta neste passo");
  protected readonly textos = computed(() => this.pendencias().map(textoPendencia));
}
