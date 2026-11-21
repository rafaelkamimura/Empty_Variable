import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { ImagemItemComponent } from "../../../shared/dominio/imagem-item.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { TabelaDirective } from "../../../shared/ui/tabela/tabela.directive";

export interface LinhaItemTotal {
  id: string;
  nome: string;
  idJogo: number | null;
  quantidade: string;
  preco: string;
  subtotal: string | null;
}
export interface LinhaGrupoTotal {
  id: string;
  nome: string;
  checkins: number;
  itens: string;
  valor: string;
}
export interface LinhaCheckinTotal {
  id: string;
  quando: string;
  personagem: string;
  instancia: string;
  drops: string;
  valor: string;
}
export interface TabelasTotais {
  itens: LinhaItemTotal[];
  totalItens: string;
  totalValor: string;
  porInstancia: LinhaGrupoTotal[];
  /** Vazio quando não vale mostrar (um personagem só, ou filtrado por personagem). */
  porPersonagem: LinhaGrupoTotal[];
  checkins: LinhaCheckinTotal[];
}

/** Tabelas dos totais do farm (D51): por item, por instância, por personagem e os check-ins. */
@Component({
  selector: "app-tabelas-totais",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotaoComponent, ImagemItemComponent, TabelaDirective],
  template: `
    @let t = tabelas();
    <section aria-labelledby="tot-itens">
      <h2 id="tot-itens">Itens</h2>
      <table uiTabela padrao>
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col" class="numero">Qtd</th>
            <th scope="col" class="numero">Preço un.</th>
            <th scope="col" class="numero">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          @for (l of t.itens; track l.id) {
            <tr>
              <td>
                <span class="nome"
                  ><app-imagem-item [idJogo]="l.idJogo" [nome]="l.nome" [tamanho]="20" /> {{ l.nome }}</span
                >
              </td>
              <td class="numero">{{ l.quantidade }}</td>
              <td class="numero suave">{{ l.preco }}</td>
              <td class="numero" [class.zeny]="l.subtotal !== null">{{ l.subtotal ?? "—" }}</td>
            </tr>
          }
          <tr class="total">
            <td>Total</td>
            <td class="numero">{{ t.totalItens }}</td>
            <td></td>
            <td class="numero zeny">{{ t.totalValor }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section aria-labelledby="tot-instancias">
      <h2 id="tot-instancias">Por instância</h2>
      <table uiTabela padrao>
        <thead>
          <tr>
            <th scope="col">Instância</th>
            <th scope="col" class="numero">Check-ins</th>
            <th scope="col" class="numero">Itens</th>
            <th scope="col" class="numero">Valor</th>
          </tr>
        </thead>
        <tbody>
          @for (g of t.porInstancia; track g.id) {
            <tr>
              <td>{{ g.nome }}</td>
              <td class="numero">{{ g.checkins }}</td>
              <td class="numero">{{ g.itens }}</td>
              <td class="numero zeny">{{ g.valor }}</td>
            </tr>
          }
        </tbody>
      </table>
    </section>

    @if (t.porPersonagem.length > 0) {
      <section aria-labelledby="tot-personagens">
        <h2 id="tot-personagens">Por personagem</h2>
        <table uiTabela padrao>
          <thead>
            <tr>
              <th scope="col">Personagem</th>
              <th scope="col" class="numero">Check-ins</th>
              <th scope="col" class="numero">Valor</th>
            </tr>
          </thead>
          <tbody>
            @for (g of t.porPersonagem; track g.id) {
              <tr>
                <td>{{ g.nome }}</td>
                <td class="numero">{{ g.checkins }}</td>
                <td class="numero zeny">{{ g.valor }}</td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    }

    <section aria-labelledby="tot-checkins">
      <h2 id="tot-checkins">Check-ins do período</h2>
      <table uiTabela padrao>
        <thead>
          <tr>
            <th scope="col">Quando</th>
            <th scope="col">Personagem</th>
            <th scope="col">Instância</th>
            <th scope="col">Drops</th>
            <th scope="col" class="numero">Valor</th>
            <th scope="col" aria-label="Ações"></th>
          </tr>
        </thead>
        <tbody>
          @for (c of t.checkins; track c.id) {
            <tr>
              <td class="quando">{{ c.quando }}</td>
              <td>{{ c.personagem }}</td>
              <td>{{ c.instancia }}</td>
              <td class="suave">{{ c.drops }}</td>
              <td class="numero zeny">{{ c.valor }}</td>
              <td class="acoes">
                <button
                  uiBotao
                  variante="perigo"
                  tamanho="p"
                  (click)="remover.emit(c.id)"
                  [attr.aria-label]="'Remover o check-in de ' + c.instancia + ', ' + c.quando"
                >
                  Remover
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </section>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-5);
    }
    section {
      display: grid;
      gap: var(--esp-2);
    }
    h2 {
      margin: 0;
      font-size: var(--fs-l);
      font-weight: 600;
      color: var(--texto-forte);
    }
    .nome {
      display: inline-flex;
      align-items: center;
      gap: var(--esp-2);
    }
    .suave {
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
    .zeny {
      color: var(--alerta);
      font-weight: 600;
    }
    .total td {
      font-weight: 600;
      color: var(--texto-forte);
    }
    /* Larguras só no modo tabela; no modo cartão (área estreita) cada célula ocupa a linha. */
    @container conteudo (min-width: 761px) {
      .quando {
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .acoes {
        width: 1%;
        text-align: right;
      }
    }
  `,
})
export class TabelasTotaisComponent {
  readonly tabelas = input.required<TabelasTotais>();
  /** Id do check-in a remover. */
  readonly remover = output<string>();
}
