import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import { ROTULO_CATEGORIA, rotuloDaCategoria } from "../data/categorias";
import type { FiltroLista } from "../data/filtro";
import type { ItemPatch } from "../data/relatorio.modelos";
import { DetalheItemComponent } from "./detalhe-item.component";
import { IdentificacaoComponent } from "./identificacao.component";
import { CorpoDaLinhaDirective, LinhaExpansivelComponent } from "./linha-expansivel.component";
import { LinkItemComponent } from "./link-item.component";
import { LinhaDaListaDirective, ListaFiltradaComponent } from "./lista-filtrada.component";

const POR_CATEGORIA: FiltroLista<ItemPatch> = {
  chave: "categoria",
  rotulo: "Filtrar por categoria",
  rotuloTodos: "Todos",
  valorDe: (i) => i.categoria,
  opcoes: ROTULO_CATEGORIA,
};

/** Lista de itens do patch (novos ou removidos): busca, chips por categoria e a descrição ao abrir a linha. */
@Component({
  selector: "app-lista-itens",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    IdentificacaoComponent,
    DetalheItemComponent,
    LinhaDaListaDirective,
    CorpoDaLinhaDirective,
    LinhaExpansivelComponent,
    LinkItemComponent,
    ListaFiltradaComponent,
  ],
  template: `
    <app-lista-filtrada
      [itens]="itens()"
      [textoDe]="textoDe"
      [filtros]="filtros"
      rotuloBusca="Buscar por nome, ID ou descrição"
      [mensagemVazio]="mensagemVazio()"
    >
      <ng-template appLinhaDaLista [tipo]="itens()" let-item>
        <app-linha-expansivel>
          <app-link-item slot="codigo" [id]="item.id" [nome]="item.nome" />
          <app-identificacao [nome]="item.nome || '(sem nome)'" />
          <ui-badge>{{ rotulo(item.categoria) }}</ui-badge>
          @if (item.slots > 0) {
            <ui-badge tom="info">{{ item.slots }} {{ item.slots === 1 ? "slot" : "slots" }}</ui-badge>
          }
          @if (item.traje) {
            <ui-badge tom="acento">Traje</ui-badge>
          }
          @if (item.efeito !== null) {
            <ui-badge tom="sucesso">Efeito {{ item.efeito }}</ui-badge>
          }
          <ng-template appCorpoDaLinha>
            <app-detalhe-item [item]="item" />
          </ng-template>
        </app-linha-expansivel>
      </ng-template>
    </app-lista-filtrada>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class ListaItensComponent {
  readonly itens = input.required<readonly ItemPatch[]>();
  /** Frase do estado vazio (ex.: "Este patch não trouxe itens novos."). */
  readonly mensagemVazio = input("Nenhum item neste patch.");

  protected readonly filtros = [POR_CATEGORIA];
  protected readonly rotulo = rotuloDaCategoria;
  protected readonly textoDe = (i: ItemPatch): string => i.busca;
}
