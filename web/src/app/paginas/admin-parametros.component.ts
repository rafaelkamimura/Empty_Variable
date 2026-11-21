import { DatePipe, DecimalPipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, computed, inject, type OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatTabsModule } from "@angular/material/tabs";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { calcularParticipacao } from "@betel/scoring";
import { firstValueFrom } from "rxjs";
import { Acao } from "../core/acao";
import {
  apiParaFormulario,
  formularioParaApi,
  type ParametrosFormulario,
  paraConfigMotor,
  type VersaoParametros,
} from "../core/cadastros";
import { ComoFuncionaComponent } from "../shared/ui/como-funciona/como-funciona.component";
import { PainelLateralComponent } from "../shared/ui/painel-lateral/painel-lateral.component";
import { TabelaDirective } from "../shared/ui/tabela/tabela.directive";

interface Campo {
  chave: keyof ParametrosFormulario;
  rotulo: string;
  sufixo?: string;
}

const GRUPOS: { titulo: string; campos: Campo[] }[] = [
  {
    titulo: "Base e peso",
    campos: [
      { chave: "base", rotulo: "B (pontos base)" },
      { chave: "alpha", rotulo: "α (inclinação do peso)" },
    ],
  },
  {
    titulo: "Multiplicador do status",
    campos: [
      { chave: "sConcluida", rotulo: "Concluída" },
      { chave: "sFalha", rotulo: "Falha no chefe" },
      { chave: "sAbortada", rotulo: "Abortada" },
    ],
  },
  {
    titulo: "Empréstimos",
    campos: [
      { chave: "pctEssencial", rotulo: "Essencial", sufixo: "%" },
      { chave: "pctImportante", rotulo: "Importante", sufixo: "%" },
      { chave: "pctComplementar", rotulo: "Complementar", sufixo: "%" },
      { chave: "tetoCredores", rotulo: "Teto dos credores", sufixo: "%" },
    ],
  },
];

/**
 * US-02: versão vigente, histórico e criação de nova versão (nunca edita uma versão existente).
 * paineis §5: abas Vigente e Histórico; a nova versão abre no painel lateral, com a prévia.
 */
@Component({
  selector: "app-admin-parametros",
  imports: [
    TabelaDirective,
    FormsModule,
    DatePipe,
    DecimalPipe,
    MatTabsModule,
    ComoFuncionaComponent,
    PainelLateralComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="pagina">
      <div class="cabecalho">
        <div>
          <h1>Parâmetros de pontuação</h1>
          @if (vigente(); as v) {
            <p>
              Vigente: <strong data-testid="versao-vigente">v{{ v.versao }}</strong
              >, desde
              {{ v.vigenteDesde | date: "dd/MM/yyyy HH:mm" }}
            </p>
          }
        </div>
        <div class="cabecalho-acoes">
          <button type="button" class="botao-acao" (click)="abrirNova()">Nova versão</button>
        </div>
      </div>

      <ui-como-funciona>
        <p>
          Os pontos de cada participação são B × peso do rank × encontro × status × fração. O multiplicador do
          encontro (chefe ou modo) e os ranks das funções ficam em cada instância. Os parâmetros daqui valem
          para todas e são versionados: uma nova versão vale só para as runs registradas depois dela.
        </p>
      </ui-como-funciona>

      <mat-tab-group animationDuration="0ms">
        <mat-tab label="Vigente">
          @if (vigente()) {
            <div class="grade-valores" data-testid="valores-vigentes">
              @for (g of grupos; track g.titulo) {
                <section class="cartao-b grupo">
                  <h3>{{ g.titulo }}</h3>
                  <dl>
                    @for (c of g.campos; track c.chave) {
                      <dt>{{ c.rotulo }}</dt>
                      <dd>{{ valorVigente(c.chave) }}{{ c.sufixo ?? "" }}</dd>
                    }
                  </dl>
                </section>
              }
            </div>
          }
        </mat-tab>
        <mat-tab label="Histórico">
          <table uiTabela class="historico" data-testid="historico">
            <thead>
              <tr>
                <th scope="col">Versão</th>
                <th scope="col">Desde</th>
                <th scope="col">B</th>
                <th scope="col">α</th>
                <th scope="col">Status (C / F / A)</th>
                <th scope="col">Empréstimos (E / I / C · teto)</th>
              </tr>
            </thead>
            <tbody>
              @for (v of historico(); track v.id) {
                <tr>
                  <td>v{{ v.versao }}</td>
                  <td>{{ v.vigenteDesde | date: "dd/MM/yyyy HH:mm" }}</td>
                  <td>{{ v.base }}</td>
                  <td>{{ v.alphaCentesimos / 100 | number: "1.0-2" }}</td>
                  <td>
                    {{ v.sConcluidaCentesimos / 100 | number: "1.0-2" }} /
                    {{ v.sFalhaCentesimos / 100 | number: "1.0-2" }} /
                    {{ v.sAbortadaCentesimos / 100 | number: "1.0-2" }}
                  </td>
                  <td>
                    {{ v.pctEssencialBp / 100 | number: "1.0-2" }}% /
                    {{ v.pctImportanteBp / 100 | number: "1.0-2" }}% /
                    {{ v.pctComplementarBp / 100 | number: "1.0-2" }}% ·
                    {{ v.tetoCredoresBp / 100 | number: "1.0-2" }}%
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </mat-tab>
      </mat-tab-group>

      <ui-painel-lateral
        [titulo]="'Nova versão v' + proxima()"
        [aberto]="editando()"
        (fechar)="editando.set(false)"
      >
        <form (ngSubmit)="salvar()" class="form-versao">
          @for (g of grupos; track g.titulo) {
            <h3>{{ g.titulo }}</h3>
            <div class="campos">
              @for (c of g.campos; track c.chave) {
                <mat-form-field subscriptSizing="dynamic">
                  <mat-label>{{ c.rotulo }}</mat-label>
                  <input
                    matInput
                    type="number"
                    min="0"
                    step="0.01"
                    [ngModel]="form()?.[c.chave]"
                    (ngModelChange)="alterar(c.chave, $event)"
                    [name]="c.chave"
                  />
                  @if (c.sufixo) {
                    <span matTextSuffix>{{ c.sufixo }}</span>
                  }
                </mat-form-field>
              }
            </div>
          }

          <h3>Prévia (encontro ×1, concluída, participação completa)</h3>
          @if (previa(); as linhas) {
            <table uiTabela class="previa">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Vigente</th>
                  <th scope="col">Nova versão</th>
                </tr>
              </thead>
              <tbody>
                @for (l of linhas; track l.rank) {
                  <tr>
                    <td>{{ l.rank }}</td>
                    <td>{{ l.atual }}</td>
                    <td [class.mudou]="l.nova !== l.atual">{{ l.nova }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }

          @for (e of conversao().erros; track e) {
            <p class="erro" role="alert">{{ e }}</p>
          }
          <div class="linha-acoes">
            <button mat-flat-button type="submit" [disabled]="!podeSalvar()">
              Criar versão v{{ proxima() }}
            </button>
            <button mat-button type="button" (click)="restaurar()">Desfazer alterações</button>
          </div>
        </form>
      </ui-painel-lateral>
    </div>
  `,
  styles: `
    .grade-valores {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
      gap: 14px;
      padding-top: 14px;
    }
    .grupo h3 {
      margin: 2px 0 6px;
      font-size: 15px;
    }
    .grupo dl {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 4px 12px;
      margin: 0;
      font-size: 14px;
    }
    .grupo dt {
      color: var(--texto-suave);
    }
    .grupo dd {
      margin: 0;
      font-weight: 700;
      text-align: right;
    }
    .historico {
      margin-top: 14px;
    }
    .previa th,
    .previa td,
    .historico th,
    .historico td {
      padding: 6px 10px;
      text-align: left;
      border-bottom: 1px solid var(--borda);
    }
    .form-versao h3 {
      margin: 8px 0 4px;
      font-size: 14px;
      color: var(--texto-suave);
    }
    .campos {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 8px;
    }
    .mudou {
      font-weight: 700;
      color: var(--acento-forte);
    }
    .erro {
      color: var(--mat-sys-error, #b3261e);
      margin: 4px 0;
    }
  `,
})
export class AdminParametrosComponent implements OnInit {
  /** Painel lateral com o formulário da nova versão. */
  readonly editando = signal(false);
  private readonly http = inject(HttpClient);
  private readonly acao = inject(Acao);

  readonly grupos = GRUPOS;
  readonly historico = signal<VersaoParametros[]>([]);
  readonly vigente = computed(() => this.historico()[0] ?? null);
  readonly proxima = computed(() => (this.vigente()?.versao ?? 0) + 1);
  readonly form = signal<ParametrosFormulario | null>(null);
  readonly conversao = computed(() => {
    const f = this.form();
    return f === null ? { erros: [], api: null } : formularioParaApi(f);
  });
  readonly previa = computed(() => {
    const v = this.vigente();
    const nova = this.conversao().api;
    if (v === null) return null;
    return [5, 4, 3, 2, 1].map((rank) => {
      const e = {
        rank,
        multiplicadorEncontroCentesimos: 100,
        status: "CONCLUIDA",
        fracaoCentesimos: 100,
      } as const;
      return {
        rank,
        atual: calcularParticipacao(e, paraConfigMotor(v)).pontos,
        nova: nova === null ? "—" : calcularParticipacao(e, paraConfigMotor(nova)).pontos,
      };
    });
  });
  readonly podeSalvar = computed(() => {
    const api = this.conversao().api;
    const v = this.vigente();
    if (api === null || v === null) return false;
    // Uma versão idêntica à vigente não muda nada: evita criar versões vazias.
    return Object.entries(api).some(([k, valor]) => v[k as keyof VersaoParametros] !== valor);
  });

  async ngOnInit(): Promise<void> {
    await this.recarregar();
  }

  async recarregar(): Promise<void> {
    try {
      this.historico.set(await firstValueFrom(this.http.get<VersaoParametros[]>("/api/config-pontuacao")));
      this.restaurar();
    } catch {
      this.acao.avisar("Não foi possível carregar os parâmetros.");
    }
  }

  abrirNova(): void {
    this.restaurar();
    this.editando.set(true);
  }

  /** Valor vigente no formato do formulário (%, decimais), para a aba Vigente. */
  valorVigente(chave: keyof ParametrosFormulario): string {
    const v = this.vigente();
    if (v === null) return "—";
    return apiParaFormulario(v)[chave].toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  }

  restaurar(): void {
    const v = this.vigente();
    if (v !== null) this.form.set(apiParaFormulario(v));
  }

  alterar(chave: keyof ParametrosFormulario, valor: number | null): void {
    this.form.update((f) => (f === null ? f : { ...f, [chave]: valor ?? Number.NaN }));
  }

  async salvar(): Promise<void> {
    const api = this.conversao().api;
    if (api === null) return;
    const v = this.proxima();
    if (!window.confirm(`Criar a versão v${v}? Ela passa a valer para as próximas runs.`)) return;
    const ok = await this.acao.executar(
      () => firstValueFrom(this.http.post("/api/config-pontuacao", api)),
      `Versão v${v} criada.`,
    );
    if (ok) this.editando.set(false);
    await this.recarregar();
  }
}
