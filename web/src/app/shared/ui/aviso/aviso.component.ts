import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

export type TomAviso = "info" | "sucesso" | "alerta" | "erro";

const ROTULO_TOM: Record<TomAviso, string> = {
  info: "Informação",
  sucesso: "Sucesso",
  alerta: "Atenção",
  erro: "Erro",
};

/**
 * Mensagem inline (diretrizes §5 e §6.2). Sempre ícone + texto, nunca só a cor (§2.2).
 * O papel ARIA vem do tom: `erro` usa `role="alert"`; os outros, `role="status"` (§7).
 * Slot `[slot=acoes]`: botões como "Tentar novamente".
 *
 * @nivel molecula
 */
@Component({
  selector: "ui-aviso",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[class.tom-info]": "tom() === 'info'",
    "[class.tom-sucesso]": "tom() === 'sucesso'",
    "[class.tom-alerta]": "tom() === 'alerta'",
    "[class.tom-erro]": "tom() === 'erro'",
    "[attr.role]": "papel()",
  },
  template: `
    <svg class="icone" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" />
      @switch (tom()) {
        @case ("sucesso") {
          <path d="m8 12.5 2.5 2.5L16 9.5" />
        }
        @case ("info") {
          <path d="M12 11v5M12 8h.01" />
        }
        @default {
          <path d="M12 7.5v5.5M12 16h.01" />
        }
      }
    </svg>
    <div class="aviso-texto">
      <span class="sr-only">{{ rotuloTom() }}:</span>
      @if (titulo()) {
        <strong class="titulo">{{ titulo() }}</strong>
      }
      <div class="mensagem"><ng-content /></div>
      <div class="aviso-acoes"><ng-content select="[slot=acoes]" /></div>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      gap: var(--esp-3);
      align-items: flex-start;
      padding: var(--esp-3) var(--esp-4);
      border-radius: var(--raio-m);
      border: 1px solid currentColor;
      font-size: var(--fs-m);
    }
    :host(.tom-info) {
      color: var(--info);
      background: var(--info-fundo);
    }
    :host(.tom-sucesso) {
      color: var(--sucesso);
      background: var(--sucesso-fundo);
    }
    :host(.tom-alerta) {
      color: var(--alerta);
      background: var(--alerta-fundo);
    }
    :host(.tom-erro) {
      color: var(--erro);
      background: var(--erro-fundo);
    }
    .icone {
      flex: none;
      width: 20px;
      height: 20px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .aviso-texto {
      display: grid;
      gap: var(--esp-1);
      min-width: 0;
      color: var(--texto);
    }
    .titulo {
      font-weight: 600;
      color: var(--texto-forte);
    }
    .aviso-acoes {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-2);
    }
    .aviso-acoes:empty {
      display: none;
    }
  `,
})
export class AvisoComponent {
  /** Tom semântico: define cor, ícone e papel ARIA. */
  readonly tom = input<TomAviso>("info");
  /** Título curto opcional, em negrito acima da mensagem. */
  readonly titulo = input<string>();

  protected readonly papel = computed(() => (this.tom() === "erro" ? "alert" : "status"));
  protected readonly rotuloTom = computed(() => ROTULO_TOM[this.tom()]);
}
