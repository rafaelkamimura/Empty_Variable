import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { CartaoComponent } from "../../../shared/ui/cartao/cartao.component";

export interface PilulaInstancia {
  readonly nome: string;
  readonly feita: boolean;
}

/** Cartão de um personagem na visão "Todos": quantas feitas e o estado de cada instância. */
@Component({
  selector: "app-visao-personagem",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CartaoComponent],
  template: `
    <button
      uiCartao
      class="cartao"
      (click)="abrir.emit()"
      [attr.aria-label]="nome() + ': ' + feitas() + ' de ' + total() + ' feitas'"
    >
      <span class="topo">
        <strong>{{ nome() }}</strong>
        <span class="contagem">{{ feitas() }}/{{ total() }}</span>
      </span>
      <span class="pilulas">
        @for (p of pilulas(); track p.nome) {
          <span class="pilula" [class.feita]="p.feita">{{ p.feita ? "✓ " : "" }}{{ p.nome }}</span>
        } @empty {
          <span class="dica">Nenhuma instância marcada para este personagem.</span>
        }
      </span>
    </button>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .cartao {
      width: 100%;
      height: 100%;
    }
    .topo {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: var(--esp-2);
    }
    strong {
      color: var(--texto-forte);
      overflow-wrap: anywhere;
    }
    .contagem {
      font-size: var(--fs-s);
      color: var(--texto-suave);
      font-variant-numeric: tabular-nums;
    }
    .pilulas {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-1);
    }
    .pilula {
      padding: 0 var(--esp-2);
      border: 1px solid var(--borda-forte);
      border-radius: var(--raio-total);
      font-size: var(--fs-xs);
      line-height: 1.8;
      color: var(--texto-suave);
    }
    .pilula.feita {
      border-color: var(--sucesso);
      background: var(--sucesso-fundo);
      color: var(--sucesso);
    }
    .dica {
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
  `,
})
export class VisaoPersonagemComponent {
  readonly nome = input.required<string>();
  readonly feitas = input.required<number>();
  readonly total = input.required<number>();
  readonly pilulas = input.required<readonly PilulaInstancia[]>();
  readonly abrir = output();
}
