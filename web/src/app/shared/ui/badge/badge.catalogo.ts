import { ChangeDetectionStrategy, Component } from "@angular/core";
import { BadgeComponent } from "./badge.component";

/** Exemplos do catálogo: ui-badge em cada tom. */
@Component({
  selector: "ui-badge-catalogo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent],
  template: `
    <ui-badge>Aguardando entrega</ui-badge>
    <ui-badge tom="acento">À venda</ui-badge>
    <ui-badge tom="sucesso">Entregue</ui-badge>
    <ui-badge tom="alerta">Retirada pedida</ui-badge>
    <ui-badge tom="erro">Rejeitada</ui-badge>
    <ui-badge tom="info">Em análise</ui-badge>
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-3);
      align-items: center;
    }
  `,
})
export class BadgeCatalogoComponent {}
