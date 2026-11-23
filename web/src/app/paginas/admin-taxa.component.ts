import { DatePipe, DecimalPipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, computed, inject, type OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { firstValueFrom } from "rxjs";
import { Acao } from "../core/acao";
import { paraCentesimos } from "../shared/dominio/cadastros";
import type { VersaoConfigLoja } from "../core/estoque";
import { ComoFuncionaComponent } from "../shared/ui/como-funciona/como-funciona.component";
import { TabelaDirective } from "../shared/ui/tabela/tabela.directive";

/** % digitado → pontos-base, com até 2 casas e entre 0 e 100 (null = inválido). */
export function taxaParaBp(pct: number | null): number | null {
  if (pct === null) return null;
  const bp = paraCentesimos(pct);
  return bp === null || bp > 10_000 ? null : bp;
}

/** D22: taxa retida das vendas consignadas. Saiu de Parâmetros para a Administração (paineis §3). */
@Component({
  selector: "app-admin-taxa",
  imports: [
    TabelaDirective,
    ComoFuncionaComponent,
    FormsModule,
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="pagina">
      <div class="cabecalho">
        <div>
          <h1>Taxa da loja</h1>
          @if (vigente(); as v) {
            <p data-testid="taxa-vigente">
              Vigente: <strong>{{ v.taxaConsignacaoBp / 100 | number: "1.0-2" }}%</strong> (v{{ v.versao }},
              desde {{ v.vigenteDesde | date: "dd/MM/yyyy" }})
            </p>
          }
        </div>
      </div>

      <ui-como-funciona>
        <p>
          A taxa é retida das vendas consignadas (ofertas de jogadores) e sai de circulação. Cada mudança cria
          uma nova versão, que vale para as compras feitas depois dela; compras antigas guardam a taxa da
          época.
        </p>
      </ui-como-funciona>

      <form class="linha-acoes" (ngSubmit)="salvar()" data-testid="taxa-loja">
        <mat-form-field subscriptSizing="dynamic">
          <mat-label>Nova taxa</mat-label>
          <input
            matInput
            type="number"
            min="0"
            max="100"
            step="0.01"
            [(ngModel)]="novaTaxa"
            name="novaTaxa"
          />
          <span matTextSuffix>%</span>
        </mat-form-field>
        <button mat-flat-button type="submit" [disabled]="bp() === null">Criar nova versão</button>
      </form>

      @if (historico().length > 0) {
        <table uiTabela class="tabela">
          <thead>
            <tr>
              <th scope="col">Versão</th>
              <th scope="col">Taxa</th>
              <th scope="col">Desde</th>
            </tr>
          </thead>
          <tbody>
            @for (v of historico(); track v.id) {
              <tr>
                <td>v{{ v.versao }}</td>
                <td>{{ v.taxaConsignacaoBp / 100 | number: "1.0-2" }}%</td>
                <td>{{ v.vigenteDesde | date: "dd/MM/yyyy HH:mm" }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: `
    .tabela th,
    .tabela td {
      text-align: left;
      padding: 8px;
      border-bottom: 1px solid var(--borda);
    }
  `,
})
export class AdminTaxaComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly acao = inject(Acao);
  readonly historico = signal<VersaoConfigLoja[]>([]);
  readonly vigente = computed(() => this.historico()[0] ?? null);
  novaTaxa: number | null = null;

  bp(): number | null {
    return taxaParaBp(this.novaTaxa);
  }

  async ngOnInit(): Promise<void> {
    await this.recarregar();
  }

  async recarregar(): Promise<void> {
    try {
      this.historico.set(await firstValueFrom(this.http.get<VersaoConfigLoja[]>("/api/config-loja")));
    } catch {
      this.acao.avisar("Não foi possível carregar a taxa da loja.");
    }
  }

  async salvar(): Promise<void> {
    const bp = this.bp();
    if (bp === null) return;
    if (!window.confirm(`Criar a nova versão com taxa de ${bp / 100}%? Vale para as próximas compras.`))
      return;
    const ok = await this.acao.executar(
      () => firstValueFrom(this.http.post("/api/config-loja", { taxaConsignacaoBp: bp })),
      "Taxa da loja atualizada.",
    );
    if (ok) this.novaTaxa = null;
    await this.recarregar();
  }
}
