import { NgTemplateOutlet } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, computed, DestroyRef, inject, input, type OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatStepperModule } from "@angular/material/stepper";
import { Router, RouterLink } from "@angular/router";
import { CATEGORIAS_EMPRESTIMO, type ConfigPontuacao, STATUS_RUN } from "@betel/scoring";
import { firstValueFrom } from "rxjs";
import { Acao } from "../core/acao";
import { type Classe, type ItemCatalogo, paraConfigMotor, type VersaoParametros } from "../core/cadastros";
import { mensagemDeErro } from "../core/modelos";
import { type Instancia, recebeRun, textoMultiplicador } from "../core/instancias";
import {
  ajustarAVersaoVigente,
  calcularPrevia,
  type Catalogos,
  type DetalheRun,
  funcaoPadrao,
  type JogadorCadastro,
  montarCorpo,
  novoEmprestimo,
  novoParticipante,
  novoRascunho,
  pendencias,
  pendentesDoRascunho,
  type RascunhoNag4eyes,
  rascunhoDeNag4eyes,
  type RascunhoParticipante,
  type RascunhoRun,
  rascunhoDeRun,
  ROTULO_CATEGORIA,
  ROTULO_FRACAO,
  ROTULO_STATUS,
} from "../core/runs";
import { TabelaDirective } from "../shared/ui/tabela/tabela.directive";

interface RespostaRegistro {
  runId: string;
  avisosReducao: { personagemId: string; somaPercentuaisBp: number; tetoCredoresBp: number }[];
}

/**
 * T-20: assistente de run em 5 passos (dados → participantes → empréstimos → drops → revisão).
 * A prévia usa o mesmo motor da API (@betel/scoring), então os pontos mostrados são os que serão gravados.
 * Com `id`, abre em modo correção (US-07): pré-preenchido com a run e usando os parâmetros dela (D17).
 * Com `?rascunho=<id>`, pré-preenche com o rascunho do nag4eyes e o envio confirma o rascunho.
 */
@Component({
  selector: "app-admin-run-assistente",
  imports: [
    TabelaDirective,
    FormsModule,
    NgTemplateOutlet,
    RouterLink,
    MatStepperModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="pagina">
      @if (correcaoDe()) {
        <h1>Corrigir run</h1>
        <p class="texto-secundario">
          Os lançamentos da run original serão estornados e esta versão será registrada no lugar, com os
          parâmetros da run original (v{{ config()?.versao }}).
        </p>
      } @else {
        <h1>Nova run</h1>
      }
      @if (origemRascunho(); as o) {
        <mat-card class="bloco" data-testid="origem-rascunho">
          <mat-card-subtitle>
            Rascunho do nag4eyes{{ o.partyId ? " (grupo " + o.partyId + ")" : "" }}
          </mat-card-subtitle>
          <mat-card-content>
            <p class="texto-secundario">
              Data e participantes vieram do grupo encerrado no Discord. Confira, escolha o resultado e o
              encontro e informe empréstimos e drops: nada pontua até o registro.
              @if (o.instancia === null && o.instanciaOrigem) {
                A instância "{{ o.instanciaOrigem.nome }}" não foi encontrada aqui; escolha-a.
              }
            </p>
            @if (pendentesRascunho().length > 0) {
              <p>Não entraram automaticamente (inclua à mão, se for o caso):</p>
              <ul>
                @for (x of pendentesRascunho(); track $index) {
                  <li>
                    {{ x.personagem }}{{ x.classe ? " · " + x.classe : "" }}
                    {{ x.jogador ? "(" + x.jogador + ")" : "(Discord " + x.discordId + ")" }}:
                    <span class="aviso">{{ x.motivo }}</span>
                  </li>
                }
              </ul>
            }
          </mat-card-content>
        </mat-card>
      }

      @if (!pronto()) {
        <p>{{ erroCarga() ?? "Carregando…" }}</p>
      } @else {
        <mat-stepper [linear]="true" [orientation]="estreito() ? 'vertical' : 'horizontal'" #stepper>
          <!-- Sem a fonte Material Icons: as etapas mostram o número em vez dos ícones "edit"/"done". -->
          <ng-template matStepperIcon="edit" let-index="index">{{ index + 1 }}</ng-template>
          <ng-template matStepperIcon="done" let-index="index">{{ index + 1 }}</ng-template>
          <!-- 1. Dados -->
          <mat-step label="Dados da run" [completed]="pend()[1].length === 0">
            <div class="linha-acoes">
              <mat-form-field>
                <mat-label>Data</mat-label>
                <input
                  matInput
                  type="date"
                  [(ngModel)]="r.data"
                  (ngModelChange)="mudou()"
                  name="data"
                  required
                />
              </mat-form-field>
              <mat-form-field>
                <mat-label>Instância</mat-label>
                <mat-select
                  [ngModel]="r.instanciaId"
                  (ngModelChange)="escolherInstancia($event)"
                  name="instancia"
                  [disabled]="correcaoDe() !== null"
                >
                  @for (i of instanciasDisponiveis(); track i.id) {
                    <mat-option [value]="i.id">{{ i.nome }}</mat-option>
                  }
                </mat-select>
                @if (correcaoDe() !== null) {
                  <mat-hint>A correção fica na mesma instância, na versão vigente</mat-hint>
                }
              </mat-form-field>
              <mat-form-field>
                <mat-label>Encontro</mat-label>
                <mat-select [(ngModel)]="r.encontroId" (ngModelChange)="mudou()" name="encontro">
                  @for (e of encontros(); track e.id) {
                    <mat-option [value]="e.id"
                      >{{ e.nome }} ({{ multiplicador(e.multiplicadorCentesimos) }})</mat-option
                    >
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field>
                <mat-label>Resultado</mat-label>
                <mat-select [(ngModel)]="r.status" (ngModelChange)="mudou()" name="status">
                  @for (s of statusRun; track s) {
                    <mat-option [value]="s">{{ rotuloStatus[s] }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              @if (ehBetelgeuse()) {
                <mat-form-field>
                  <mat-label>Pontuação do Betelgeuse (opcional)</mat-label>
                  <input
                    matInput
                    type="number"
                    min="0"
                    [(ngModel)]="r.pontuacaoBetelgeuse"
                    (ngModelChange)="mudou()"
                    name="pontuacao"
                  />
                  <mat-hint>Só informativa: não entra no cálculo</mat-hint>
                </mat-form-field>
              }
            </div>
            <mat-form-field class="campo-largo">
              <mat-label>Observação (opcional)</mat-label>
              <input matInput [(ngModel)]="r.observacao" name="observacao" maxlength="500" />
            </mat-form-field>
            @if (correcaoDe()) {
              <mat-form-field class="campo-largo">
                <mat-label>Motivo da correção</mat-label>
                <input
                  matInput
                  [(ngModel)]="motivo"
                  (ngModelChange)="mudou()"
                  name="motivo"
                  maxlength="500"
                  required
                />
              </mat-form-field>
            }
            <ng-container *ngTemplateOutlet="pendenciasPasso; context: { $implicit: pend()[1] }" />
            <div class="linha-acoes">
              <button mat-flat-button matStepperNext type="button" [disabled]="pend()[1].length > 0">
                Próximo
              </button>
            </div>
          </mat-step>

          <!-- 2. Participantes -->
          <mat-step label="Participantes" [completed]="pend()[2].length === 0">
            @for (p of r.participantes; track $index; let i = $index) {
              <div class="linha-acoes participante" [attr.data-participante]="i">
                <mat-form-field>
                  <mat-label>Personagem</mat-label>
                  <mat-select
                    [(ngModel)]="p.personagemId"
                    (ngModelChange)="mudou()"
                    [name]="'personagem' + i"
                  >
                    @for (j of jogadores(); track j.id) {
                      <mat-optgroup [label]="j.apelido">
                        @for (pp of j.personagens; track pp.id) {
                          @if (pp.ativo) {
                            <mat-option [value]="pp.id">{{ pp.nome }}</mat-option>
                          }
                        }
                      </mat-optgroup>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Classe</mat-label>
                  <mat-select
                    [ngModel]="p.classeId"
                    (ngModelChange)="escolherClasse(p, $event)"
                    [name]="'classe' + i"
                  >
                    @for (c of classesAtivas(); track c.id) {
                      <mat-option [value]="c.id">{{ c.apelidoGrupo ?? c.nomeOficial }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Função</mat-label>
                  <mat-select
                    [(ngModel)]="p.funcaoId"
                    (ngModelChange)="mudou()"
                    [name]="'funcao' + i"
                    [disabled]="p.classeId === null"
                  >
                    @for (f of funcoesDe(p); track f.id) {
                      <mat-option [value]="f.id">{{ f.nome }} (rank {{ f.rank }})</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field class="estreito">
                  <mat-label>Participação</mat-label>
                  <mat-select
                    [(ngModel)]="p.fracaoCentesimos"
                    (ngModelChange)="mudou()"
                    [name]="'fracao' + i"
                  >
                    @for (f of fracoes; track f) {
                      <mat-option [value]="f">{{ rotuloFracao[f] }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <button mat-button type="button" (click)="removerParticipante(i)">Remover</button>
              </div>
            }
            <button mat-stroked-button type="button" (click)="adicionarParticipante()">
              Adicionar participante
            </button>
            <ng-container *ngTemplateOutlet="pendenciasPasso; context: { $implicit: pend()[2] }" />
            <div class="linha-acoes">
              <button mat-button matStepperPrevious type="button">Voltar</button>
              <button mat-flat-button matStepperNext type="button" [disabled]="pend()[2].length > 0">
                Próximo
              </button>
            </div>
          </mat-step>

          <!-- 3. Empréstimos -->
          <mat-step label="Empréstimos" [completed]="pend()[3].length === 0">
            <p class="texto-secundario">
              Itens emprestados por outro jogador. A categoria sugere o percentual; informe um valor só para
              mudá-lo. Os credores somados recebem no máximo {{ tetoTexto() }} dos pontos.
            </p>
            @for (p of r.participantes; track $index; let i = $index) {
              <mat-card class="bloco">
                <mat-card-subtitle>{{ nomePersonagem(p) }}</mat-card-subtitle>
                <mat-card-content>
                  @for (e of p.emprestimos; track $index; let j = $index) {
                    <div class="linha-acoes">
                      <mat-form-field>
                        <mat-label>Emprestado por</mat-label>
                        <mat-select
                          [(ngModel)]="e.credorJogadorId"
                          (ngModelChange)="mudou()"
                          [name]="'credor' + i + '-' + j"
                        >
                          @for (jg of credoresPara(p); track jg.id) {
                            <mat-option [value]="jg.id">{{ jg.apelido }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                      <mat-form-field>
                        <mat-label>Item do catálogo</mat-label>
                        <mat-select
                          [(ngModel)]="e.itemId"
                          (ngModelChange)="mudou()"
                          [name]="'item' + i + '-' + j"
                        >
                          <mat-option [value]="null">— outro (descrever) —</mat-option>
                          @for (it of itensAtivos(); track it.id) {
                            <mat-option [value]="it.id">{{ it.nome }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                      @if (e.itemId === null) {
                        <mat-form-field>
                          <mat-label>Descrição do item</mat-label>
                          <input
                            matInput
                            [(ngModel)]="e.itemDescricao"
                            (ngModelChange)="mudou()"
                            [name]="'desc' + i + '-' + j"
                            maxlength="80"
                          />
                        </mat-form-field>
                      }
                      <mat-form-field class="estreito">
                        <mat-label>Categoria</mat-label>
                        <mat-select
                          [(ngModel)]="e.categoria"
                          (ngModelChange)="mudou()"
                          [name]="'cat' + i + '-' + j"
                        >
                          @for (c of categorias; track c) {
                            <mat-option [value]="c">{{ rotuloCategoria[c] }} ({{ sugestao(c) }})</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                      <mat-form-field class="estreito">
                        <mat-label>% informado</mat-label>
                        <input
                          matInput
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          [(ngModel)]="e.percentualInformado"
                          (ngModelChange)="mudou()"
                          [name]="'pct' + i + '-' + j"
                        />
                        <span matTextSuffix>%</span>
                      </mat-form-field>
                      <button mat-button type="button" (click)="removerEmprestimo(p, j)">Remover</button>
                    </div>
                  }
                  <button mat-stroked-button type="button" (click)="adicionarEmprestimo(p)">
                    Adicionar empréstimo
                  </button>
                </mat-card-content>
              </mat-card>
            }
            <ng-container *ngTemplateOutlet="pendenciasPasso; context: { $implicit: pend()[3] }" />
            <div class="linha-acoes">
              <button mat-button matStepperPrevious type="button">Voltar</button>
              <button mat-flat-button matStepperNext type="button" [disabled]="pend()[3].length > 0">
                Próximo
              </button>
            </div>
          </mat-step>

          <!-- 4. Drops -->
          <mat-step label="Itens obtidos" [completed]="pend()[4].length === 0">
            <p class="texto-secundario">Os itens obtidos não alteram a pontuação.</p>
            @for (d of r.drops; track $index; let i = $index) {
              <div class="linha-acoes">
                <mat-form-field>
                  <mat-label>Item</mat-label>
                  <mat-select [(ngModel)]="d.itemId" (ngModelChange)="mudou()" [name]="'drop' + i">
                    @for (it of itensAtivos(); track it.id) {
                      <mat-option [value]="it.id">{{ it.nome }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field class="estreito">
                  <mat-label>Quantidade</mat-label>
                  <input
                    matInput
                    type="number"
                    min="1"
                    step="1"
                    [(ngModel)]="d.quantidade"
                    (ngModelChange)="mudou()"
                    [name]="'qtd' + i"
                  />
                </mat-form-field>
                <button mat-button type="button" (click)="removerDrop(i)">Remover</button>
              </div>
            }
            <button mat-stroked-button type="button" (click)="adicionarDrop()">Adicionar item</button>
            <ng-container *ngTemplateOutlet="pendenciasPasso; context: { $implicit: pend()[4] }" />
            <div class="linha-acoes">
              <button mat-button matStepperPrevious type="button">Voltar</button>
              <button mat-flat-button matStepperNext type="button" [disabled]="pend()[4].length > 0">
                Próximo
              </button>
            </div>
          </mat-step>

          <!-- 5. Revisão -->
          <mat-step label="Revisão">
            <p>
              {{ r.data }} · {{ nomeInstancia() }} · {{ nomeEncontro() }} · {{ rotuloStatus[r.status] }} ·
              parâmetros v{{ config()?.versao }}
            </p>
            @if (previa(); as pv) {
              <table uiTabela class="previa" data-testid="previa">
                <thead>
                  <tr>
                    <th scope="col">Personagem</th>
                    <th scope="col">Jogador</th>
                    <th scope="col">Função</th>
                    <th scope="col">Rank</th>
                    <th scope="col">Pontos</th>
                    <th scope="col">Parcelas</th>
                    <th scope="col">Fica com</th>
                  </tr>
                </thead>
                <tbody>
                  @for (l of pv.linhas; track l.personagem) {
                    <tr [class.erro-linha]="l.erro">
                      <td>{{ l.personagem }}</td>
                      <td>{{ l.jogador }}</td>
                      <td>{{ l.funcao }}</td>
                      <td>{{ l.rank }}</td>
                      <td>{{ l.pontos }}</td>
                      <td>
                        @for (pc of l.parcelas; track $index) {
                          <div>{{ pc.credor }}: {{ pc.pontos }}</div>
                        }
                        @if (l.reducao) {
                          <div class="aviso">Reduzido ao teto (D9a)</div>
                        }
                      </td>
                      <td>{{ l.pontosTomador }}</td>
                    </tr>
                  }
                </tbody>
              </table>
              <p>
                <strong>Total gerado: {{ pv.total }}</strong>
              </p>
              <h3>Ganho por jogador</h3>
              <ul data-testid="ganho-por-jogador">
                @for (g of pv.porJogador; track g.jogador) {
                  <li>{{ g.jogador }}: {{ g.pontos }}</li>
                }
              </ul>
              @for (e of pv.erros; track e) {
                <p class="erro" role="alert">{{ e }}</p>
              }
            }
            @if (erroEnvio(); as e) {
              <p class="erro" role="alert">{{ e }}</p>
            }
            <div class="linha-acoes">
              <button mat-button matStepperPrevious type="button">Voltar</button>
              <button
                mat-flat-button
                type="button"
                (click)="enviar()"
                [disabled]="!podeEnviar() || enviando()"
              >
                {{ correcaoDe() ? "Registrar correção" : "Registrar run" }}
              </button>
              <a mat-button routerLink="/gestao/runs">Cancelar</a>
            </div>
          </mat-step>
        </mat-stepper>
      }

      <ng-template #pendenciasPasso let-lista>
        @for (msg of lista; track msg) {
          <p class="pendencia">{{ msg }}</p>
        }
      </ng-template>
    </div>
  `,
  styles: `
    .participante {
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      padding-top: 8px;
    }
    .estreito {
      width: 160px;
    }
    .bloco {
      margin-bottom: 12px;
    }
    .previa {
      border-collapse: collapse;
      width: 100%;
    }
    .previa th,
    .previa td {
      text-align: left;
      padding: 4px 8px;
      vertical-align: top;
    }
    .pendencia {
      color: var(--mat-sys-on-surface-variant, #555);
      margin: 2px 0;
      font-size: 13px;
    }
    .erro,
    .erro-linha {
      color: var(--mat-sys-error, #b3261e);
    }
    .aviso {
      color: var(--alerta);
      font-size: 12px;
    }
  `,
})
export class AdminRunAssistenteComponent implements OnInit {
  private readonly http = inject(HttpClient);
  /** Em tela estreita os passos ficam um embaixo do outro: os rótulos não cabem lado a lado. */
  readonly estreito = signal(false);
  private readonly router = inject(Router);
  private readonly acao = inject(Acao);

  /** Id da run a corrigir (rota /gestao/runs/:id/corrigir). */
  readonly id = input<string | undefined>();
  /** Id do rascunho do nag4eyes que pré-preenche a run (?rascunho=...); o envio o confirma. */
  readonly rascunho = input<string | undefined>();

  readonly statusRun = STATUS_RUN;
  readonly categorias = CATEGORIAS_EMPRESTIMO;
  readonly fracoes = [100, 50, 0] as const;
  readonly rotuloStatus = ROTULO_STATUS;
  readonly rotuloCategoria = ROTULO_CATEGORIA;
  readonly rotuloFracao = ROTULO_FRACAO;

  readonly pronto = signal(false);
  readonly erroCarga = signal<string | null>(null);
  readonly erroEnvio = signal<string | null>(null);
  readonly enviando = signal(false);
  readonly jogadores = signal<JogadorCadastro[]>([]);
  readonly instancias = signal<Instancia[]>([]);
  readonly classes = signal<Classe[]>([]);
  readonly itens = signal<ItemCatalogo[]>([]);
  readonly config = signal<VersaoParametros | null>(null);
  readonly correcaoDe = signal<string | null>(null);
  readonly origemRascunho = signal<RascunhoNag4eyes | null>(null);
  readonly pendentesRascunho = computed(() => {
    const o = this.origemRascunho();
    return o === null ? [] : pendentesDoRascunho(o);
  });
  /** Incrementado a cada edição: recalcula pendências e prévia. */
  private readonly versao = signal(0);

  r: RascunhoRun = novoRascunho();
  motivo = "";

  readonly classesAtivas = computed(() => this.classes().filter((c) => c.ativa));
  readonly itensAtivos = computed(() => this.itens().filter((i) => i.ativo));
  /** CT-146: só instâncias ativas e com funções recebem run. */
  readonly instanciasDisponiveis = computed(() => this.instancias().filter(recebeRun));
  private readonly catalogos = computed<Catalogos>(() => ({
    jogadores: this.jogadores(),
    classes: this.classes(),
    instancias: this.instancias(),
    itens: this.itens(),
  }));
  private readonly configMotor = computed<ConfigPontuacao | null>(() => {
    const c = this.config();
    return c === null ? null : paraConfigMotor(c);
  });
  readonly pend = computed(() => {
    this.versao();
    const p = pendencias(this.r, this.catalogos());
    if (this.correcaoDe() !== null && this.motivo.trim().length < 3) {
      p[1] = [...p[1], "Informe o motivo da correção."];
    }
    return p;
  });
  readonly previa = computed(() => {
    this.versao();
    const c = this.configMotor();
    return c === null ? null : calcularPrevia(this.r, c, this.catalogos());
  });
  readonly podeEnviar = computed(() => {
    const p = this.pend();
    const pv = this.previa();
    return [1, 2, 3, 4].every((k) => p[k as 1].length === 0) && pv !== null && pv.erros.length === 0;
  });

  constructor() {
    const mq = window.matchMedia("(max-width: 700px)");
    this.estreito.set(mq.matches);
    const mudou = (e: MediaQueryListEvent) => this.estreito.set(e.matches);
    mq.addEventListener("change", mudou);
    inject(DestroyRef).onDestroy(() => mq.removeEventListener("change", mudou));
  }

  async ngOnInit(): Promise<void> {
    try {
      const [jogadores, instancias, itens, versoes] = await Promise.all([
        firstValueFrom(this.http.get<JogadorCadastro[]>("/api/jogadores")),
        firstValueFrom(this.http.get<Instancia[]>("/api/instancias")),
        firstValueFrom(this.http.get<ItemCatalogo[]>("/api/itens")),
        firstValueFrom(this.http.get<VersaoParametros[]>("/api/config-pontuacao")),
      ]);
      this.jogadores.set(jogadores);
      this.instancias.set(instancias);
      this.itens.set(itens);
      const id = this.id();
      if (id === undefined) {
        this.config.set(versoes[0] ?? null);
        const origem = await this.carregarRascunho();
        if (origem === false) return;
        // Começa pela instância do rascunho ou pela Torre, se puderem receber runs; senão, pela primeira disponível.
        const disponiveis = this.instanciasDisponiveis();
        const inicial =
          disponiveis.find((i) => origem !== null && i.id === origem.instancia?.id) ??
          disponiveis.find((i) => i.codigo === "TORRE_CONSTELACAO") ??
          disponiveis[0];
        if (inicial === undefined) {
          this.erroCarga.set("Nenhuma instância ativa com funções. Cadastre uma em Gestão → Instâncias.");
          return;
        }
        this.r = novoRascunho(inicial.id, inicial.vigente?.encontros[0]?.id ?? null);
        if (origem !== null) this.r = rascunhoDeNag4eyes(origem, this.r);
        await this.carregarClasses(inicial.id);
      } else {
        const run = await firstValueFrom(this.http.get<DetalheRun>(`/api/runs/${id}`));
        if (run.status === "ESTORNADA") {
          this.erroCarga.set("Esta run já foi corrigida.");
          return;
        }
        this.correcaoDe.set(id);
        const rascunho = rascunhoDeRun(run);
        await this.carregarClasses(run.versaoInstancia.instancia.id);
        // D46: encontro e funções passam para os da versão vigente, pelo nome.
        this.r = ajustarAVersaoVigente(rascunho, this.catalogos(), {
          encontro: run.encontro.nome,
          funcoes: new Map(run.participacoes.map((p) => [p.funcao.id, p.funcao.nome])),
        });
        // D17: a correção usa os parâmetros da run original.
        this.config.set(versoes.find((v) => v.id === run.config.id) ?? null);
      }
      if (this.config() === null) {
        this.erroCarga.set("Nenhuma versão de parâmetros encontrada.");
        return;
      }
      this.pronto.set(true);
      this.mudou();
    } catch (e) {
      this.erroCarga.set(mensagemDeErro(e));
    }
  }

  mudou(): void {
    this.versao.update((v) => v + 1);
  }

  /**
   * Carrega o rascunho do nag4eyes indicado na URL. Devolve null sem rascunho e false quando ele
   * não pode mais virar run (o erro já fica na tela).
   */
  private async carregarRascunho(): Promise<RascunhoNag4eyes | null | false> {
    const id = this.rascunho();
    if (id === undefined || id === "") return null;
    const origem = await firstValueFrom(this.http.get<RascunhoNag4eyes>(`/api/rascunhos-run/${id}`));
    if (origem.status !== "PENDENTE") {
      this.erroCarga.set("Este rascunho já foi confirmado ou descartado.");
      return false;
    }
    this.origemRascunho.set(origem);
    return origem;
  }

  /** D45: as funções e ranks são da versão vigente da instância escolhida. */
  private async carregarClasses(instanciaId: string): Promise<void> {
    this.classes.set(
      await firstValueFrom(this.http.get<Classe[]>("/api/classes", { params: { instanciaId } })),
    );
  }

  /** Trocar de instância troca encontros e funções: cada participante volta à função padrão da classe. */
  async escolherInstancia(instanciaId: string): Promise<void> {
    this.r.instanciaId = instanciaId;
    const inst = this.instancias().find((i) => i.id === instanciaId);
    this.r.encontroId = inst?.vigente?.encontros[0]?.id ?? null;
    await this.carregarClasses(instanciaId);
    for (const p of this.r.participantes) {
      p.funcaoId = funcaoPadrao(this.classes().find((c) => c.id === p.classeId))?.id ?? null;
    }
    this.mudou();
  }

  encontros() {
    return this.instancias().find((i) => i.id === this.r.instanciaId)?.vigente?.encontros ?? [];
  }
  multiplicador(c: number): string {
    return textoMultiplicador(c);
  }
  nomeInstancia(): string {
    return this.instancias().find((i) => i.id === this.r.instanciaId)?.nome ?? "—";
  }
  nomeEncontro(): string {
    return this.encontros().find((e) => e.id === this.r.encontroId)?.nome ?? "—";
  }
  /** A pontuação do Betelgeuse (informativa) só faz sentido nos encontros do Betelgeuse. */
  ehBetelgeuse(): boolean {
    return (
      this.encontros()
        .find((e) => e.id === this.r.encontroId)
        ?.codigo?.startsWith("BETELGEUSE") ?? false
    );
  }

  tetoTexto(): string {
    return `${(this.config()?.tetoCredoresBp ?? 0) / 100}%`;
  }

  sugestao(c: (typeof CATEGORIAS_EMPRESTIMO)[number]): string {
    const v = this.config();
    if (v === null) return "";
    const bp = {
      ESSENCIAL: v.pctEssencialBp,
      IMPORTANTE: v.pctImportanteBp,
      COMPLEMENTAR: v.pctComplementarBp,
    }[c];
    return `${bp / 100}%`;
  }

  funcoesDe(p: RascunhoParticipante) {
    return this.classes().find((c) => c.id === p.classeId)?.funcoes ?? [];
  }

  /** Ao trocar a classe, pré-seleciona a função padrão (classes sem padrão ficam sem seleção: D16). */
  escolherClasse(p: RascunhoParticipante, classeId: string): void {
    p.classeId = classeId;
    p.funcaoId = funcaoPadrao(this.classes().find((c) => c.id === classeId))?.id ?? null;
    this.mudou();
  }

  nomePersonagem(p: RascunhoParticipante): string {
    for (const j of this.jogadores()) {
      const pp = j.personagens.find((x) => x.id === p.personagemId);
      if (pp !== undefined) return `${pp.nome} (${j.apelido})`;
    }
    return "Participante sem personagem";
  }

  /** O credor não pode ser o próprio jogador do personagem (C3). */
  credoresPara(p: RascunhoParticipante): JogadorCadastro[] {
    const dono = this.jogadores().find((j) => j.personagens.some((x) => x.id === p.personagemId))?.id;
    return this.jogadores().filter((j) => j.id !== dono);
  }

  adicionarParticipante(): void {
    this.r.participantes.push(novoParticipante());
    this.mudou();
  }
  removerParticipante(i: number): void {
    this.r.participantes.splice(i, 1);
    this.mudou();
  }
  adicionarEmprestimo(p: RascunhoParticipante): void {
    p.emprestimos.push(novoEmprestimo());
    this.mudou();
  }
  removerEmprestimo(p: RascunhoParticipante, j: number): void {
    p.emprestimos.splice(j, 1);
    this.mudou();
  }
  adicionarDrop(): void {
    this.r.drops.push({ itemId: null, quantidade: 1 });
    this.mudou();
  }
  removerDrop(i: number): void {
    this.r.drops.splice(i, 1);
    this.mudou();
  }

  async enviar(): Promise<void> {
    if (!this.podeEnviar()) return;
    this.erroEnvio.set(null);
    this.enviando.set(true);
    const corpo = montarCorpo(this.r, this.catalogos());
    const alvo = this.correcaoDe();
    const origem = this.origemRascunho();
    try {
      const resp = await firstValueFrom(
        alvo !== null
          ? this.http.post<RespostaRegistro>(`/api/runs/${alvo}/corrigir`, {
              motivo: this.motivo,
              run: corpo,
            })
          : origem !== null
            ? this.http.post<RespostaRegistro>(`/api/rascunhos-run/${origem.id}/confirmar`, corpo)
            : this.http.post<RespostaRegistro>("/api/runs", corpo),
      );
      const aviso = resp.avisosReducao.length > 0 ? " Houve redução proporcional de empréstimos." : "";
      this.acao.avisar(`${alvo === null ? "Run registrada" : "Correção registrada"}.${aviso}`);
      await this.router.navigate(["/gestao/runs", resp.runId]);
    } catch (e) {
      this.erroEnvio.set(mensagemDeErro(e));
    } finally {
      this.enviando.set(false);
    }
  }
}
