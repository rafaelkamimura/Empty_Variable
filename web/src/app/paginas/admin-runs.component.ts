import { DatePipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, inject, type OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTableModule } from "@angular/material/table";
import { RouterLink } from "@angular/router";
import type { StatusRun } from "@betel/scoring";
import { firstValueFrom } from "rxjs";
import { Acao } from "../core/acao";
import type { Instancia } from "../core/instancias";
import { ROTULO_STATUS, type ResumoRascunhoNag4eyes } from "../core/runs";
import { TabelaDirective } from "../shared/ui/tabela/tabela.directive";

interface RunResumo {
  id: string;
  data: string;
  encontro: { nome: string; codigo: string | null };
  versaoInstancia: { versao: number; instancia: { id: string; nome: string } };
  status: StatusRun | "ESTORNADA";
  corrigeRunId: string | null;
  config: { versao: number };
  participantes: number;
  pontosTotais: number;
}

const STATUS_FILTRO = ["CONCLUIDA", "FALHA_CHEFE", "ABORTADA", "ESTORNADA"] as const;

/** T-21: lista de runs com filtros por instância (D43), data e status. */
@Component({
  selector: "app-admin-runs",
  imports: [
    TabelaDirective,
    FormsModule,
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
  ],
  template: `
    <div class="pagina">
      <div class="cabecalho">
        <div>
          <h1>Runs</h1>
          <p>Cada run registrada gera os pontos de quem participou.</p>
        </div>
        <div class="cabecalho-acoes">
          <a class="botao-acao" routerLink="/gestao/runs/nova">Registrar run</a>
        </div>
      </div>
      @if (rascunhos().length > 0) {
        <section data-testid="rascunhos">
          <h2>Rascunhos do nag4eyes</h2>
          <p class="texto-secundario">
            Grupos encerrados no Discord. Revise para registrar a run com os participantes já preenchidos, ou
            descarte se o grupo não deve pontuar.
          </p>
          <table uiTabela mat-table [dataSource]="rascunhos()">
            <ng-container matColumnDef="data">
              <th mat-header-cell *matHeaderCellDef>Data</th>
              <td mat-cell *matCellDef="let r">{{ r.data | date: "dd/MM/yyyy" : "UTC" }}</td>
            </ng-container>
            <ng-container matColumnDef="instancia">
              <th mat-header-cell *matHeaderCellDef>Instância</th>
              <td mat-cell *matCellDef="let r">
                {{ r.instancia?.nome ?? r.instanciaOrigem?.nome ?? "—" }}
                @if (r.instancia === null && r.instanciaOrigem) {
                  <div class="texto-secundario">não encontrada aqui</div>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="participantes">
              <th mat-header-cell *matHeaderCellDef>Participantes</th>
              <td mat-cell *matCellDef="let r">
                {{ r.participantes }}
                @if (r.pendentes > 0) {
                  <div class="texto-secundario">{{ r.pendentes }} sem correspondência</div>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="acoes">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let r">
                <a mat-button routerLink="/gestao/runs/nova" [queryParams]="{ rascunho: r.id }">Revisar</a>
                <button mat-button type="button" (click)="descartar(r)">Descartar</button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="colunasRascunho"></tr>
            <tr mat-row *matRowDef="let row; columns: colunasRascunho"></tr>
          </table>
        </section>
      }
      @if (instancias().length > 1) {
        <div class="chips" role="group" aria-label="Filtrar por instância">
          <button
            type="button"
            class="chip"
            [attr.aria-pressed]="filtro.instanciaId === ''"
            (click)="filtrarInstancia('')"
          >
            Todas
          </button>
          @for (i of instancias(); track i.id) {
            <button
              type="button"
              class="chip"
              [attr.aria-pressed]="filtro.instanciaId === i.id"
              (click)="filtrarInstancia(i.id)"
            >
              {{ i.nome }}
            </button>
          }
        </div>
      }
      <form class="linha-acoes" (ngSubmit)="recarregar()">
        <mat-form-field>
          <mat-label>De</mat-label>
          <input matInput type="date" [(ngModel)]="filtro.dataDe" name="dataDe" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Até</mat-label>
          <input matInput type="date" [(ngModel)]="filtro.dataAte" name="dataAte" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>Status</mat-label>
          <mat-select [(ngModel)]="filtro.status" name="status">
            <mat-option [value]="''">Todos</mat-option>
            @for (s of statusFiltro; track s) {
              <mat-option [value]="s">{{ rotuloStatus[s] }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <button mat-stroked-button type="submit">Filtrar</button>
      </form>

      @if (runs().length === 0) {
        <p class="texto-secundario">Nenhuma run encontrada.</p>
      } @else {
        <table uiTabela mat-table [dataSource]="runs()" data-testid="runs">
          <ng-container matColumnDef="data">
            <th mat-header-cell *matHeaderCellDef>Data</th>
            <td mat-cell *matCellDef="let r">
              <a [routerLink]="['/gestao/runs', r.id]">{{ r.data | date: "dd/MM/yyyy" : "UTC" }}</a>
            </td>
          </ng-container>
          <ng-container matColumnDef="instancia">
            <th mat-header-cell *matHeaderCellDef>Instância</th>
            <td mat-cell *matCellDef="let r">
              {{ r.versaoInstancia.instancia.nome }}
              <div class="texto-secundario">{{ r.encontro.nome }}</div>
            </td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let r">
              {{ status(r) }}
              @if (r.corrigeRunId) {
                <span class="texto-secundario">(correção)</span>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="participantes">
            <th mat-header-cell *matHeaderCellDef>Participantes</th>
            <td mat-cell *matCellDef="let r">{{ r.participantes }}</td>
          </ng-container>
          <ng-container matColumnDef="pontos">
            <th mat-header-cell *matHeaderCellDef>Pontos gerados</th>
            <td mat-cell *matCellDef="let r">{{ r.pontosTotais }}</td>
          </ng-container>
          <ng-container matColumnDef="versao">
            <th mat-header-cell *matHeaderCellDef>Parâmetros</th>
            <td mat-cell *matCellDef="let r">v{{ r.config.versao }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="colunas"></tr>
          <tr
            mat-row
            *matRowDef="let row; columns: colunas"
            [class.estornada]="row.status === 'ESTORNADA'"
          ></tr>
        </table>
      }
    </div>
  `,
  styles: `
    .titulo {
      margin: 0;
      flex: 1;
    }
    .estornada {
      opacity: 0.55;
    }
  `,
})
export class AdminRunsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly acao = inject(Acao);

  readonly runs = signal<RunResumo[]>([]);
  readonly rascunhos = signal<ResumoRascunhoNag4eyes[]>([]);
  readonly colunasRascunho = ["data", "instancia", "participantes", "acoes"];
  readonly instancias = signal<Instancia[]>([]);
  readonly statusFiltro = STATUS_FILTRO;
  readonly rotuloStatus = ROTULO_STATUS;
  readonly colunas = ["data", "instancia", "status", "participantes", "pontos", "versao"];
  filtro = { dataDe: "", dataAte: "", instanciaId: "", status: "" };

  async ngOnInit(): Promise<void> {
    try {
      this.instancias.set(await firstValueFrom(this.http.get<Instancia[]>("/api/instancias")));
    } catch {
      // Sem a lista, o filtro por instância só não aparece.
    }
    await Promise.all([this.recarregar(), this.carregarRascunhos()]);
  }

  /** Rascunhos pendentes enviados pelo nag4eyes. Sem eles (ou sem a integração), a seção some. */
  async carregarRascunhos(): Promise<void> {
    try {
      this.rascunhos.set(
        await firstValueFrom(
          this.http.get<ResumoRascunhoNag4eyes[]>("/api/rascunhos-run", { params: { status: "PENDENTE" } }),
        ),
      );
    } catch {
      this.rascunhos.set([]);
    }
  }

  /** Descarta o rascunho: o grupo não vira run. */
  async descartar(r: ResumoRascunhoNag4eyes): Promise<void> {
    if (!window.confirm("Descartar este rascunho? O grupo não vai virar run.")) return;
    const ok = await this.acao.executar(
      () => firstValueFrom(this.http.post(`/api/rascunhos-run/${r.id}/descartar`, {})),
      "Rascunho descartado.",
    );
    if (ok) await this.carregarRascunhos();
  }

  async filtrarInstancia(id: string): Promise<void> {
    this.filtro.instanciaId = id;
    await this.recarregar();
  }
  status(r: RunResumo): string {
    return ROTULO_STATUS[r.status];
  }

  async recarregar(): Promise<void> {
    const params = Object.fromEntries(Object.entries(this.filtro).filter(([, v]) => v !== ""));
    try {
      this.runs.set(await firstValueFrom(this.http.get<RunResumo[]>("/api/runs", { params })));
    } catch {
      this.acao.avisar("Não foi possível carregar as runs.");
    }
  }
}
