import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Acao } from "../../../core/acao";
import { Confirmacao } from "../../../core/confirmacao";
import { mensagemDeErro } from "../../../core/modelos";
import type { Instancia } from "../../../shared/dominio/instancias";
import { type Carregavel, carregando, comErro, pronto } from "../../../shared/utils/carregavel";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { EstadoComponent, EstadoProntoDirective } from "../../../shared/ui/estado/estado.component";
import { PaginaComponent } from "../../../shared/ui/pagina/pagina.component";
import { TabelaRascunhosComponent } from "../componentes/tabela-rascunhos.component";
import { TabelaRunsComponent } from "../componentes/tabela-runs.component";
import type { RunResumo } from "../data/detalhe-run.modelos";
import type { ResumoRascunhoNag4eyes } from "../data/nag4eyes.modelos";
import { RunsApi } from "../data/runs.api";
import { ROTULO_STATUS } from "../data/runs.modelos";
import { valorDoEvento } from "../../../shared/utils/evento";

const STATUS_FILTRO = ["CONCLUIDA", "FALHA_CHEFE", "ABORTADA", "ESTORNADA"] as const;

/** Runs (/gestao/runs, T-21): rascunhos do nag4eyes para revisar e as runs, com filtros (D43). */
@Component({
  selector: "app-runs-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AvisoComponent,
    RouterLink,
    BotaoComponent,
    CampoComponent,
    CampoControleDirective,
    EstadoComponent,
    EstadoProntoDirective,
    PaginaComponent,
    TabelaRascunhosComponent,
    TabelaRunsComponent,
  ],
  template: `
    <ui-pagina titulo="Runs" subtitulo="Cada run registrada gera os pontos de quem participou.">
      <a uiBotao variante="principal" slot="acao" routerLink="/gestao/runs/nova">Registrar run</a>

      @if (rascunhos().length > 0) {
        <section class="secao" data-testid="runs-rascunhos" aria-labelledby="titulo-rascunhos">
          <h2 id="titulo-rascunhos">Rascunhos do nag4eyes</h2>
          <ui-aviso tom="info">
            Grupos encerrados no Discord. Revise para registrar a run com os participantes já preenchidos, ou
            descarte se o grupo não deve pontuar.
          </ui-aviso>
          <app-tabela-rascunhos [rascunhos]="rascunhos()" (descartar)="descartar($event)" />
        </section>
      }

      <form class="filtros" (submit)="$event.preventDefault(); carregar()">
        <ui-campo rotulo="De">
          <input uiCampo type="date" [value]="dataDe()" (input)="dataDe.set(valor($event))" />
        </ui-campo>
        <ui-campo rotulo="Até">
          <input uiCampo type="date" [value]="dataAte()" (input)="dataAte.set(valor($event))" />
        </ui-campo>
        @if (instancias().length > 1) {
          <ui-campo rotulo="Instância">
            <select uiCampo (change)="instanciaId.set(valor($event))">
              <option value="" [selected]="instanciaId() === ''">Todas</option>
              @for (i of instancias(); track i.id) {
                <option [value]="i.id" [selected]="instanciaId() === i.id">{{ i.nome }}</option>
              }
            </select>
          </ui-campo>
        }
        <ui-campo rotulo="Status">
          <select uiCampo (change)="status.set(valor($event))">
            <option value="" [selected]="status() === ''">Todos</option>
            @for (s of statusFiltro; track s) {
              <option [value]="s" [selected]="status() === s">{{ rotuloStatus[s] }}</option>
            }
          </select>
        </ui-campo>
        <button uiBotao tipo="submit">Filtrar</button>
      </form>

      <ui-estado
        [valor]="estado()"
        mensagemVazio="Nenhuma run encontrada."
        [estaVazio]="semRuns"
        (tentarNovamente)="carregar()"
      >
        <ng-template uiEstadoPronto [tipo]="estado()" let-runs>
          <app-tabela-runs data-testid="runs-lista" [runs]="runs" />
        </ng-template>
      </ui-estado>
    </ui-pagina>
  `,
  styles: `
    .secao {
      display: grid;
      gap: var(--esp-2);
    }
    h2 {
      margin: 0;
      font-size: var(--fs-l);
      font-weight: 600;
      color: var(--texto-forte);
    }
    .filtros {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--esp-2) var(--esp-3);
    }
    .filtros ui-campo {
      flex: 1 1 150px;
      max-width: 220px;
    }
  `,
})
export class RunsPage {
  private readonly api = inject(RunsApi);
  private readonly acao = inject(Acao);
  private readonly confirmacao = inject(Confirmacao);

  protected readonly statusFiltro = STATUS_FILTRO;
  protected readonly rotuloStatus = ROTULO_STATUS;
  protected readonly estado = signal<Carregavel<RunResumo[]>>(carregando());
  protected readonly rascunhos = signal<ResumoRascunhoNag4eyes[]>([]);
  protected readonly instancias = signal<Instancia[]>([]);
  protected readonly instanciaId = signal("");
  protected readonly dataDe = signal("");
  protected readonly dataAte = signal("");
  protected readonly status = signal("");
  protected readonly semRuns = (runs: RunResumo[]) => runs.length === 0;

  constructor() {
    // Sem a lista de instâncias, o filtro por instância só não aparece.
    this.api.instancias().then(
      (lista) => this.instancias.set(lista),
      () => undefined,
    );
    void this.carregar();
    void this.carregarRascunhos();
  }

  private versao = 0;

  /** Carrega as runs com os filtros; só a resposta do pedido mais recente vale. */
  async carregar(): Promise<void> {
    const minha = ++this.versao;
    if (this.estado().estado !== "pronto") this.estado.set(carregando());
    try {
      const runs = await this.api.runs({
        dataDe: this.dataDe(),
        dataAte: this.dataAte(),
        instanciaId: this.instanciaId(),
        status: this.status(),
      });
      if (minha === this.versao) this.estado.set(pronto(runs));
    } catch (e) {
      if (minha === this.versao) this.estado.set(comErro(mensagemDeErro(e)));
    }
  }

  /** Rascunhos pendentes do nag4eyes. Sem eles (ou sem a integração), a seção some. */
  private async carregarRascunhos(): Promise<void> {
    try {
      this.rascunhos.set(await this.api.rascunhosPendentes());
    } catch {
      this.rascunhos.set([]);
    }
  }

  protected readonly valor = valorDoEvento;

  protected async descartar(r: ResumoRascunhoNag4eyes): Promise<void> {
    const sim = await this.confirmacao.perguntar({
      titulo: "Descartar este rascunho?",
      descricao: "O grupo não vai virar run, e ninguém recebe pontos por ele.",
      confirmar: "Descartar rascunho",
      perigo: true,
    });
    if (!sim) return;
    if (await this.acao.executar(() => this.api.descartarRascunho(r.id), "Rascunho descartado.")) {
      await this.carregarRascunhos();
    }
  }
}
