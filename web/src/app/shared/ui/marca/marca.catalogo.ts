import { ChangeDetectionStrategy, Component } from "@angular/core";
import { MarcaComponent } from "./marca.component";

/** Exemplos do catálogo: ui-marca nos três tamanhos, sobre o fundo e sobre a aurora. */
@Component({
  selector: "ui-marca-catalogo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MarcaComponent],
  template: `
    <div class="linha">
      <ui-marca tamanho="p" />
      <ui-marca />
      <ui-marca tamanho="g" rotulo="Empty Variable" />
    </div>
    <div class="linha aurora">
      <ui-marca tamanho="g" />
      <span class="nome">Empty Variable</span>
    </div>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-4);
    }
    .linha {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--esp-5);
      padding: var(--esp-5);
      border: 1px solid var(--borda);
      border-radius: var(--raio-g);
      background: var(--superficie);
    }
    .aurora {
      background: var(--aurora-brilho), var(--fundo);
    }
    .nome {
      font-size: var(--fs-xl);
      font-weight: 700;
      color: var(--texto-forte);
    }
  `,
})
export class MarcaCatalogoComponent {}
