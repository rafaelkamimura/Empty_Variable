import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import { ROTULO_CATEGORIA } from "../data/categorias";
import type { FiltroLista } from "../data/filtro";
import { descricaoMudou, descricaoNaoIdentificadaMudou, mudancasDeCampo } from "../data/itens";
import { type ItemAlterado, type ItemPatch, rotuloDoCampo } from "../data/relatorio.modelos";
import { DiffDescricaoComponent } from "./diff-descricao.component";
import { IdentificacaoComponent } from "./identificacao.component";
import { CorpoDaLinhaDirective, LinhaExpansivelComponent } from "./linha-expansivel.component";
import { ListaItensComponent } from "./lista-itens.component";
import { LinkItemComponent } from "./link-item.component";
import { LinhaDaListaDirective, ListaFiltradaComponent } from "./lista-filtrada.component";
import { TextoRoComponent } from "./texto-ro.component";

const POR_CATEGORIA: FiltroLista<ItemAlterado> = {
  chave: "categoria",
  rotulo: "Filtrar por categoria",
  rotuloTodos: "Todos",
  valorDe: (i) => i.categoria,
  opcoes: ROTULO_CATEGORIA,
};

/**
 * Aba "Itens alterados": cada linha abre o que mudou no item (campos com antes e depois, e a
 * descrição comparada linha a linha). Os itens que o patch removeu ficam numa seção abaixo.
 */
@Component({
  selector: "app-aba-itens-alterados",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    IdentificacaoComponent,
    DiffDescricaoComponent,
    LinhaDaListaDirective,
    CorpoDaLinhaDirective,
    LinhaExpansivelComponent,
    LinkItemComponent,
    ListaFiltradaComponent,
    ListaItensComponent,
    TextoRoComponent,
  ],
  template: `
    <app-lista-filtrada
      [itens]="alterados()"
      [textoDe]="textoDe"
      [filtros]="filtros"
      rotuloBusca="Buscar por nome (novo ou antigo), ID ou descrição"
      mensagemVazio="Este patch não alterou itens."
    >
      <ng-template appLinhaDaLista [tipo]="alterados()" let-item>
        <app-linha-expansivel>
          <app-link-item slot="codigo" [id]="item.depois.id" [nome]="item.depois.nome || item.antes.nome" />
          <app-identificacao [nome]="item.depois.nome || item.antes.nome || '(sem nome)'" />
          @for (campo of item.campos; track campo) {
            <ui-badge>{{ rotuloDoCampo(campo) }}</ui-badge>
          }
          <ng-template appCorpoDaLinha>
            @let campos = mudancas(item);
            @if (campos.length > 0) {
              <dl class="campos">
                @for (c of campos; track c.rotulo) {
                  <div>
                    <dt>{{ c.rotulo }}</dt>
                    <dd>
                      <span class="sr-only">antes: </span><span class="antes">{{ c.antes }}</span>
                      <span aria-hidden="true"> → </span><span class="sr-only">, agora: </span
                      ><span class="depois">{{ c.depois }}</span>
                    </dd>
                  </div>
                }
              </dl>
            }
            @if (descricaoMudou(item)) {
              <div>
                <p class="titulo-bloco">Descrição</p>
                <app-diff-descricao [antes]="item.antes.descricao" [depois]="item.depois.descricao" />
              </div>
            } @else {
              <app-texto-ro [linhas]="item.depois.descricao" />
            }
            @if (naoIdentificadaMudou(item)) {
              <div>
                <p class="titulo-bloco">Descrição do item não identificado</p>
                <app-diff-descricao
                  [antes]="item.antes.descricaoNaoIdentificada"
                  [depois]="item.depois.descricaoNaoIdentificada"
                />
              </div>
            }
          </ng-template>
        </app-linha-expansivel>
      </ng-template>
    </app-lista-filtrada>
    @if (removidos().length > 0) {
      <section
        class="removidos"
        aria-labelledby="titulo-itens-removidos"
        data-testid="datamine-itens-removidos"
      >
        <h2 id="titulo-itens-removidos">Itens removidos</h2>
        <app-lista-itens [itens]="removidos()" />
      </section>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-5);
    }
    .campos {
      display: grid;
      gap: var(--esp-1);
      margin: 0;
      max-width: 80ch;
    }
    .campos div {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-1) var(--esp-2);
    }
    dt {
      font-weight: 600;
      color: var(--texto-suave);
    }
    dt::after {
      content: ":";
    }
    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    .antes {
      color: var(--texto-suave);
    }
    .depois {
      font-weight: 600;
      color: var(--texto-forte);
    }
    .titulo-bloco {
      margin: 0 0 var(--esp-1);
      font-size: var(--fs-s);
      font-weight: 600;
      color: var(--texto-suave);
    }
    h2 {
      margin: 0 0 var(--esp-3);
      font-size: var(--fs-l);
      font-weight: 700;
      color: var(--texto-forte);
    }
  `,
})
export class AbaItensAlteradosComponent {
  readonly alterados = input.required<readonly ItemAlterado[]>();
  readonly removidos = input<readonly ItemPatch[]>([]);

  protected readonly filtros = [POR_CATEGORIA];
  protected readonly rotuloDoCampo = rotuloDoCampo;
  protected readonly mudancas = mudancasDeCampo;
  protected readonly descricaoMudou = descricaoMudou;
  protected readonly naoIdentificadaMudou = descricaoNaoIdentificadaMudou;
  protected readonly textoDe = (i: ItemAlterado): string => i.busca;
}
