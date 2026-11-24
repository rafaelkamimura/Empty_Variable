import { DecimalPipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { BadgeComponent, type TomBadge } from "../../../shared/ui/badge/badge.component";
import { TabelaDirective } from "../../../shared/ui/tabela/tabela.directive";
import { compararLinhasCaixa, formatarChance, type MudancaLinhaCaixa, resumoDaCaixa } from "../data/caixas";
import type { CaixaPatch } from "../data/relatorio.modelos";
import { LinkItemComponent } from "./link-item.component";

const ROTULO_MUDANCA: Record<MudancaLinhaCaixa, string> = {
  igual: "",
  nova: "Entrou",
  removida: "Saiu",
  alterada: "Chance alterada",
};
const TOM_MUDANCA: Record<MudancaLinhaCaixa, TomBadge> = {
  igual: "neutro",
  nova: "sucesso",
  removida: "erro",
  alterada: "alerta",
};

/**
 * A tabela de conteúdo de uma caixa: chance, peso, item e grupo, do mais provável para o menos, com
 * o bônus garantido no fim. Nas caixas alteradas, cada linha diz se entrou, saiu ou mudou de chance.
 */
@Component({
  selector: "app-tabela-caixa",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, BadgeComponent, TabelaDirective, LinkItemComponent],
  template: `
    <table uiTabela padrao [attr.aria-label]="'Conteúdo de ' + (caixa().nome || 'caixa ' + caixa().id)">
      <thead>
        <tr>
          <th scope="col" class="numero">Chance</th>
          <th scope="col" class="numero">Peso</th>
          <th scope="col">Item</th>
          <th scope="col" class="numero">Grupo</th>
          @if (comparada()) {
            <th scope="col">Mudança</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (l of linhas(); track l.grupo + ":" + l.id + ":" + l.mudanca) {
          <tr [attr.data-mudanca]="l.mudanca">
            <td class="numero">{{ l.garantido ? "Sempre" : chance(l.pct) }}</td>
            <td class="numero">{{ l.peso | number: "1.0-0" }}</td>
            <td>
              <app-link-item [id]="l.id" [nome]="l.nome" /> {{ l.nome || "(sem nome)" }}
              @if (l.garantido) {
                <ui-badge tom="sucesso">Bônus garantido</ui-badge>
              }
            </td>
            <td class="numero">{{ l.grupo }}</td>
            @if (comparada()) {
              <td>
                @if (l.mudanca !== "igual") {
                  <ui-badge [tom]="tom[l.mudanca]">{{ rotulo[l.mudanca] }}</ui-badge>
                  @if (l.pctAntes !== null) {
                    &ngsp;<span class="antes">antes {{ chance(l.pctAntes) }}</span>
                  }
                } @else {
                  <span class="igual">Sem mudança</span>
                }
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
    <p class="nota">{{ nota() }}</p>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-2);
      min-width: 0;
    }
    .igual {
      color: var(--texto-apagado);
      font-size: var(--fs-s);
    }
    .antes {
      font-size: var(--fs-s);
      color: var(--texto-suave);
      white-space: nowrap;
    }
    .nota {
      margin: 0;
      max-width: 80ch;
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
  `,
})
export class TabelaCaixaComponent {
  readonly caixa = input.required<CaixaPatch>();

  protected readonly tom = TOM_MUDANCA;
  protected readonly rotulo = ROTULO_MUDANCA;
  protected readonly chance = formatarChance;
  protected readonly comparada = computed(() => this.caixa().linhasAntes !== null);
  protected readonly linhas = computed(() =>
    compararLinhasCaixa(this.caixa().linhasAntes, this.caixa().linhas),
  );
  protected readonly nota = computed(() => {
    const r = resumoDaCaixa(this.caixa().linhas);
    const pesos = r.somaDosPesos.toLocaleString("pt-BR");
    const sorteio = `${r.sorteaveis} ${r.sorteaveis === 1 ? "item sorteável" : "itens sorteáveis"}, soma dos pesos ${pesos}`;
    const fixos =
      r.garantidos > 0
        ? `; ${r.garantidos} ${r.garantidos === 1 ? "item garantido" : "itens garantidos"} (peso 0)`
        : "";
    return `${sorteio}${fixos}. Tabela publicada no cliente; a taxa real é do servidor.`;
  });
}
