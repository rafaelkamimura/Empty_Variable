import { HttpClient } from "@angular/common/http";
import { Component, computed, inject, type OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { Router, RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { Acao } from "../core/acao";
import { IconeComponent } from "../shared/dominio/icone.component";
import {
  type DificuldadeInstancia,
  type EncontroEditavel,
  type Instancia,
  type ModoInstancia,
  pendenciasVersao,
  type ReferenciaInstancia,
  type RetornoInstancia,
  ROTULO_DIFICULDADE,
  ROTULO_MODO,
  ROTULO_RETORNO,
  situacaoInstancia,
} from "../shared/dominio/instancias";
import { ComoFuncionaComponent } from "../shared/ui/como-funciona/como-funciona.component";
import { PainelLateralComponent } from "../shared/ui/painel-lateral/painel-lateral.component";
import { mensagemDeErro } from "../core/modelos";
import { tomDe } from "../shared/dominio/visual";

export interface NovaInstancia {
  nome: string;
  nivelMinimo: number | null;
  retorno: RetornoInstancia | null;
  modo: ModoInstancia | null;
  dificuldade: DificuldadeInstancia | null;
  requisito: string;
  premiacao: string;
}

const vazia = (): NovaInstancia => ({
  nome: "",
  nivelMinimo: null,
  retorno: null,
  modo: null,
  dificuldade: null,
  requisito: "",
  premiacao: "",
});

/** Pré-preenche o cadastro com a linha da browiki (D43). O multiplicador nunca vem dela (D44). */
export function deReferencia(r: ReferenciaInstancia): NovaInstancia {
  return {
    nome: r.nome,
    nivelMinimo: r.nivelMinimo,
    retorno: r.retorno,
    modo: r.modo,
    dificuldade: r.dificuldade,
    requisito: r.requisito ?? "",
    premiacao: r.premiacao ?? "",
  };
}

/** Gestão → Instâncias (D43): as que o grupo faz, cada uma com encontros e funções próprios. */
@Component({
  selector: "app-gestao-instancias",
  imports: [
    FormsModule,
    RouterLink,
    IconeComponent,
    ComoFuncionaComponent,
    PainelLateralComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="pagina">
      <div class="cabecalho">
        <div>
          <h1>Instâncias</h1>
          <p>Onde o grupo pontua: cada uma com os próprios encontros, funções e ranks.</p>
        </div>
        <div class="cabecalho-acoes">
          <button type="button" class="botao-acao" (click)="abrirCadastro()">Nova instância</button>
        </div>
      </div>

      <ui-como-funciona>
        <p>
          Pontos de uma participação = B × peso do rank da função × multiplicador do encontro × status ×
          fração. B, o peso dos ranks e o status são os Parâmetros (iguais para todas); o encontro (chefe ou
          modo) e as funções com seus ranks são de cada instância.
        </p>
        <p>
          A instância nasce inativa e sem funções. Cadastre as funções e os ranks numa versão nova e ative: só
          então ela aparece no registro de runs. Mudar algo sempre cria outra versão, e as runs antigas mantêm
          a delas.
        </p>
      </ui-como-funciona>

      <div class="grade-cartoes" data-testid="instancias">
        @for (i of instancias(); track i.id) {
          <a
            class="cartao-b instancia"
            [routerLink]="['/gestao/instancias', i.id]"
            [attr.aria-label]="i.nome"
          >
            <span class="cartao-arte" [style.color]="tom(i.nome)">
              <app-icone nome="espadas" [tamanho]="44" [traco]="1.4" />
              <span [class]="'cartao-selo ' + classeSelo(i)">{{ situacao(i).texto }}</span>
            </span>
            <span class="cartao-nome">{{ i.nome }}</span>
            <span class="cartao-meta">
              {{ i.nivelMinimo ? "Nível " + i.nivelMinimo : "Nível —" }}
              @if (i.retorno) {
                · {{ rotuloRetorno[i.retorno] }}
              }
              @if (i.dificuldade) {
                · {{ rotuloDificuldade[i.dificuldade] }}
              }
            </span>
            <span class="cartao-rodape">
              <span class="cartao-meta">v{{ i.vigente?.versao }}</span>
              <span class="cartao-meta">
                {{ i.vigente?.encontros?.length ?? 0 }} encontro(s) ·
                {{ i.vigente?.funcoes?.length ?? 0 }} função(ões)
              </span>
            </span>
          </a>
        }
      </div>

      <ui-painel-lateral titulo="Nova instância" [aberto]="cadastrando()" (fechar)="cadastrando.set(false)">
        <form class="formulario" (ngSubmit)="criar()">
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>A partir da lista da browiki (opcional)</mat-label>
            <mat-select [ngModel]="null" (ngModelChange)="usarReferencia($event)" name="referencia">
              @for (r of referenciasLivres(); track r.nome) {
                <mat-option [value]="r"
                  >{{ r.nome }}{{ r.nivelMinimo ? " (" + r.nivelMinimo + ")" : "" }}</mat-option
                >
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Nome</mat-label>
            <input matInput [(ngModel)]="nova.nome" name="nome" maxlength="60" required />
          </mat-form-field>
          <div class="campos">
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>Nível mínimo</mat-label>
              <input matInput type="number" min="1" max="300" [(ngModel)]="nova.nivelMinimo" name="nivel" />
            </mat-form-field>
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>Retorno</mat-label>
              <mat-select [(ngModel)]="nova.retorno" name="retorno">
                <mat-option [value]="null">—</mat-option>
                @for (r of retornos; track r) {
                  <mat-option [value]="r">{{ rotuloRetorno[r] }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>Modo</mat-label>
              <mat-select [(ngModel)]="nova.modo" name="modo">
                <mat-option [value]="null">—</mat-option>
                @for (m of modos; track m) {
                  <mat-option [value]="m">{{ rotuloModo[m] }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>Dificuldade</mat-label>
              <mat-select [(ngModel)]="nova.dificuldade" name="dificuldade">
                <mat-option [value]="null">—</mat-option>
                @for (d of dificuldades; track d) {
                  <mat-option [value]="d">{{ rotuloDificuldade[d] }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Quest de requisito (opcional)</mat-label>
            <input matInput [(ngModel)]="nova.requisito" name="requisito" maxlength="80" />
          </mat-form-field>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Premiação (opcional)</mat-label>
            <input matInput [(ngModel)]="nova.premiacao" name="premiacao" maxlength="80" />
          </mat-form-field>

          <h3>Encontros</h3>
          <p class="texto-secundario">
            Chefe ou modo, cada um com o multiplicador dos pontos. O valor é decisão do grupo (D44).
          </p>
          @for (e of encontros; track $index; let n = $index) {
            <div class="linha-encontro">
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
          @for (p of pendencias(); track p) {
            <p class="pendencia">{{ p }}</p>
          }
          <button mat-flat-button type="submit" [disabled]="pendencias().length > 0">Cadastrar</button>
        </form>
      </ui-painel-lateral>
    </div>
  `,
  styles: `
    .instancia {
      text-decoration: none;
    }
    .instancia:hover,
    .instancia:focus-visible {
      border-color: var(--acento);
      transform: translateY(-2px);
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
    .formulario p {
      margin: 0;
    }
    .campos {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }
    .linha-encontro {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .estreito {
      width: 140px;
    }
    .pendencia {
      color: var(--alerta);
      font-size: 13px;
    }
  `,
})
export class GestaoInstanciasComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly acao = inject(Acao);
  private readonly router = inject(Router);

  readonly instancias = signal<Instancia[]>([]);
  readonly referencia = signal<ReferenciaInstancia[]>([]);
  readonly cadastrando = signal(false);
  readonly retornos = Object.keys(ROTULO_RETORNO) as RetornoInstancia[];
  readonly modos = Object.keys(ROTULO_MODO) as ModoInstancia[];
  readonly dificuldades = Object.keys(ROTULO_DIFICULDADE) as DificuldadeInstancia[];
  readonly rotuloRetorno = ROTULO_RETORNO;
  readonly rotuloModo = ROTULO_MODO;
  readonly rotuloDificuldade = ROTULO_DIFICULDADE;

  nova: NovaInstancia = vazia();
  encontros: EncontroEditavel[] = [{ nome: "Chefe", multiplicador: null }];

  /** A lista da browiki sem as que já foram configuradas (as do catálogo, ainda sem versão, seguem na lista: D56). */
  readonly referenciasLivres = computed(() => {
    const ja = new Set(
      this.instancias()
        .filter((i) => i.vigente !== null)
        .map((i) => i.nome.toLowerCase()),
    );
    return this.referencia().filter((r) => !ja.has(r.nome.toLowerCase()));
  });

  async ngOnInit(): Promise<void> {
    await this.recarregar();
  }

  async recarregar(): Promise<void> {
    try {
      this.instancias.set(await firstValueFrom(this.http.get<Instancia[]>("/api/instancias")));
    } catch {
      this.acao.avisar("Não foi possível carregar as instâncias.");
    }
  }

  situacao(i: Instancia) {
    return situacaoInstancia(i);
  }
  classeSelo(i: Instancia): string {
    const t = situacaoInstancia(i).tipo;
    return t === "ativa" ? "selo-acento" : t === "sem-funcoes" ? "selo-alerta" : "";
  }
  tom(nome: string): string {
    return tomDe(nome);
  }
  pendencias(): string[] {
    const p = pendenciasVersao(this.encontros, []);
    if (this.nova.nome.trim().length < 2) p.unshift("Informe o nome da instância.");
    return p;
  }

  async abrirCadastro(): Promise<void> {
    this.nova = vazia();
    this.encontros = [{ nome: "Chefe", multiplicador: null }];
    this.cadastrando.set(true);
    if (this.referencia().length === 0) {
      try {
        this.referencia.set(
          await firstValueFrom(this.http.get<ReferenciaInstancia[]>("/api/instancias/referencia")),
        );
      } catch {
        // Sem a referência, o cadastro continua manual.
      }
    }
  }

  usarReferencia(r: ReferenciaInstancia | null): void {
    if (r !== null) this.nova = deReferencia(r);
  }

  async criar(): Promise<void> {
    if (this.pendencias().length > 0) return;
    const n = this.nova;
    const corpo = {
      nome: n.nome.trim(),
      nivelMinimo: n.nivelMinimo,
      retorno: n.retorno,
      modo: n.modo,
      dificuldade: n.dificuldade,
      requisito: n.requisito.trim() === "" ? null : n.requisito.trim(),
      premiacao: n.premiacao.trim() === "" ? null : n.premiacao.trim(),
      encontros: this.encontros.map((e) => ({
        nome: e.nome.trim(),
        multiplicadorCentesimos: Math.round((e.multiplicador ?? 0) * 100),
      })),
    };
    try {
      const criada = await firstValueFrom(this.http.post<Instancia>("/api/instancias", corpo));
      this.acao.avisar("Instância cadastrada. Agora cadastre as funções e os ranks.");
      this.cadastrando.set(false);
      await this.router.navigate(["/gestao/instancias", criada.id]);
    } catch (e) {
      this.acao.avisar(mensagemDeErro(e));
    }
  }
}
