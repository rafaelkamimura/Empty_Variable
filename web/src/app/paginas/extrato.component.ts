import { DatePipe } from "@angular/common";
import { Component, computed, input } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { descreverLancamento, type Extrato, type LancamentoExtrato } from "../core/runs";
import { TabelaDirective } from "../shared/ui/tabela/tabela.directive";

const ROTULO_TIPO: Record<LancamentoExtrato["tipo"], string> = {
  PARTICIPACAO: "Participação",
  EMPRESTIMO_DEBITO: "Parcela de empréstimo",
  EMPRESTIMO_CREDITO: "Empréstimo concedido",
  ESTORNO: "Estorno",
  AJUSTE_ADMIN: "Ajuste",
  COMPRA: "Compra na loja",
  VENDA: "Venda na loja",
  NEBULA: "Nebula",
  TRANSFERENCIA_ENVIADA: "Transferência enviada",
  TRANSFERENCIA_RECEBIDA: "Transferência recebida",
};

/** US-06: saldo e histórico com a origem detalhada. Usado na área do membro e pelos admins. */
@Component({
  selector: "app-extrato",
  imports: [TabelaDirective, DatePipe, MatCardModule],
  template: `
    @if (extrato(); as x) {
      @if (mostrarSaldo()) {
        <mat-card>
          <mat-card-content>
            <p class="saldo">
              Saldo: <strong data-testid="saldo">{{ x.saldo }}</strong> pontos
            </p>
          </mat-card-content>
        </mat-card>
      }
      <mat-card>
        <mat-card-header><mat-card-title>Histórico</mat-card-title></mat-card-header>
        <mat-card-content>
          @if (x.lancamentos.length === 0) {
            <p class="texto-secundario">Nenhum lançamento ainda.</p>
          } @else {
            <table uiTabela class="tabela" data-testid="historico">
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Detalhe</th>
                  <th scope="col">Pontos</th>
                </tr>
              </thead>
              <tbody>
                @for (l of x.lancamentos; track l.id) {
                  <tr [class.estorno]="l.tipo === 'ESTORNO'">
                    <td>
                      {{ l.criadoEm | date: "dd/MM/yyyy HH:mm" }}
                      @if (l.run; as r) {
                        <br />
                        <span class="texto-secundario"
                          >{{ r.versaoInstancia.instancia.nome }} · {{ r.encontro.nome }}</span
                        >
                      }
                    </td>
                    <td>{{ tipo(l) }}</td>
                    <td>{{ descrever(l) }}</td>
                    <td class="valor" [class.negativo]="l.valor < 0">
                      {{ l.valor > 0 ? "+" : "" }}{{ l.valor }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            @if (mostrarSaldo()) {
              <p class="texto-secundario">Soma dos lançamentos: {{ soma() }}</p>
            }
          }
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .saldo {
      font-size: 20px;
      margin: 0;
    }
    .tabela {
      border-collapse: collapse;
      width: 100%;
    }
    .tabela th,
    .tabela td {
      text-align: left;
      padding: 6px 8px;
      vertical-align: top;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }
    .valor {
      text-align: right;
      white-space: nowrap;
    }
    .negativo {
      color: var(--mat-sys-error, #b3261e);
    }
    .estorno {
      opacity: 0.7;
    }
  `,
})
export class ExtratoComponent {
  readonly mostrarSaldo = input(true);
  readonly extrato = input<Extrato | null>(null);
  readonly soma = computed(() => (this.extrato()?.lancamentos ?? []).reduce((a, l) => a + l.valor, 0));

  tipo(l: LancamentoExtrato): string {
    return ROTULO_TIPO[l.tipo];
  }
  descrever(l: LancamentoExtrato): string {
    return descreverLancamento(l);
  }
}
