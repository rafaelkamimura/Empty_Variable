import { DatePipe, DecimalPipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { mensagemDeErro } from "../../../core/modelos";
import { type Carregavel, carregando, comErro, pronto } from "../../../shared/utils/carregavel";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import { ComoFuncionaComponent } from "../../../shared/ui/como-funciona/como-funciona.component";
import { EstadoComponent, EstadoProntoDirective } from "../../../shared/ui/estado/estado.component";
import { PaginaComponent } from "../../../shared/ui/pagina/pagina.component";
import { TabelaDirective } from "../../../shared/ui/tabela/tabela.directive";
import { DatamineApi } from "../data/datamine.api";
import {
  indicadoresDaLista,
  type Indicador,
  type PatchResumido,
  temContagens,
} from "../data/datamine.modelos";

interface LinhaPatch {
  patch: PatchResumido;
  indicadores: Indicador[];
  /** O patch foi publicado sem contagens (diferente de ter todas em zero). */
  semResumo: boolean;
}

/** Lista dos patches do cliente minerados (D63): o que cada atualização do RO LATAM trouxe. */
@Component({
  selector: "app-patches-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    BadgeComponent,
    ComoFuncionaComponent,
    EstadoComponent,
    EstadoProntoDirective,
    PaginaComponent,
    TabelaDirective,
  ],
  template: `
    <ui-pagina
      titulo="Patches do cliente"
      subtitulo="O que cada atualização do RO LATAM trouxe: itens, monstros, mapas, quests e caixas."
    >
      <ui-como-funciona>
        <p>
          A cada patch, os arquivos do cliente são comparados com os do patch anterior e o resultado é
          publicado aqui. O relatório completo de cada patch tem os itens com a descrição, as probabilidades
          das caixas, os monstros, as skills, os mapas, as quests e os arquivos do GRF.
        </p>
        <p>As tabelas são as que o cliente mostra; o servidor pode se comportar de outro jeito.</p>
      </ui-como-funciona>
      <ui-estado
        [valor]="estado()"
        mensagemVazio="Nenhum patch publicado ainda. O próximo aparece aqui assim que for minerado."
        (tentarNovamente)="carregar()"
      >
        <ng-template uiEstadoPronto [tipo]="estado()" let-linhas>
          <table uiTabela padrao aria-label="Patches do cliente publicados" data-testid="datamine-lista">
            <thead>
              <tr>
                <th scope="col">Patch</th>
                <th scope="col">Data</th>
                <th scope="col">O que mudou</th>
                <th scope="col" class="numero">Arquivos</th>
              </tr>
            </thead>
            <tbody>
              @for (l of linhas; track l.patch.id) {
                <tr>
                  <td>
                    <a class="titulo" [routerLink]="['/datamine', l.patch.id]" data-testid="datamine-abrir">
                      {{ l.patch.titulo }}
                    </a>
                    <span class="chave">{{ l.patch.chave }}</span>
                  </td>
                  <td>
                    <time [attr.datetime]="l.patch.dataPatch">{{
                      l.patch.dataPatch | date: "dd/MM/yyyy"
                    }}</time>
                  </td>
                  <td>
                    <span class="indicadores">
                      @for (i of l.indicadores; track i.chave) {
                        <ui-badge tom="neutro">{{ i.valor | number: "1.0-0" }} {{ i.rotulo }}</ui-badge>
                      } @empty {
                        <span class="chave">{{
                          l.semResumo ? "Sem resumo" : "Nenhuma mudança contada"
                        }}</span>
                      }
                    </span>
                  </td>
                  <td class="numero">{{ l.patch.patches.length }}</td>
                </tr>
              }
            </tbody>
          </table>
        </ng-template>
      </ui-estado>
    </ui-pagina>
  `,
  styles: `
    .titulo {
      display: block;
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .chave {
      display: block;
      margin-top: var(--esp-1);
      color: var(--texto-apagado);
      font-family: var(--fonte-mono);
      font-size: var(--fs-xs);
      overflow-wrap: anywhere;
    }
    .indicadores {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-1);
    }
  `,
})
export class PatchesPage {
  private readonly api = inject(DatamineApi);

  protected readonly estado = signal<Carregavel<LinhaPatch[]>>(carregando());

  constructor() {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    if (this.estado().estado !== "pronto") this.estado.set(carregando());
    try {
      const patches = await this.api.patches();
      this.estado.set(
        pronto(
          patches.map((patch) => ({
            patch,
            indicadores: indicadoresDaLista(patch.resumo),
            semResumo: !temContagens(patch.resumo),
          })),
        ),
      );
    } catch (erro) {
      this.estado.set(comErro(mensagemDeErro(erro)));
    }
  }
}
