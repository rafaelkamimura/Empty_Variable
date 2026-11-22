import { ChangeDetectionStrategy, Component } from "@angular/core";

/**
 * Céu estrelado da casca (diretrizes §2.4): uma camada fixa atrás de todo o conteúdo, só
 * decoração. Estrelas distantes paradas, estrelas próximas que cintilam devagar e uma estrela
 * cadente de vez em quando. Com `prefers-reduced-motion`, tudo fica parado e a cadente não passa.
 */
@Component({
  selector: "app-ceu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "aria-hidden": "true" },
  template: `<span class="cadente"></span>`,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: -1;
      overflow: hidden;
      pointer-events: none;
    }
    :host::before,
    :host::after {
      content: "";
      position: absolute;
      inset: 0;
    }
    :host::before {
      background-image: var(--ceu-distante);
      background-size: var(--ceu-distante-tamanho);
      opacity: 0.6;
    }
    :host::after {
      background-image: var(--ceu-proximo);
      background-size: var(--ceu-proximo-tamanho);
      opacity: 0.85;
      animation: cintilar 6s ease-in-out infinite alternate;
    }
    .cadente {
      position: absolute;
      top: 14%;
      right: 8%;
      width: 120px;
      height: 1px;
      background: linear-gradient(90deg, var(--estrela), transparent);
      opacity: 0;
      transform: rotate(-32deg);
      animation: cadente 24s linear infinite;
    }
    @keyframes cintilar {
      from {
        opacity: 0.3;
      }
    }
    @keyframes cadente {
      0%,
      94% {
        opacity: 0;
        transform: rotate(-32deg) translateX(0);
      }
      96% {
        opacity: 0.6;
      }
      100% {
        opacity: 0;
        transform: rotate(-32deg) translateX(-340px);
      }
    }
  `,
})
export class CeuComponent {}
