import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { MatStepperModule } from "@angular/material/stepper";
import { RouterLink } from "@angular/router";
import { BotaoComponent } from "../botao/botao.component";

/**
 * Rodapé de um passo dentro de um `mat-stepper`: Voltar, o botão principal (Próximo, Criar,
 * Registrar…) e, opcionalmente, Cancelar. O principal fica sempre clicável: quem usa decide, no
 * `avancar`, se há pendência, e mostra os erros em vez de desabilitar o botão (diretrizes §6.4).
 * Só funciona dentro de um `mat-stepper` (o Voltar usa `matStepperPrevious`).
 *
 * ```html
 * <ui-acoes-passo [voltar]="false" cancelarPara="/gestao/runs" (avancar)="avancar('dados')" />
 * ```
 *
 * @nivel molecula
 */
@Component({
  selector: "ui-acoes-passo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatStepperModule, RouterLink, BotaoComponent],
  template: `
    @if (voltar()) {
      <button uiBotao variante="fantasma" type="button" matStepperPrevious>Voltar</button>
    }
    <button uiBotao variante="principal" type="button" [carregando]="carregando()" (click)="avancar.emit()">
      {{ rotulo() }}
    </button>
    @if (cancelarPara(); as destino) {
      <a uiBotao variante="fantasma" [routerLink]="destino">Cancelar</a>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-2);
    }
  `,
})
export class AcoesPassoComponent {
  /** Mostra o "Voltar" (falso no primeiro passo). */
  readonly voltar = input(true, { transform: booleanAttribute });
  /** Texto do botão principal. */
  readonly rotulo = input("Próximo");
  /** Envio em andamento (no último passo). */
  readonly carregando = input(false);
  /** Para onde o "Cancelar" leva; sem valor, não há "Cancelar". */
  readonly cancelarPara = input<string | null>(null);
  readonly avancar = output();
}
