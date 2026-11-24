import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import type { FiltroLista } from "../data/filtro";
import type { CaixaPatch } from "../data/relatorio.modelos";
import { IdentificacaoComponent } from "./identificacao.component";
import { CorpoDaLinhaDirective, LinhaExpansivelComponent } from "./linha-expansivel.component";
import { LinkItemComponent } from "./link-item.component";
import { LinhaDaListaDirective, ListaFiltradaComponent } from "./lista-filtrada.component";
import { TabelaCaixaComponent } from "./tabela-caixa.component";
import { TextoRoComponent } from "./texto-ro.component";

const POR_SITUACAO: FiltroLista<CaixaPatch> = {
  chave: "situacao",
  rotulo: "Filtrar por situação",
  rotuloTodos: "Todas",
  valorDe: (c) => c.situacao,
  opcoes: [
    ["novo", "Novas"],
    ["alterado", "Alteradas"],
  ],
};

/** Aba "Caixas e ovos": as tabelas de probabilidade que o cliente publica para caixas, ovos e pacotes. */
@Component({
  selector: "app-aba-caixas",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    IdentificacaoComponent,
    LinhaDaListaDirective,
    CorpoDaLinhaDirective,
    LinhaExpansivelComponent,
    LinkItemComponent,
    ListaFiltradaComponent,
    TabelaCaixaComponent,
    TextoRoComponent,
  ],
  template: `
    <p class="intro">
      Tabelas de probabilidade de caixas, ovos e pacotes: o que o link "Concede 1 item aleatório" mostra no
      cliente.
    </p>
    <app-lista-filtrada
      [itens]="caixas()"
      [textoDe]="textoDe"
      [filtros]="filtros"
      rotuloBusca="Buscar por caixa ou por item do conteúdo"
      mensagemVazio="Este patch não trouxe nem alterou tabelas de caixas."
    >
      <ng-template appLinhaDaLista [tipo]="caixas()" let-caixa>
        <app-linha-expansivel>
          <app-link-item slot="codigo" [id]="caixa.id" [nome]="caixa.nome" />
          <app-identificacao [nome]="caixa.nome || '(sem nome no iteminfo)'" />
          <ui-badge [tom]="caixa.situacao === 'novo' ? 'sucesso' : 'alerta'">{{
            caixa.situacao === "novo" ? "Nova" : "Alterada"
          }}</ui-badge>
          <span class="meta"
            >{{ caixa.linhas.length }} {{ caixa.linhas.length === 1 ? "entrada" : "entradas" }}</span
          >
          <ng-template appCorpoDaLinha>
            @if (caixa.descricao.length > 0) {
              <app-texto-ro [linhas]="caixa.descricao" />
            }
            <app-tabela-caixa [caixa]="caixa" />
          </ng-template>
        </app-linha-expansivel>
      </ng-template>
    </app-lista-filtrada>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
    .intro {
      margin: 0;
      max-width: 80ch;
      color: var(--texto-suave);
    }
    .meta {
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
  `,
})
export class AbaCaixasComponent {
  readonly caixas = input.required<readonly CaixaPatch[]>();

  protected readonly filtros = [POR_SITUACAO];
  protected readonly textoDe = (c: CaixaPatch): string => c.busca;
}
