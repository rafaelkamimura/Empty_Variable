import { ChangeDetectionStrategy, Component, input } from "@angular/core";

export type TomBadge = "neutro" | "acento" | "sucesso" | "alerta" | "erro" | "info";

/**
 * Rótulo curto de status (diretrizes §5): situação de compra, oferta ou run. O texto diz o
 * estado; o tom só reforça (§2.2: nunca só a cor).
 *
 * @nivel atomo
 */
@Component({
  selector: "ui-badge",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[class.tom-acento]": "tom() === 'acento'",
    "[class.tom-sucesso]": "tom() === 'sucesso'",
    "[class.tom-alerta]": "tom() === 'alerta'",
    "[class.tom-erro]": "tom() === 'erro'",
    "[class.tom-info]": "tom() === 'info'",
  },
  template: `<ng-content />`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--esp-1);
      padding: 0 var(--esp-2);
      min-height: 22px;
      border: 1px solid var(--borda-forte);
      border-radius: var(--raio-total);
      background: var(--elevado);
      color: var(--texto);
      font-size: var(--fs-xs);
      font-weight: 600;
      line-height: 1.4;
      white-space: nowrap;
    }
    :host(.tom-acento) {
      border-color: var(--acento);
      background: var(--acento-fundo);
      color: var(--texto-forte);
    }
    :host(.tom-sucesso) {
      border-color: var(--sucesso);
      background: var(--sucesso-fundo);
      color: var(--sucesso);
    }
    :host(.tom-alerta) {
      border-color: var(--alerta);
      background: var(--alerta-fundo);
      color: var(--alerta);
    }
    :host(.tom-erro) {
      border-color: var(--erro);
      background: var(--erro-fundo);
      color: var(--erro);
    }
    :host(.tom-info) {
      border-color: var(--info);
      background: var(--info-fundo);
      color: var(--info);
    }
  `,
})
export class BadgeComponent {
  /** Tom semântico do status. */
  readonly tom = input<TomBadge>("neutro");
}
