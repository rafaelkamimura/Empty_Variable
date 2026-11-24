import { DecimalPipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { BadgeComponent, type TomBadge } from "../../../shared/ui/badge/badge.component";
import { TabelaDirective } from "../../../shared/ui/tabela/tabela.directive";
import type { FiltroLista } from "../data/filtro";
import {
  type ArquivoGrf,
  formatarBytes,
  type ResumoGrf,
  rotuloDoTipoGrf,
  type SituacaoArquivo,
} from "../data/relatorio.modelos";
import { IdentificacaoComponent } from "./identificacao.component";
import { LinhaSimplesComponent } from "./linha-simples.component";
import { LinhaDaListaDirective, ListaFiltradaComponent } from "./lista-filtrada.component";

const ROTULO_SITUACAO: Record<SituacaoArquivo, string> = {
  novo: "Novo",
  alterado: "Alterado",
  removido: "Removido",
};
const TOM_SITUACAO: Record<SituacaoArquivo, TomBadge> = {
  novo: "sucesso",
  alterado: "alerta",
  removido: "erro",
};

const POR_SITUACAO: FiltroLista<ArquivoGrf> = {
  chave: "situacao",
  rotulo: "Filtrar por situação",
  rotuloTodos: "Todos",
  valorDe: (a) => a.situacao,
  opcoes: [
    ["novo", "Novos"],
    ["alterado", "Alterados"],
    ["removido", "Removidos"],
  ],
};

/** Arquivo sem tipo no relatório: precisa de uma chave própria, porque o valor vazio é o chip "todos". */
const SEM_TIPO = "sem-tipo";
const chaveDoTipo = (a: ArquivoGrf): string => a.tipo || SEM_TIPO;

/** Aba "Arquivos do GRF": o resumo por tipo de arquivo e a lista dos arquivos que entraram, mudaram ou saíram. */
@Component({
  selector: "app-aba-grf",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    BadgeComponent,
    IdentificacaoComponent,
    LinhaDaListaDirective,
    LinhaSimplesComponent,
    ListaFiltradaComponent,
    TabelaDirective,
  ],
  template: `
    @if (resumo().length > 0) {
      <section aria-labelledby="titulo-grf-por-tipo">
        <h2 id="titulo-grf-por-tipo">Por tipo de arquivo</h2>
        <table uiTabela padrao aria-labelledby="titulo-grf-por-tipo" data-testid="datamine-grf-resumo">
          <thead>
            <tr>
              <th scope="col">Tipo</th>
              <th scope="col" class="numero">Novos</th>
              <th scope="col" class="numero">Alterados</th>
              <th scope="col" class="numero">Removidos</th>
            </tr>
          </thead>
          <tbody>
            @for (r of resumo(); track r.tipo) {
              <tr>
                <td>{{ rotuloDoTipo(r.tipo) }}</td>
                <td class="numero">{{ r.novos | number: "1.0-0" }}</td>
                <td class="numero">{{ r.alterados | number: "1.0-0" }}</td>
                <td class="numero">{{ r.removidos | number: "1.0-0" }}</td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    }
    <section aria-labelledby="titulo-grf-arquivos">
      <h2 id="titulo-grf-arquivos">Arquivos</h2>
      <app-lista-filtrada
        [itens]="arquivos()"
        [textoDe]="textoDe"
        [filtros]="filtros()"
        rotuloBusca="Buscar por caminho ou tipo de arquivo"
        mensagemVazio="Este patch não mexeu em arquivos do GRF."
      >
        <ng-template appLinhaDaLista [tipo]="arquivos()" let-a>
          <app-linha-simples>
            <ui-badge [tom]="tom[a.situacao]">{{ rotuloSituacao[a.situacao] }}</ui-badge>
            <app-identificacao caminho [nome]="a.caminho" />
            <span class="meta">{{ tamanhoDe(a) }} · {{ rotuloDoTipo(a.tipo) }}</span>
          </app-linha-simples>
        </ng-template>
      </app-lista-filtrada>
    </section>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-5);
      min-width: 0;
    }
    section {
      min-width: 0;
    }
    h2 {
      margin: 0 0 var(--esp-3);
      font-size: var(--fs-l);
      font-weight: 700;
      color: var(--texto-forte);
    }
    .meta {
      font-size: var(--fs-s);
      color: var(--texto-suave);
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class AbaGrfComponent {
  readonly arquivos = input.required<readonly ArquivoGrf[]>();
  readonly resumo = input<readonly ResumoGrf[]>([]);

  protected readonly tom = TOM_SITUACAO;
  protected readonly rotuloSituacao = ROTULO_SITUACAO;
  protected readonly rotuloDoTipo = rotuloDoTipoGrf;
  protected readonly textoDe = (a: ArquivoGrf): string => a.busca;

  /** Os tipos viram chips do mais frequente para o menos, como no relatório. */
  protected readonly filtros = computed<FiltroLista<ArquivoGrf>[]>(() => {
    const contagens = new Map<string, number>();
    for (const a of this.arquivos()) contagens.set(chaveDoTipo(a), (contagens.get(chaveDoTipo(a)) ?? 0) + 1);
    const tipos = [...contagens.entries()].sort((a, b) => b[1] - a[1]).map(([tipo]) => tipo);
    return [
      POR_SITUACAO,
      {
        chave: "tipo",
        rotulo: "Filtrar por tipo de arquivo",
        rotuloTodos: "Todos os tipos",
        valorDe: chaveDoTipo,
        opcoes: tipos.map((tipo): readonly [string, string] => [
          tipo,
          rotuloDoTipoGrf(tipo === SEM_TIPO ? "" : tipo),
        ]),
      },
    ];
  });

  protected tamanhoDe(a: ArquivoGrf): string {
    return a.tamanhoAntes === null
      ? formatarBytes(a.tamanho)
      : `${formatarBytes(a.tamanhoAntes)} → ${formatarBytes(a.tamanho)}`;
  }
}
