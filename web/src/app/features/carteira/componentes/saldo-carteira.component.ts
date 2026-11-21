import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { PontosPipe } from "../../../shared/pipes/pontos.pipe";

/** Saldo em destaque, com o brilho da aurora atrás do número (diretrizes §2.4). */
@Component({
  selector: "app-saldo-carteira",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PontosPipe],
  template: `
    <span class="rotulo">Saldo disponível</span>
    <strong class="numero" data-testid="saldo-carteira">{{ saldo() | pontos }}</strong>
  `,
  styles: `
    :host {
      position: relative;
      display: grid;
      gap: var(--esp-1);
      padding: var(--esp-5);
      overflow: hidden;
      border: 1px solid var(--borda);
      border-radius: var(--raio-g);
      background: var(--aurora-brilho), var(--cartao);
      isolation: isolate;
    }
    .rotulo {
      font-size: var(--fs-s);
      font-weight: 600;
      color: var(--texto-suave);
    }
    .numero {
      font-size: calc(var(--fs-2xl) * 1.3);
      font-weight: 700;
      line-height: 1.1;
      color: var(--texto-forte);
      font-variant-numeric: tabular-nums;
      overflow-wrap: anywhere;
    }
  `,
})
export class SaldoCarteiraComponent {
  readonly saldo = input.required<number>();
}
