import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { BotaoComponent } from "../botao/botao.component";
import { PainelLateralComponent } from "./painel-lateral.component";

/** Exemplos do catálogo: ui-painel-lateral com um formulário curto. */
@Component({
  selector: "ui-painel-lateral-catalogo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PainelLateralComponent, BotaoComponent],
  template: `
    <p class="meta">
      Abra com o botão; feche no X, no fundo ou com Esc. O foco vai ao primeiro campo e volta ao botão.
    </p>
    <div><button uiBotao variante="principal" (click)="aberto.set(true)">Abrir painel</button></div>
    <ui-painel-lateral titulo="Nova entrada no estoque" [aberto]="aberto()" (fechar)="aberto.set(false)">
      <label class="campo">Item <input /></label>
      <label class="campo">Quantidade <input inputmode="numeric" /></label>
      <div><button uiBotao variante="principal" (click)="aberto.set(false)">Salvar</button></div>
    </ui-painel-lateral>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
    .meta {
      margin: 0;
      color: var(--texto-suave);
    }
    .campo {
      display: grid;
      gap: var(--esp-1);
      color: var(--texto-suave);
      font-size: var(--fs-s);
    }
    .campo input {
      min-height: 40px;
      padding: 0 var(--esp-3);
      border: 1px solid var(--borda-campo);
      border-radius: var(--raio-p);
      background: var(--fundo);
      color: var(--texto);
      font: inherit;
    }
  `,
})
export class PainelLateralCatalogoComponent {
  protected readonly aberto = signal(false);
}
