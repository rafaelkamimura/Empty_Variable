import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { ImagemItemComponent } from "../../../shared/dominio/imagem-item.component";
import { PontosPipe } from "../../../shared/pipes/pontos.pipe";
import { CartaoComponent } from "../../../shared/ui/cartao/cartao.component";
import { type ItemCatalogoLoja, ROTULO_TIPO_ITEM } from "../data/loja.modelos";

/**
 * Cartão de um item do catálogo da loja: imagem, tipo, nome (botão que abre a compra), preço e
 * estoque. O cartão inteiro é a área de clique do botão do nome.
 */
@Component({
  selector: "app-cartao-item-loja",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CartaoComponent, ImagemItemComponent, PontosPipe],
  template: `
    <ui-cartao role="article" class="cartao">
      <span class="arte">
        <app-imagem-item
          [idJogo]="item().idJogo"
          [nome]="item().nome"
          [tipo]="item().tipo"
          [tamanho]="88"
          [ilustracao]="true"
        />
      </span>
      <small class="tipo">{{ rotulos[item().tipo ?? "OUTRO"] }}</small>
      <h2 class="nome">
        <button type="button" class="abrir" (click)="abrir.emit()">{{ item().nome }}</button>
      </h2>
      <div slot="rodape" class="rodape">
        <span class="preco">{{ item().preco === null ? "Preço a definir" : (item().preco | pontos) }}</span>
        <span class="estoque">{{ item().quantidade }} em estoque</span>
      </div>
    </ui-cartao>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .cartao {
      position: relative;
      height: 100%;
      padding: 0;
      gap: var(--esp-1);
      overflow: hidden;
    }
    .cartao:focus-within {
      border-color: var(--acento);
      box-shadow: var(--brilho-acento);
    }
    .cartao:hover {
      border-color: var(--borda-forte);
    }
    .arte {
      display: grid;
      place-items: center;
      aspect-ratio: 4 / 3;
      min-height: 96px;
      background:
        radial-gradient(ellipse at 50% 55%, var(--acento-fundo), transparent 75%), var(--superficie);
    }
    .tipo {
      padding: var(--esp-2) var(--esp-3) 0;
      font-size: var(--fs-xs);
      color: var(--texto-suave);
    }
    .nome {
      margin: 0;
      padding: 0 var(--esp-3);
      font-size: var(--fs-m);
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .abrir {
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--texto-forte);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .abrir:focus-visible {
      outline: none;
    }
    /* O botão do nome cobre o cartão inteiro. */
    .abrir::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
    }
    .rodape {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: baseline;
      gap: var(--esp-1) var(--esp-2);
      width: 100%;
      padding: 0 var(--esp-3) var(--esp-3);
    }
    .preco {
      font-weight: 700;
      color: var(--texto-forte);
      font-variant-numeric: tabular-nums;
    }
    .estoque {
      font-size: var(--fs-xs);
      color: var(--texto-suave);
    }
  `,
})
export class CartaoItemLojaComponent {
  readonly item = input.required<ItemCatalogoLoja>();
  /** Clique no item: abrir a compra. */
  readonly abrir = output();
  protected readonly rotulos = ROTULO_TIPO_ITEM;
}
