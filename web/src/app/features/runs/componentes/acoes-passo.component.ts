import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { MatStepperModule } from "@angular/material/stepper";
import { RouterLink } from "@angular/router";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";

/**
 * Rodapé de um passo do assistente: Voltar, o botão principal (Próximo ou Registrar) e Cancelar.
 * O principal fica sempre clicável: quem usa decide, no `avancar`, se há pendência (§6.4).
 */
@Component({
  selector: "app-acoes-passo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatStepperModule, RouterLink, BotaoComponent],
  template: `
    @if (voltar()) {
      <button uiBotao variante="fantasma" type="button" matStepperPrevious>Voltar</button>
    }
    <button uiBotao variante="principal" type="button" [carregando]="carregando()" (click)="avancar.emit()">
      {{ rotulo() }}
    </button>
    <a uiBotao variante="fantasma" routerLink="/gestao/runs">Cancelar</a>
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
  /** Envio em andamento (só no último passo). */
  readonly carregando = input(false);
  readonly avancar = output();
}
