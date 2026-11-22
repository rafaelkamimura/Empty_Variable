import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";
import { PontosPipe } from "../../../shared/pipes/pontos.pipe";
import { TabelaDirective } from "../../../shared/ui/tabela/tabela.directive";
import type { RunResumo } from "../data/detalhe-run.modelos";
import { ROTULO_STATUS } from "../data/runs.modelos";

/** Runs registradas (T-21): a data leva ao detalhe; a estornada aparece apagada. */
@Component({
  selector: "app-tabela-runs",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, PontosPipe, TabelaDirective],
  template: `
    <table uiTabela padrao aria-label="Runs">
      <thead>
        <tr>
          <th scope="col">Data</th>
          <th scope="col">Instância</th>
          <th scope="col">Status</th>
          <th scope="col" class="numero">Participantes</th>
          <th scope="col" class="numero">Pontos gerados</th>
          <th scope="col">Parâmetros</th>
        </tr>
      </thead>
      <tbody>
        @for (r of runs(); track r.id) {
          <tr [class.estornada]="r.status === 'ESTORNADA'">
            <td>
              <a [routerLink]="['/gestao/runs', r.id]">{{ r.data | date: "dd/MM/yyyy" : "UTC" }}</a>
            </td>
            <td>
              {{ r.versaoInstancia.instancia.nome }}
              <small>{{ r.encontro.nome }}</small>
            </td>
            <td>
              {{ rotulos[r.status] }}
              @if (r.corrigeRunId) {
                <small>correção</small>
              }
            </td>
            <td class="numero">{{ r.participantes }}</td>
            <td class="numero">{{ r.pontosTotais | pontos }}</td>
            <td>v{{ r.config.versao }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    :host {
      display: block;
    }
    small {
      display: block;
      font-size: var(--fs-xs);
      color: var(--texto-suave);
    }
    a {
      color: var(--acento);
      font-weight: 600;
    }
    .estornada td {
      color: var(--texto-apagado);
    }
  `,
})
export class TabelaRunsComponent {
  readonly runs = input.required<readonly RunResumo[]>();
  protected readonly rotulos = ROTULO_STATUS;
}
