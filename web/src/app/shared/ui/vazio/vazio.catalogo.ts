import { ChangeDetectionStrategy, Component } from "@angular/core";
import { BotaoComponent } from "../botao/botao.component";
import { VazioComponent } from "./vazio.component";

/** Exemplos do catálogo: ui-vazio com e sem ação. */
@Component({
  selector: "ui-vazio-catalogo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VazioComponent, BotaoComponent],
  template: `
    <ui-vazio mensagem="Nenhuma compra ainda. Os itens comprados na loja aparecem aqui." />
    <ui-vazio mensagem="O estoque está vazio.">
      <button uiBotao variante="principal" slot="acao">Nova entrada</button>
    </ui-vazio>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-4);
    }
  `,
})
export class VazioCatalogoComponent {}
