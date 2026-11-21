import { HttpClient } from "@angular/common/http";
import { Component, inject, type OnInit, signal } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTableModule } from "@angular/material/table";
import { firstValueFrom } from "rxjs";
import { Acao } from "../core/acao";
import type { Extrato } from "../core/runs";
import { ExtratoComponent } from "./extrato.component";
import { TabelaDirective } from "../shared/ui/tabela/tabela.directive";

interface SaldoJogador {
  jogadorId: string;
  apelido: string;
  saldo: number;
}

/** Admins veem o saldo e o histórico de todos (D14). */
@Component({
  selector: "app-admin-saldos",
  imports: [TabelaDirective, MatTableModule, MatButtonModule, MatSnackBarModule, ExtratoComponent],
  template: `
    <div class="pagina">
      <div class="cabecalho">
        <div>
          <h1>Saldos</h1>
          <p>Pontos de cada jogador, do maior para o menor.</p>
        </div>
      </div>
      <table uiTabela mat-table [dataSource]="saldos()" data-testid="saldos">
        <ng-container matColumnDef="apelido">
          <th mat-header-cell *matHeaderCellDef>Jogador</th>
          <td mat-cell *matCellDef="let s">{{ s.apelido }}</td>
        </ng-container>
        <ng-container matColumnDef="saldo">
          <th mat-header-cell *matHeaderCellDef>Saldo</th>
          <td mat-cell *matCellDef="let s">{{ s.saldo }}</td>
        </ng-container>
        <ng-container matColumnDef="acoes">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let s">
            <button mat-button type="button" (click)="abrir(s)">Histórico</button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="colunas"></tr>
        <tr mat-row *matRowDef="let row; columns: colunas"></tr>
      </table>
      @if (extrato(); as x) {
        <h2>{{ x.jogador.apelido }}</h2>
        <app-extrato [extrato]="x" />
      }
    </div>
  `,
})
export class AdminSaldosComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly acao = inject(Acao);

  readonly saldos = signal<SaldoJogador[]>([]);
  readonly extrato = signal<Extrato | null>(null);
  readonly colunas = ["apelido", "saldo", "acoes"];

  async ngOnInit(): Promise<void> {
    try {
      this.saldos.set(await firstValueFrom(this.http.get<SaldoJogador[]>("/api/saldos")));
    } catch {
      this.acao.avisar("Não foi possível carregar os saldos.");
    }
  }

  async abrir(s: SaldoJogador): Promise<void> {
    try {
      this.extrato.set(await firstValueFrom(this.http.get<Extrato>(`/api/extrato/${s.jogadorId}`)));
    } catch {
      this.acao.avisar("Não foi possível carregar o histórico.");
    }
  }
}
