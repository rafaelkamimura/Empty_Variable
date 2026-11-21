import { ChangeDetectionStrategy, Component } from "@angular/core";
import { BotaoComponent } from "../botao/botao.component";
import { AvisoComponent } from "./aviso.component";

/** Exemplos do catálogo: ui-aviso em cada tom, com título, ação e texto longo. */
@Component({
  selector: "ui-aviso-catalogo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvisoComponent, BotaoComponent],
  template: `
    <ui-aviso tom="info">Vincule sua conta do Discord a um personagem para ver a carteira.</ui-aviso>
    <ui-aviso tom="sucesso" titulo="Compra registrada">O item entra na fila de entrega.</ui-aviso>
    <ui-aviso tom="alerta">Faltam 2 peças no estoque para esta oferta.</ui-aviso>
    <ui-aviso tom="erro" titulo="Não foi possível carregar.">
      A API não respondeu.
      <button uiBotao tamanho="p" slot="acoes">Tentar novamente</button>
    </ui-aviso>
    <ui-aviso tom="info">
      Um aviso com texto propositalmente longo, para conferir a quebra de linha, o alinhamento do ícone no
      topo e a leitura em telas estreitas, sem que nada estoure a largura do contêiner.
    </ui-aviso>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
  `,
})
export class AvisoCatalogoComponent {}
