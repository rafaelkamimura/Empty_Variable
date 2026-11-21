import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { MarcaComponent } from "../marca/marca.component";

/**
 * Estado vazio (diretrizes §5 e §6.2): a marca {∅_}, uma frase que explica e, se houver,
 * a ação para preencher (slot `[slot=acao]`).
 *
 * @nivel molecula
 */
@Component({
  selector: "ui-vazio",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarcaComponent],
  template: `
    <ui-marca class="marca" />
    <p class="frase">{{ mensagem() }}</p>
    <div class="acao"><ng-content select="[slot=acao]" /></div>
  `,
  styles: `
    :host {
      display: grid;
      justify-items: center;
      gap: var(--esp-3);
      padding: var(--esp-6) var(--esp-4);
      text-align: center;
      border: 1px dashed var(--borda-forte);
      border-radius: var(--raio-g);
      background: var(--aurora-brilho), var(--superficie);
    }
    .marca {
      font-size: var(--fs-2xl);
    }
    .frase {
      margin: 0;
      max-width: 48ch;
      color: var(--texto-suave);
    }
    .acao:empty {
      display: none;
    }
  `,
})
export class VazioComponent {
  /** Frase que explica por que está vazio (e o que fazer). */
  readonly mensagem = input.required<string>();
}
