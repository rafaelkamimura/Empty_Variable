import { DecimalPipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BadgeComponent, type TomBadge } from "../../../shared/ui/badge/badge.component";
import type { FiltroLista } from "../data/filtro";
import type { SituacaoTabela, TabelaLua } from "../data/relatorio.modelos";
import { IdentificacaoComponent } from "./identificacao.component";
import { CorpoDaLinhaDirective, LinhaExpansivelComponent } from "./linha-expansivel.component";
import { LinhaDaListaDirective, ListaFiltradaComponent } from "./lista-filtrada.component";
import { MudancasLuaComponent } from "./mudancas-lua.component";

const ROTULO_SITUACAO: Record<SituacaoTabela, string> = { novo: "Novo", alterado: "Alterado", erro: "Erro" };
const TOM_SITUACAO: Record<SituacaoTabela, TomBadge> = { novo: "sucesso", alterado: "alerta", erro: "erro" };

const POR_SITUACAO: FiltroLista<TabelaLua> = {
  chave: "situacao",
  rotulo: "Filtrar por situação",
  rotuloTodos: "Todos",
  valorDe: (t) => t.situacao,
  opcoes: [
    ["alterado", "Alterados"],
    ["novo", "Novos"],
    ["erro", "Com erro"],
  ],
};

/** Aba "Tabelas Lua": o que mudou dentro de cada arquivo .lub, por caminho (tabela/chave). */
@Component({
  selector: "app-aba-lua",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    AvisoComponent,
    BadgeComponent,
    IdentificacaoComponent,
    LinhaDaListaDirective,
    CorpoDaLinhaDirective,
    LinhaExpansivelComponent,
    ListaFiltradaComponent,
    MudancasLuaComponent,
  ],
  template: `
    <p class="intro">
      Comparação do conteúdo de cada tabela Lua alterada (fora as de itens, quests e mapas, que têm abas
      próprias). O caminho é a tabela e a chave dentro dela.
    </p>
    <app-lista-filtrada
      [itens]="tabelas()"
      [textoDe]="textoDe"
      [filtros]="filtros"
      rotuloBusca="Buscar por arquivo ou tabela"
      mensagemVazio="Este patch não alterou tabelas Lua."
    >
      <ng-template appLinhaDaLista [tipo]="tabelas()" let-t>
        <app-linha-expansivel>
          <ui-badge [tom]="tom[t.situacao]">{{ rotuloSituacao[t.situacao] }}</ui-badge>
          <app-identificacao caminho [nome]="t.arquivo" [detalhe]="t.globais.join(', ')" />
          <span class="meta"
            >{{ t.quantidade | number: "1.0-0" }} {{ t.quantidade === 1 ? "mudança" : "mudanças" }}</span
          >
          <ng-template appCorpoDaLinha>
            @if (t.erro) {
              <ui-aviso tom="erro" titulo="O arquivo não pôde ser lido.">{{ t.erro }}</ui-aviso>
            } @else if (t.mudancas.length === 0) {
              <p class="sem">Sem diferenças de valor.</p>
            } @else {
              @if (t.truncado) {
                <ui-aviso tom="info">
                  O relatório traz as primeiras {{ t.mudancas.length | number: "1.0-0" }} de
                  {{ t.quantidade | number: "1.0-0" }} mudanças deste arquivo.
                </ui-aviso>
              }
              <app-mudancas-lua [mudancas]="t.mudancas" />
            }
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
      font-variant-numeric: tabular-nums;
    }
    .sem {
      margin: 0;
      color: var(--texto-apagado);
    }
  `,
})
export class AbaLuaComponent {
  readonly tabelas = input.required<readonly TabelaLua[]>();

  protected readonly filtros = [POR_SITUACAO];
  protected readonly tom = TOM_SITUACAO;
  protected readonly rotuloSituacao = ROTULO_SITUACAO;
  protected readonly textoDe = (t: TabelaLua): string => t.busca;
}
