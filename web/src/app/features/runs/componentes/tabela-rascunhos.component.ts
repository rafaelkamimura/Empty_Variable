import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { RouterLink } from "@angular/router";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { TabelaDirective } from "../../../shared/ui/tabela/tabela.directive";
import type { ResumoRascunhoNag4eyes } from "../data/nag4eyes.modelos";

/** Rascunhos do nag4eyes pendentes: revisar abre o assistente pré-preenchido; descartar pede confirmação. */
@Component({
  selector: "app-tabela-rascunhos",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, BotaoComponent, TabelaDirective],
  template: `
    <table uiTabela padrao aria-label="Rascunhos do nag4eyes">
      <thead>
        <tr>
          <th scope="col">Data</th>
          <th scope="col">Instância</th>
          <th scope="col" class="numero">Participantes</th>
          <th scope="col" aria-label="Ações"></th>
        </tr>
      </thead>
      <tbody>
        @for (r of rascunhos(); track r.id) {
          <tr>
            <td>{{ r.data | date: "dd/MM/yyyy" : "UTC" }}</td>
            <td>
              {{ r.instancia?.nome ?? r.instanciaOrigem?.nome ?? "—" }}
              @if (r.instancia === null && r.instanciaOrigem) {
                <small>não encontrada aqui</small>
              }
            </td>
            <td class="numero">
              {{ r.participantes }}
              @if (r.pendentes > 0) {
                <small>{{ r.pendentes }} sem correspondência</small>
              }
            </td>
            <td class="acoes">
              <a uiBotao tamanho="p" routerLink="/gestao/runs/nova" [queryParams]="{ rascunho: r.id }"
                >Revisar</a
              >
              <button uiBotao variante="fantasma" tamanho="p" (click)="descartar.emit(r)">Descartar</button>
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
    small {
      display: block;
      font-size: var(--fs-xs);
      color: var(--texto-suave);
    }
    .acoes {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-1);
    }
    @container conteudo (min-width: 761px) {
      .acoes {
        justify-content: flex-end;
      }
    }
  `,
})
export class TabelaRascunhosComponent {
  readonly rascunhos = input.required<readonly ResumoRascunhoNag4eyes[]>();
  readonly descartar = output<ResumoRascunhoNag4eyes>();
}
