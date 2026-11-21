import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/**
 * Bloco de indicador (diretrizes §5 e §11): rótulo, número em destaque e uma linha de contexto.
 * O valor chega já formatado (pipes de pontos/zeny na página). `tom="alerta"` para pendências.
 *
 * @nivel molecula
 */
@Component({
  selector: "ui-resumo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class.alerta]": "tom() === 'alerta'" },
  template: `
    <span class="indicador-rotulo">{{ rotulo() }}</span>
    <strong class="indicador-valor">{{ valor() }}</strong>
    @if (meta()) {
      <span class="meta">{{ meta() }}</span>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-1);
      padding: var(--esp-4);
      background: var(--cartao);
      border: 1px solid var(--borda);
      border-radius: var(--raio-g);
    }
    .indicador-rotulo {
      font-size: var(--fs-s);
      font-weight: 600;
      color: var(--texto-suave);
    }
    .indicador-valor {
      font-size: var(--fs-2xl);
      font-weight: 700;
      line-height: 1.1;
      color: var(--texto-forte);
      font-variant-numeric: tabular-nums;
      overflow-wrap: anywhere;
    }
    :host(.alerta) .indicador-valor {
      color: var(--alerta);
    }
    .meta {
      font-size: var(--fs-xs);
      color: var(--texto-apagado);
    }
  `,
})
export class ResumoComponent {
  /** Texto curto acima do número (ex.: "Saldo disponível"). */
  readonly rotulo = input.required<string>();
  /** Valor já formatado. */
  readonly valor = input.required<string>();
  /** Linha de contexto abaixo do número. */
  readonly meta = input<string>();
  /** `alerta` destaca o número (ex.: compras para entregar). */
  readonly tom = input<"padrao" | "alerta">("padrao");
}
