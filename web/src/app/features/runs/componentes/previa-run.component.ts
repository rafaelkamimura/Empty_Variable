import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { PontosPipe } from "../../../shared/pipes/pontos.pipe";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { TabelaDirective } from "../../../shared/ui/tabela/tabela.directive";
import type { Previa } from "../data/previa-run";

/**
 * Passo 5 do assistente: a prévia pelo mesmo motor da API (@betel/scoring). Os pontos mostrados
 * são os que serão gravados.
 */
@Component({
  selector: "app-previa-run",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PontosPipe, AvisoComponent, TabelaDirective],
  template: `
    <p class="linha-resumo">{{ resumo() }}</p>
    @let pv = previa();
    <table uiTabela padrao aria-label="Prévia dos pontos" data-testid="runs-previa">
      <thead>
        <tr>
          <th scope="col">Personagem</th>
          <th scope="col">Jogador</th>
          <th scope="col">Função</th>
          <th scope="col" class="numero">Rank</th>
          <th scope="col" class="numero">Pontos</th>
          <th scope="col">Parcelas</th>
          <th scope="col" class="numero">Fica com</th>
        </tr>
      </thead>
      <tbody>
        @for (l of pv.linhas; track $index) {
          <tr [class.erro]="l.erro">
            <td>{{ l.personagem }}</td>
            <td>{{ l.jogador }}</td>
            <td>{{ l.funcao }}</td>
            <td class="numero">{{ l.rank }}</td>
            <td class="numero">{{ l.pontos | pontos }}</td>
            <td>
              @for (pc of l.parcelas; track $index) {
                <div>{{ pc.credor }}: {{ pc.pontos | pontos }}</div>
              }
              @if (l.reducao) {
                <!-- D9a: os credores somados passam do teto. -->
                <div class="aviso">Reduzido ao teto dos credores</div>
              }
            </td>
            <td class="numero">{{ l.pontosTomador | pontos }}</td>
          </tr>
        }
      </tbody>
    </table>
    <p>
      <strong>Total gerado: {{ pv.total | pontos }}</strong>
    </p>
    <section aria-labelledby="titulo-ganho">
      <h2 id="titulo-ganho">Ganho por jogador</h2>
      <ul data-testid="runs-ganho-por-jogador">
        @for (g of pv.porJogador; track g.jogador) {
          <li>{{ g.jogador }}: {{ g.pontos | pontos }}</li>
        }
      </ul>
    </section>
    @for (e of pv.erros; track $index) {
      <ui-aviso tom="erro">{{ e }}</ui-aviso>
    }
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--esp-3);
    }
    p {
      margin: 0;
      color: var(--texto);
    }
    .linha-resumo {
      color: var(--texto-suave);
    }
    h2 {
      margin: 0 0 var(--esp-1);
      font-size: var(--fs-m);
      font-weight: 600;
      color: var(--texto-forte);
    }
    ul {
      margin: 0;
      padding-left: var(--esp-5);
      color: var(--texto);
    }
    .aviso {
      font-size: var(--fs-xs);
      color: var(--alerta);
    }
    tr.erro td {
      color: var(--erro);
    }
  `,
})
export class PreviaRunComponent {
  readonly previa = input.required<Previa>();
  /** "2026-11-20 · Torre · Betelgeuse · Concluída · parâmetros v3". */
  readonly resumo = input.required<string>();
}
