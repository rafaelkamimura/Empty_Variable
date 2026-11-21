import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { TabelaDirective } from "../../../shared/ui/tabela/tabela.directive";
import { VazioComponent } from "../../../shared/ui/vazio/vazio.component";
import {
  descreverLancamento,
  type Extrato,
  type LancamentoExtrato,
  ROTULO_TIPO_LANCAMENTO,
  somaDosLancamentos,
} from "../data/extrato.modelos";

/**
 * Histórico de lançamentos com a origem detalhada (US-06), e o saldo quando `mostrarSaldo`.
 * Usado na carteira e, por enquanto, na área do membro e nos saldos do admin.
 */
@Component({
  selector: "app-extrato",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, TabelaDirective, VazioComponent],
  template: `
    @if (extrato(); as x) {
      @if (mostrarSaldo()) {
        <p class="saldo">
          Saldo: <strong data-testid="saldo">{{ x.saldo }}</strong> pontos
        </p>
      }
      @if (x.lancamentos.length === 0) {
        <ui-vazio [mensagem]="mensagemVazio()" />
      } @else {
        <table uiTabela padrao data-testid="historico">
          <thead>
            <tr>
              <th scope="col">Data</th>
              <th scope="col">Tipo</th>
              <th scope="col">Detalhe</th>
              <th scope="col" class="numero">Pontos</th>
            </tr>
          </thead>
          <tbody>
            @for (l of x.lancamentos; track l.id) {
              <tr [class.estorno]="l.tipo === 'ESTORNO'">
                <td>
                  {{ l.criadoEm | date: "dd/MM/yyyy HH:mm" }}
                  @if (l.run; as r) {
                    <div class="contexto">{{ r.versaoInstancia.instancia.nome }} · {{ r.encontro.nome }}</div>
                  }
                </td>
                <td>{{ rotulos[l.tipo] }}</td>
                <td>{{ descrever(l) }}</td>
                <td class="numero valor" [class.negativo]="l.valor < 0" [class.positivo]="l.valor > 0">
                  {{ l.valor > 0 ? "+" : "" }}{{ l.valor }}
                </td>
              </tr>
            }
          </tbody>
        </table>
        @if (mostrarSaldo()) {
          <p class="soma">Soma dos lançamentos: {{ soma() }}</p>
        }
      }
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
    .saldo {
      margin: 0;
      font-size: var(--fs-xl);
      color: var(--texto);
    }
    .saldo strong {
      color: var(--texto-forte);
      font-variant-numeric: tabular-nums;
    }
    .contexto {
      margin-top: var(--esp-1);
      font-size: var(--fs-xs);
      color: var(--texto-suave);
    }
    .valor {
      font-weight: 600;
      white-space: nowrap;
    }
    .positivo {
      color: var(--sucesso);
    }
    .negativo {
      color: var(--erro);
    }
    .estorno {
      opacity: 0.7;
    }
    .soma {
      margin: 0;
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
  `,
})
export class ExtratoComponent {
  readonly extrato = input<Extrato | null>(null);
  /** Mostra o saldo acima e a soma abaixo (área do membro e admin). Na carteira, o saldo fica no topo. */
  readonly mostrarSaldo = input(true);
  /** Frase do estado vazio. */
  readonly mensagemVazio = input("Nenhum lançamento ainda.");

  protected readonly rotulos = ROTULO_TIPO_LANCAMENTO;
  protected readonly soma = computed(() => somaDosLancamentos(this.extrato()?.lancamentos ?? []));

  protected descrever(l: LancamentoExtrato): string {
    return descreverLancamento(l);
  }
}
