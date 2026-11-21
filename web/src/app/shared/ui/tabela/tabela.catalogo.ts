import { ChangeDetectionStrategy, Component } from "@angular/core";
import { BotaoComponent } from "../botao/botao.component";
import { TabelaDirective } from "./tabela.directive";

/** Exemplos do catálogo: table[uiTabela] (estreite a janela para ver as linhas virarem cartões). */
@Component({
  selector: "ui-tabela-catalogo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TabelaDirective, BotaoComponent],
  template: `
    <p class="meta">Abaixo de 760 px de conteúdo, cada linha vira um cartão "rótulo: valor".</p>
    <table uiTabela>
      <thead>
        <tr>
          <th>Item</th>
          <th class="numero">Quantidade</th>
          <th>Origem</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @for (l of linhas; track l.item) {
          <tr>
            <td>{{ l.item }}</td>
            <td class="numero">{{ l.qtd }}</td>
            <td>{{ l.origem }}</td>
            <td><button uiBotao variante="fantasma" tamanho="p">Editar</button></td>
          </tr>
        }
      </tbody>
    </table>
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
  `,
})
export class TabelaCatalogoComponent {
  protected readonly linhas = [
    { item: "Alma de Betelgeuse", qtd: 12, origem: "Run de 18/11" },
    { item: "Fragmento de Meteorito", qtd: 1340, origem: "Compra na loja" },
    { item: "Armadura Nebulosa POD com nome longo para quebrar", qtd: 1, origem: "Doação" },
  ];
}
