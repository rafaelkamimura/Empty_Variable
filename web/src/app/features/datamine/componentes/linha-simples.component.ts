import { ChangeDetectionStrategy, Component } from "@angular/core";

/**
 * Linha de lista sem detalhes para abrir (monstro, mapa, arquivo do GRF). Tem o mesmo recuo e a
 * mesma altura mínima da `app-linha-expansivel`, para as duas conviverem na mesma lista.
 */
@Component({
  selector: "app-linha-simples",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--esp-1) var(--esp-2);
      min-height: 40px;
      box-sizing: border-box;
      padding: var(--esp-2) var(--esp-3) var(--esp-2) calc(var(--esp-3) + var(--esp-4) + var(--esp-2));
      min-width: 0;
      overflow-wrap: anywhere;
    }
  `,
})
export class LinhaSimplesComponent {}
