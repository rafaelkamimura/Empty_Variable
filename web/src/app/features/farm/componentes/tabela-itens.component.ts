import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";
import { formatarZenyCompleto, lerZeny } from "@betel/farm";
import { ImagemItemComponent } from "../../../shared/dominio/imagem-item.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { TabelaDirective } from "../../../shared/ui/tabela/tabela.directive";
import { lerIdJogo, lerNome } from "../data/cadastro.modelos";
import type { ItemFarm } from "../data/farm.modelos";
import { CampoSalvoComponent, type SalvarCampo } from "./campo-salvo.component";

export type SalvarItem = (
  item: ItemFarm,
  mudanca: { nome?: string; idJogo?: number | null; precoZeny?: number | null },
) => Promise<boolean>;

interface SalvarDoItem {
  nome: SalvarCampo<string>;
  idJogo: SalvarCampo<number | null>;
  preco: SalvarCampo<number | null>;
}

/** Itens do membro com nome, ID do jogo e preço editáveis (D52: o preço vale em todas as instâncias). */
@Component({
  selector: "app-tabela-itens",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotaoComponent, ImagemItemComponent, TabelaDirective, CampoSalvoComponent],
  template: `
    <table uiTabela padrao>
      <thead>
        <tr>
          <th scope="col">Item</th>
          <th scope="col">ID do jogo</th>
          <th scope="col">Preço de venda</th>
          <th scope="col" aria-label="Ações"></th>
        </tr>
      </thead>
      <tbody>
        @for (l of linhas(); track l.item.id) {
          @let item = l.item;
          @let salvar = l.salvar;
          <tr>
            <td>
              <span class="nome">
                <app-imagem-item [idJogo]="item.idJogo" [nome]="item.nome" [tamanho]="24" />
                <app-campo-salvo
                  [rotulo]="'Nome de ' + item.nome"
                  [valor]="item.nome"
                  [maximo]="80"
                  [ler]="lerNome"
                  [salvar]="salvar.nome"
                />
              </span>
            </td>
            <td class="id">
              <app-campo-salvo
                [rotulo]="'ID do jogo de ' + item.nome"
                tipo="number"
                placeholder="—"
                [valor]="item.idJogo === null ? '' : '' + item.idJogo"
                [ler]="lerIdJogo"
                [salvar]="salvar.idJogo"
              />
            </td>
            <td>
              <app-campo-salvo
                [rotulo]="'Preço de ' + item.nome"
                placeholder="Sem preço"
                modoTeclado="decimal"
                [valor]="preco(item)"
                [ler]="lerPreco"
                [salvar]="salvar.preco"
                (invalido)="precoInvalido.emit()"
              />
            </td>
            <td class="acoes">
              <button
                uiBotao
                variante="perigo"
                tamanho="p"
                (click)="excluir.emit(item)"
                [attr.aria-label]="'Excluir ' + item.nome"
              >
                Excluir
              </button>
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    :host {
      display: block;
    }
    .nome {
      display: flex;
      align-items: center;
      gap: var(--esp-2);
      min-width: 0;
    }
    .nome app-campo-salvo {
      flex: 1;
    }
    /* Larguras só no modo tabela; no modo cartão (área estreita) cada célula ocupa a linha. */
    @container conteudo (min-width: 761px) {
      .id {
        width: 120px;
      }
      .acoes {
        width: 1%;
        text-align: right;
      }
    }
  `,
})
export class TabelaItensComponent {
  readonly itens = input.required<readonly ItemFarm[]>();
  readonly salvar = input.required<SalvarItem>();
  readonly excluir = output<ItemFarm>();
  readonly precoInvalido = output();

  protected readonly lerNome = lerNome;
  protected readonly lerIdJogo = lerIdJogo;
  protected readonly lerPreco = lerZeny;

  /** Os itens com as funções de salvar de cada um, estáveis entre as renderizações. */
  protected readonly linhas = computed(() =>
    this.itens().map((item) => {
      const salvar: SalvarDoItem = {
        nome: (nome) => this.salvar()(item, { nome }),
        idJogo: (idJogo) => this.salvar()(item, { idJogo }),
        preco: (precoZeny) => this.salvar()(item, { precoZeny }),
      };
      return { item, salvar };
    }),
  );

  protected preco(item: ItemFarm): string {
    return item.precoZeny === null ? "" : formatarZenyCompleto(item.precoZeny);
  }
}
