import { DatePipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, computed, effect, inject, input, signal } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { Acao } from "../core/acao";
import type { ResultadoDropsRun } from "../core/estoque";
import { mensagemDeErro } from "../core/modelos";
import { type DetalheRun, ROTULO_CATEGORIA, ROTULO_FRACAO, ROTULO_STATUS } from "../core/runs";
import { iconeDoItem, siglaDaClasse, tomDe } from "../core/visual";
import { TabelaResponsivaDirective } from "../core/tabela-responsiva.directive";
import { telaLiberada } from "../core/telas-liberadas";
import { AuthService } from "../core/auth.service";
import { ImagemItemComponent } from "../core/imagem-item.component";

type Participante = DetalheRun["participacoes"][number];

/** T-21: detalhe da run com participações, empréstimos, drops e lançamentos, e a ação Corrigir (US-07). */
@Component({
  selector: "app-admin-run-detalhe",
  imports: [
    ImagemItemComponent,
    TabelaResponsivaDirective,
    DatePipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="pagina">
      @if (erro(); as e) {
        <p role="alert">{{ e }}</p>
      }
      @if (run(); as r) {
        <div class="linha-acoes">
          <h1 class="titulo">Run de {{ r.data | date: "dd/MM/yyyy" : "UTC" }}</h1>
          @if (r.status !== "ESTORNADA" && correcaoLiberada) {
            <a mat-flat-button [routerLink]="['/gestao/runs', r.id, 'corrigir']">Corrigir</a>
          }
          <a mat-button routerLink="/gestao/runs">Voltar à lista</a>
        </div>
        <p data-testid="resumo">
          {{ r.versaoInstancia.instancia.nome }} (v{{ r.versaoInstancia.versao }}) · {{ r.encontro.nome }} ·
          <strong>{{ rotuloStatus[r.status] }}</strong> · parâmetros v{{ r.config.versao }} · registrada por
          {{ r.registradaPor.discordUsername }} em
          {{ r.criadaEm | date: "dd/MM/yyyy HH:mm" }}
          @if (r.pontuacaoBetelgeuse !== null) {
            · pontuação do Betelgeuse {{ r.pontuacaoBetelgeuse }}
          }
        </p>
        @if (r.corrigidaPorRunId) {
          <p class="aviso">
            Esta run foi corrigida. Os lançamentos dela foram estornados.
            <a [routerLink]="['/gestao/runs', r.corrigidaPorRunId]">Ver a correção</a>
          </p>
        }
        @if (r.corrigeRunId) {
          <p>Esta run corrige <a [routerLink]="['/gestao/runs', r.corrigeRunId]">a run original</a>.</p>
        }
        @if (r.observacao) {
          <p>Observação: {{ r.observacao }}</p>
        }

        <section class="secao-party">
          <h2>
            Party <span class="texto-secundario">· {{ r.participacoes.length }} personagens</span>
          </h2>
          <div class="grade-cartoes" data-testid="participacoes">
            @for (p of r.participacoes; track p.id) {
              <article class="cartao-b" [attr.aria-label]="p.personagem.nome">
                <div class="cartao-arte" [style.color]="tomClasse(p)">
                  <span class="emblema">{{ sigla(p) }}</span>
                  <span class="cartao-selo selo-acento">Rank {{ p.rank }}</span>
                </div>
                <div>
                  <div class="cartao-nome">{{ p.personagem.nome }}</div>
                  <div class="cartao-meta">
                    {{ p.jogador.apelido }} · {{ classe(p) }} ({{ p.funcao.nome }})
                  </div>
                </div>
                @for (e of p.emprestimos; track e.id) {
                  <div class="cartao-meta emprestimo">
                    Empréstimo de {{ e.credor.apelido }}: {{ e.item?.nome ?? e.itemDescricao }} ·
                    {{ rotuloCategoria[e.categoria] }} {{ pct(e.pctEfetivo) }} → {{ e.pontos }}
                  </div>
                }
                <div class="cartao-rodape">
                  <span class="cartao-valor">{{ p.pontosGerados }} pts</span>
                  <span class="cartao-meta">{{ rotuloFracao[p.fracaoCentesimos] }}</span>
                </div>
              </article>
            }
          </div>
        </section>

        @if (r.drops.length > 0) {
          <mat-card>
            <mat-card-header><mat-card-title>Itens obtidos</mat-card-title></mat-card-header>
            <mat-card-content>
              <div class="grade-cartoes grade-drops" data-testid="drops">
                @for (d of r.drops; track d.id) {
                  <article class="cartao-b">
                    <div class="cartao-arte arte-baixa" [style.color]="tom(d.item.nome)">
                      <app-imagem-item [idJogo]="d.item.idJogo" [nome]="d.item.nome" [tamanho]="36" />
                      @if (d.lancadoNoEstoque) {
                        <span class="cartao-selo selo-acento">No estoque</span>
                      }
                    </div>
                    <div class="cartao-rodape">
                      <span class="cartao-nome">{{ d.item.nome }}</span>
                      <span class="cartao-valor">{{ d.quantidade }}×</span>
                    </div>
                  </article>
                }
              </div>
              @if (ehAdmin() && r.status !== "ESTORNADA" && dropsPendentes() > 0) {
                <button mat-stroked-button type="button" (click)="lancarDrops(r.id)" [disabled]="lancando()">
                  Lançar drops no estoque
                </button>
              }
              @if (resultadoDrops(); as res) {
                @for (n of res.naoLancados; track n.dropId) {
                  <p class="aviso">{{ n.item }}: não lançado ({{ n.motivo }})</p>
                }
              }
            </mat-card-content>
          </mat-card>
        }

        <mat-card>
          <mat-card-header><mat-card-title>Lançamentos</mat-card-title></mat-card-header>
          <mat-card-content>
            @if (r.lancamentos.length === 0) {
              <p class="texto-secundario">Nenhum lançamento (pontos zerados).</p>
            } @else {
              <table appResponsiva class="tabela" data-testid="lancamentos">
                <tbody>
                  @for (l of r.lancamentos; track l.id) {
                    <tr>
                      <td>{{ l.jogador.apelido }}</td>
                      <td>{{ l.tipo }}</td>
                      <td [class.negativo]="l.valor < 0">{{ l.valor > 0 ? "+" : "" }}{{ l.valor }}</td>
                    </tr>
                  }
                </tbody>
              </table>
              <p>Soma: {{ somaLancamentos() }}</p>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: `
    .titulo {
      margin: 0;
      flex: 1;
    }
    .tabela {
      border-collapse: collapse;
      width: 100%;
    }
    .tabela th,
    .tabela td {
      text-align: left;
      padding: 4px 8px;
      vertical-align: top;
    }
    .secao-party h2 {
      margin: 0 0 12px;
      font-size: 18px;
    }
    .emprestimo {
      padding-top: 6px;
      border-top: 1px dashed var(--borda);
    }
    .grade-drops {
      margin-bottom: 12px;
    }
    .arte-baixa {
      height: 72px;
    }
    .negativo {
      color: var(--mat-sys-error, #b3261e);
    }
    .aviso {
      color: var(--alerta);
    }
  `,
})
export class AdminRunDetalheComponent {
  readonly ehAdmin = inject(AuthService).ehAdmin;
  /** A tela de correção ainda não foi liberada: sem ela, o botão só levaria ao início. */
  readonly correcaoLiberada = telaLiberada("/gestao/runs/:id/corrigir");
  private readonly http = inject(HttpClient);
  private readonly acao = inject(Acao);
  readonly lancando = signal(false);
  readonly resultadoDrops = signal<ResultadoDropsRun | null>(null);
  readonly dropsPendentes = computed(
    () => (this.run()?.drops ?? []).filter((d) => !d.lancadoNoEstoque).length,
  );

  readonly id = input.required<string>();
  readonly run = signal<DetalheRun | null>(null);
  readonly erro = signal<string | null>(null);
  readonly rotuloStatus = ROTULO_STATUS;
  readonly rotuloCategoria = ROTULO_CATEGORIA;
  readonly rotuloFracao = ROTULO_FRACAO;
  readonly somaLancamentos = computed(() => (this.run()?.lancamentos ?? []).reduce((a, l) => a + l.valor, 0));

  constructor() {
    // Recarrega ao navegar entre a run original e a correção (mesmo componente, id diferente).
    effect(() => {
      const id = this.id();
      void this.carregar(id);
    });
  }

  classe(p: Participante): string {
    return p.funcao.classe.apelidoGrupo ?? p.funcao.classe.nomeOficial;
  }
  sigla(p: Participante): string {
    return siglaDaClasse(this.classe(p));
  }
  tomClasse(p: Participante): string {
    return tomDe(this.classe(p));
  }
  tom(nome: string): string {
    return tomDe(nome);
  }
  iconeItem(nome: string) {
    return iconeDoItem(nome, null);
  }

  pct(texto: string): string {
    return `${Number(texto).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  }

  /** D18: lança no estoque do grupo os drops ainda não lançados (cada drop uma vez). */
  async lancarDrops(id: string): Promise<void> {
    this.lancando.set(true);
    try {
      const r = await firstValueFrom(this.http.post<ResultadoDropsRun>(`/api/runs/${id}/estoque`, {}));
      this.resultadoDrops.set(r);
      this.acao.avisar(
        r.lancados.length === 0
          ? "Nenhum drop lançado."
          : `${r.lancados.length} drop(s) lançado(s) no estoque.`,
      );
      await this.carregar(id);
    } catch (e) {
      this.acao.avisar(mensagemDeErro(e));
    } finally {
      this.lancando.set(false);
    }
  }

  private async carregar(id: string): Promise<void> {
    this.erro.set(null);
    try {
      this.run.set(await firstValueFrom(this.http.get<DetalheRun>(`/api/runs/${id}`)));
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
    }
  }
}
