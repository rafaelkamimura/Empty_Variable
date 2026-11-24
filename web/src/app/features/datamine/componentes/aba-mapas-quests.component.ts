import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import type { FiltroLista } from "../data/filtro";
import type { MapaPatch, QuestPatch } from "../data/relatorio.modelos";
import { DiffDescricaoComponent } from "./diff-descricao.component";
import { IdentificacaoComponent } from "./identificacao.component";
import { CorpoDaLinhaDirective, LinhaExpansivelComponent } from "./linha-expansivel.component";
import { LinhaSimplesComponent } from "./linha-simples.component";
import { LinhaDaListaDirective, ListaFiltradaComponent } from "./lista-filtrada.component";
import { TextoRoComponent } from "./texto-ro.component";

type Grupo = "mapa-novo" | "mapa-alterado" | "quest-nova" | "quest-alterada";

interface Entrada {
  readonly grupo: Grupo;
  readonly mapa: MapaPatch | null;
  readonly quest: QuestPatch | null;
  readonly busca: string;
}

const POR_GRUPO: FiltroLista<Entrada> = {
  chave: "grupo",
  rotulo: "Filtrar por tipo",
  rotuloTodos: "Tudo",
  valorDe: (e) => e.grupo,
  opcoes: [
    ["mapa-novo", "Mapas novos"],
    ["mapa-alterado", "Mapas renomeados"],
    ["quest-nova", "Quests novas"],
    ["quest-alterada", "Quests alteradas"],
  ],
};

/** Aba "Mapas e quests": mapas do mapInfo e quests do patch, com o texto antes e depois nas alteradas. */
@Component({
  selector: "app-aba-mapas-quests",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    DiffDescricaoComponent,
    IdentificacaoComponent,
    LinhaDaListaDirective,
    CorpoDaLinhaDirective,
    LinhaExpansivelComponent,
    LinhaSimplesComponent,
    ListaFiltradaComponent,
    TextoRoComponent,
  ],
  template: `
    <app-lista-filtrada
      [itens]="entradas()"
      [textoDe]="textoDe"
      [filtros]="filtros"
      rotuloBusca="Buscar por mapa, quest, ID ou texto"
      mensagemVazio="Este patch não trouxe mapas nem quests."
    >
      <ng-template appLinhaDaLista [tipo]="entradas()" let-e>
        @if (e.mapa; as m) {
          <app-linha-simples>
            <app-identificacao [codigo]="m.mapa" [nome]="m.nome || '(sem nome)'" [detalhe]="m.placa" />
            @if (m.antes; as antes) {
              <ui-badge tom="alerta">Mapa renomeado</ui-badge>
              <span class="antes">antes: {{ antes.nome }}{{ antes.placa ? " · " + antes.placa : "" }}</span>
            } @else {
              <ui-badge tom="sucesso">Mapa novo</ui-badge>
            }
          </app-linha-simples>
        }
        @if (e.quest; as q) {
          <app-linha-expansivel>
            <app-identificacao [codigo]="q.id" [nome]="q.titulo || '(sem título)'" [detalhe]="q.resumo" />
            <ui-badge [tom]="q.situacao === 'novo' ? 'sucesso' : 'alerta'">{{
              q.situacao === "novo" ? "Quest nova" : "Quest alterada"
            }}</ui-badge>
            <ng-template appCorpoDaLinha>
              @if (q.antes; as antes) {
                @if (antes.titulo !== q.titulo) {
                  <p class="troca">
                    <strong>Título</strong> <span class="sr-only">antes: </span
                    >{{ antes.titulo || "(vazio)" }} <span aria-hidden="true"> → </span
                    ><span class="sr-only">, agora: </span>{{ q.titulo || "(vazio)" }}
                  </p>
                }
                @if (antes.resumo !== q.resumo) {
                  <p class="troca">
                    <strong>Resumo</strong> <span class="sr-only">antes: </span
                    >{{ antes.resumo || "(vazio)" }} <span aria-hidden="true"> → </span
                    ><span class="sr-only">, agora: </span>{{ q.resumo || "(vazio)" }}
                  </p>
                }
                <app-diff-descricao [antes]="antes.descricao" [depois]="q.descricao" />
              } @else if (q.descricao.length > 0) {
                <app-texto-ro [linhas]="q.descricao" />
              } @else {
                <p class="sem">Sem texto.</p>
              }
            </ng-template>
          </app-linha-expansivel>
        }
      </ng-template>
    </app-lista-filtrada>
  `,
  styles: `
    :host {
      display: block;
    }
    .antes {
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
    .troca {
      margin: 0;
      max-width: 80ch;
      overflow-wrap: anywhere;
    }
    .troca strong {
      font-weight: 600;
      color: var(--texto-suave);
    }
    .troca strong::after {
      content: ":";
    }
    .sem {
      margin: 0;
      color: var(--texto-apagado);
    }
  `,
})
export class AbaMapasQuestsComponent {
  readonly mapas = input.required<readonly MapaPatch[]>();
  readonly quests = input.required<readonly QuestPatch[]>();

  protected readonly filtros = [POR_GRUPO];
  protected readonly entradas = computed<Entrada[]>(() => [
    ...this.mapas().map((m): Entrada => ({
      grupo: m.situacao === "novo" ? "mapa-novo" : "mapa-alterado",
      mapa: m,
      quest: null,
      busca: m.busca,
    })),
    ...this.quests().map((q): Entrada => ({
      grupo: q.situacao === "novo" ? "quest-nova" : "quest-alterada",
      mapa: null,
      quest: q,
      busca: q.busca,
    })),
  ]);
  protected readonly textoDe = (e: Entrada): string => e.busca;
}
