import { DatePipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, computed, effect, inject, input, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTabsModule } from "@angular/material/tabs";
import { RouterLink } from "@angular/router";
import { CONFIG_V1, pesoDoRank } from "@betel/scoring";
import { firstValueFrom } from "rxjs";
import { Acao } from "../core/acao";
import type { Classe } from "../shared/dominio/cadastros";
import {
  corpoVersao,
  type EncontroEditavel,
  type FuncaoEditavel,
  type Instancia,
  pendenciasVersao,
  ROTULO_DIFICULDADE,
  ROTULO_MODO,
  ROTULO_RETORNO,
  situacaoInstancia,
  textoMultiplicador,
  type VersaoHistorico,
} from "../shared/dominio/instancias";
import { ComoFuncionaComponent } from "../shared/ui/como-funciona/como-funciona.component";
import { PainelLateralComponent } from "../shared/ui/painel-lateral/painel-lateral.component";
import { mensagemDeErro } from "../core/modelos";
import { TabelaDirective } from "../shared/ui/tabela/tabela.directive";

/** Pontos de uma participação completa e concluída com B e α da v1 (para a prévia do editor). */
export function pontosPrevia(rank: number | null, multiplicador: number | null): number | null {
  if (rank === null || multiplicador === null || !(multiplicador > 0) || rank < 1 || rank > 5) return null;
  return Math.round((CONFIG_V1.base * pesoDoRank(rank, CONFIG_V1.alphaCentesimos) * multiplicador) / 100);
}

/** Detalhe da instância (D44 a D46): encontros, funções e ranks e o histórico de versões. */
@Component({
  selector: "app-gestao-instancia",
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ComoFuncionaComponent,
    PainelLateralComponent,
    TabelaDirective,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTabsModule,
  ],
  template: `
    <div class="pagina">
      @if (erro(); as e) {
        <p role="alert">{{ e }}</p>
      }
      @if (instancia(); as i) {
        <div class="cabecalho">
          <div>
            <h1>
              {{ i.nome }}
              <span [class]="'cartao-selo estatico ' + classeSelo(i)">{{ situacao(i).texto }}</span>
            </h1>
            <p>
              v{{ i.vigente?.versao }}
              @if (i.nivelMinimo) {
                · nível {{ i.nivelMinimo }}
              }
              @if (i.retorno) {
                · {{ rotuloRetorno[i.retorno] }}
              }
              @if (i.modo) {
                · {{ rotuloModo[i.modo] }}
              }
              @if (i.dificuldade) {
                · {{ rotuloDificuldade[i.dificuldade] }}
              }
            </p>
          </div>
          <div class="cabecalho-acoes">
            <button type="button" class="botao-acao" (click)="abrirVersao()">Nova versão</button>
            <button mat-stroked-button type="button" (click)="alternarAtiva(i)">
              {{ i.ativa ? "Desativar" : "Ativar" }}
            </button>
            <a mat-button routerLink="/gestao/instancias">Voltar</a>
          </div>
        </div>

        @if ((i.vigente?.funcoes?.length ?? 0) === 0) {
          <p class="aviso">Sem funções e ranks: crie uma versão nova com eles antes de ativar a instância.</p>
        }

        <ui-como-funciona>
          <p>
            O multiplicador do encontro e o rank da função entram no cálculo de cada participação. Mudar
            qualquer um deles cria uma versão nova, que vale para as runs registradas depois; as runs antigas
            mantêm a versão e os pontos delas (D46).
          </p>
          @if (i.requisito || i.premiacao) {
            <p>
              @if (i.requisito) {
                Requisito: {{ i.requisito }}.
              }
              @if (i.premiacao) {
                Premiação: {{ i.premiacao }}.
              }
            </p>
          }
        </ui-como-funciona>

        <mat-tab-group animationDuration="0ms">
          <mat-tab label="Encontros">
            <table uiTabela class="tabela" data-testid="encontros">
              <thead>
                <tr>
                  <th scope="col">Encontro</th>
                  <th scope="col">Multiplicador</th>
                  <th scope="col">Rank 5 · completa</th>
                </tr>
              </thead>
              <tbody>
                @for (e of i.vigente?.encontros ?? []; track e.id) {
                  <tr>
                    <td>{{ e.nome }}</td>
                    <td>{{ multiplicador(e.multiplicadorCentesimos) }}</td>
                    <td>{{ previa(5, e.multiplicadorCentesimos / 100) }} pts</td>
                  </tr>
                }
              </tbody>
            </table>
          </mat-tab>
          <mat-tab [label]="'Funções e ranks (' + (i.vigente?.funcoes?.length ?? 0) + ')'">
            <table uiTabela class="tabela" data-testid="funcoes">
              <thead>
                <tr>
                  <th scope="col">Classe</th>
                  <th scope="col">Função</th>
                  <th scope="col">Rank</th>
                  <th scope="col">Padrão</th>
                </tr>
              </thead>
              <tbody>
                @for (f of i.vigente?.funcoes ?? []; track f.id) {
                  <tr>
                    <td>{{ f.classe.apelidoGrupo ?? f.classe.nomeOficial }}</td>
                    <td>{{ f.nome }}</td>
                    <td>{{ f.rank }}</td>
                    <td>{{ f.padrao ? "Sim" : "—" }}</td>
                  </tr>
                }
              </tbody>
            </table>
            @if (classesSemPadrao().length > 0) {
              <p class="texto-secundario">
                Sem função padrão (a função é escolhida em cada run): {{ classesSemPadrao().join(", ") }}.
              </p>
            }
          </mat-tab>
          <mat-tab label="Histórico">
            <table uiTabela class="tabela" data-testid="historico-versoes">
              <thead>
                <tr>
                  <th scope="col">Versão</th>
                  <th scope="col">Desde</th>
                  <th scope="col">Por</th>
                  <th scope="col">Encontros</th>
                  <th scope="col">Funções</th>
                  <th scope="col">Runs</th>
                </tr>
              </thead>
              <tbody>
                @for (v of historico(); track v.id) {
                  <tr>
                    <td>v{{ v.versao }}</td>
                    <td>{{ v.vigenteDesde | date: "dd/MM/yyyy HH:mm" }}</td>
                    <td>{{ v.criadaPor?.discordUsername ?? "migração" }}</td>
                    <td>
                      @for (e of v.encontros; track e.nome; let ultimo = $last) {
                        {{ e.nome }} {{ multiplicador(e.multiplicadorCentesimos) }}{{ ultimo ? "" : " · " }}
                      }
                    </td>
                    <td>{{ v.funcoes.length }}</td>
                    <td>{{ v.runs }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </mat-tab>
        </mat-tab-group>

        <ui-painel-lateral
          [titulo]="'Nova versão v' + ((i.vigente?.versao ?? 0) + 1)"
          [aberto]="editando()"
          (fechar)="editando.set(false)"
        >
          <form class="formulario" (ngSubmit)="salvarVersao(i)">
            <h3>Encontros</h3>
            @for (e of encontros; track $index; let n = $index) {
              <div class="linha">
                <mat-form-field subscriptSizing="dynamic">
                  <mat-label>Encontro</mat-label>
                  <input matInput [(ngModel)]="e.nome" [name]="'enc' + n" maxlength="40" />
                </mat-form-field>
                <mat-form-field subscriptSizing="dynamic" class="estreito">
                  <mat-label>Multiplicador (×)</mat-label>
                  <input
                    matInput
                    type="number"
                    min="0.01"
                    step="0.01"
                    [(ngModel)]="e.multiplicador"
                    [name]="'mult' + n"
                  />
                </mat-form-field>
                @if (encontros.length > 1) {
                  <button mat-button type="button" (click)="encontros.splice(n, 1)">Remover</button>
                }
              </div>
            }
            <button
              mat-stroked-button
              type="button"
              (click)="encontros.push({ nome: '', multiplicador: null })"
            >
              Adicionar encontro
            </button>

            <h3>Funções e ranks</h3>
            @for (f of funcoes; track $index; let n = $index) {
              <div class="linha">
                <mat-form-field subscriptSizing="dynamic">
                  <mat-label>Classe</mat-label>
                  <mat-select [(ngModel)]="f.classeId" [name]="'cls' + n">
                    @for (c of classes(); track c.id) {
                      <mat-option [value]="c.id">{{ c.apelidoGrupo ?? c.nomeOficial }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field subscriptSizing="dynamic">
                  <mat-label>Função</mat-label>
                  <input matInput [(ngModel)]="f.nome" [name]="'fn' + n" maxlength="40" />
                </mat-form-field>
                <mat-form-field subscriptSizing="dynamic" class="estreito">
                  <mat-label>Rank</mat-label>
                  <input
                    matInput
                    type="number"
                    min="1"
                    max="5"
                    step="1"
                    [(ngModel)]="f.rank"
                    [name]="'rk' + n"
                  />
                </mat-form-field>
                <mat-checkbox [(ngModel)]="f.padrao" [name]="'pd' + n">Padrão</mat-checkbox>
                <button mat-button type="button" (click)="funcoes.splice(n, 1)">Remover</button>
              </div>
            }
            <button mat-stroked-button type="button" (click)="adicionarFuncao()">Adicionar função</button>

            @for (p of pendencias(); track p) {
              <p class="pendencia">{{ p }}</p>
            }
            <div class="linha-acoes">
              <button mat-flat-button type="submit" [disabled]="pendencias().length > 0 || salvando()">
                Criar versão v{{ (i.vigente?.versao ?? 0) + 1 }}
              </button>
              <button mat-button type="button" (click)="editando.set(false)">Cancelar</button>
            </div>
          </form>
        </ui-painel-lateral>
      }
    </div>
  `,
  styles: `
    h1 {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }
    .estatico {
      position: static;
      font-size: 12px;
    }
    .aviso {
      color: var(--alerta);
      margin: 0;
    }
    .tabela {
      margin-top: 12px;
    }
    .tabela th,
    .tabela td {
      text-align: left;
      padding: 8px;
      border-bottom: 1px solid var(--borda);
    }
    .formulario {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .formulario h3 {
      margin: 8px 0 0;
      font-size: 15px;
    }
    .linha {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding-bottom: 8px;
      border-bottom: 1px dashed var(--borda);
    }
    .estreito {
      width: 110px;
    }
    .pendencia {
      margin: 0;
      color: var(--alerta);
      font-size: 13px;
    }
  `,
})
export class GestaoInstanciaComponent {
  private readonly http = inject(HttpClient);
  private readonly acao = inject(Acao);

  /** Id da instância (rota /gestao/instancias/:id). */
  readonly id = input.required<string>();

  readonly instancia = signal<Instancia | null>(null);
  readonly historico = signal<VersaoHistorico[]>([]);
  readonly classes = signal<Classe[]>([]);
  readonly erro = signal<string | null>(null);
  readonly editando = signal(false);
  readonly salvando = signal(false);
  readonly rotuloRetorno = ROTULO_RETORNO;
  readonly rotuloModo = ROTULO_MODO;
  readonly rotuloDificuldade = ROTULO_DIFICULDADE;

  encontros: EncontroEditavel[] = [];
  funcoes: FuncaoEditavel[] = [];

  /** Classes ativas que não têm função padrão nesta instância (a função é escolhida na run, D16). */
  readonly classesSemPadrao = computed(() => {
    const funcoes = this.instancia()?.vigente?.funcoes ?? [];
    const comFuncao = new Map<string, { nome: string; padrao: boolean }>();
    for (const f of funcoes) {
      const nome = f.classe.apelidoGrupo ?? f.classe.nomeOficial;
      const atual = comFuncao.get(f.classe.id);
      comFuncao.set(f.classe.id, { nome, padrao: (atual?.padrao ?? false) || f.padrao });
    }
    return [...comFuncao.values()].filter((c) => !c.padrao).map((c) => c.nome);
  });

  constructor() {
    effect(() => {
      void this.carregar(this.id());
    });
  }

  async carregar(id: string): Promise<void> {
    try {
      const [i, h, c] = await Promise.all([
        firstValueFrom(this.http.get<Instancia>(`/api/instancias/${id}`)),
        firstValueFrom(this.http.get<VersaoHistorico[]>(`/api/instancias/${id}/versoes`)),
        firstValueFrom(this.http.get<Classe[]>("/api/classes", { params: { instanciaId: id } })),
      ]);
      this.instancia.set(i);
      this.historico.set(h);
      this.classes.set(c);
      this.erro.set(null);
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
    }
  }

  situacao(i: Instancia) {
    return situacaoInstancia(i);
  }
  classeSelo(i: Instancia): string {
    const t = situacaoInstancia(i).tipo;
    return t === "ativa" ? "selo-acento" : t === "sem-funcoes" ? "selo-alerta" : "";
  }
  multiplicador(c: number): string {
    return textoMultiplicador(c);
  }
  previa(rank: number, multiplicador: number): number | string {
    return pontosPrevia(rank, multiplicador) ?? "—";
  }
  pendencias(): string[] {
    return pendenciasVersao(this.encontros, this.funcoes);
  }

  /** O editor parte da versão vigente (D46: a versão nova é a tabela inteira). */
  abrirVersao(): void {
    const v = this.instancia()?.vigente;
    this.encontros = (v?.encontros ?? []).map((e) => ({
      nome: e.nome,
      multiplicador: e.multiplicadorCentesimos / 100,
    }));
    if (this.encontros.length === 0) this.encontros = [{ nome: "Chefe", multiplicador: null }];
    this.funcoes = (v?.funcoes ?? []).map((f) => ({
      classeId: f.classe.id,
      nome: f.nome,
      rank: f.rank,
      padrao: f.padrao,
    }));
    this.editando.set(true);
  }

  adicionarFuncao(): void {
    this.funcoes.push({
      classeId: this.classes().find((c) => c.ativa)?.id ?? "",
      nome: "",
      rank: null,
      padrao: false,
    });
  }

  async salvarVersao(i: Instancia): Promise<void> {
    if (this.pendencias().length > 0) return;
    const proxima = (i.vigente?.versao ?? 0) + 1;
    if (!window.confirm(`Criar a versão v${proxima} de ${i.nome}? Ela vale para as próximas runs.`)) return;
    this.salvando.set(true);
    const ok = await this.acao.executar(
      () =>
        firstValueFrom(
          this.http.post(`/api/instancias/${i.id}/versoes`, corpoVersao(this.encontros, this.funcoes)),
        ),
      `Versão v${proxima} criada.`,
    );
    this.salvando.set(false);
    if (ok) this.editando.set(false);
    await this.carregar(i.id);
  }

  async alternarAtiva(i: Instancia): Promise<void> {
    await this.acao.executar(
      () => firstValueFrom(this.http.patch(`/api/instancias/${i.id}`, { ativa: !i.ativa })),
      i.ativa ? "Instância desativada: ela some do registro de runs." : "Instância ativada.",
    );
    await this.carregar(i.id);
  }
}
