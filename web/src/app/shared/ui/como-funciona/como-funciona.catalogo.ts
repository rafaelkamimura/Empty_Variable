import { ChangeDetectionStrategy, Component } from "@angular/core";
import { ComoFuncionaComponent } from "./como-funciona.component";

/** Exemplos do catálogo: ui-como-funciona com título padrão e personalizado. */
@Component({
  selector: "ui-como-funciona-catalogo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ComoFuncionaComponent],
  template: `
    <ui-como-funciona>
      <p>Cada run distribui pontos pela participação de cada jogador.</p>
      <p>Os pontos viram crédito na loja depois da conferência.</p>
    </ui-como-funciona>
    <ui-como-funciona titulo="Por que a taxa mudou?">
      <p>A taxa nova vale para as próximas compras; as antigas mantêm a taxa da época.</p>
    </ui-como-funciona>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
  `,
})
export class ComoFuncionaCatalogoComponent {}
