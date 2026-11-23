import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Acao } from "../../../core/acao";
import { AuthService } from "../../../core/auth.service";
import { mensagemDeErro } from "../../../core/modelos";
import { telaLiberada } from "../../../core/telas-liberadas";
import { type Carregavel, carregando, comErro, pronto } from "../../../shared/utils/carregavel";
import { PontosPipe } from "../../../shared/pipes/pontos.pipe";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { EstadoComponent, EstadoProntoDirective } from "../../../shared/ui/estado/estado.component";
import { PaginaComponent } from "../../../shared/ui/pagina/pagina.component";
import { VazioComponent } from "../../../shared/ui/vazio/vazio.component";
import { TabelaDirective } from "../../../shared/ui/tabela/tabela.directive";
import { CartaoParticipacaoComponent } from "../componentes/cartao-participacao.component";
import { DropsRunComponent } from "../componentes/drops-run.component";
import type { DetalheRun, ResultadoDropsRun } from "../data/detalhe-run.modelos";
import { ROTULO_TIPO_LANCAMENTO } from "../../../shared/dominio/lancamento";
import { RunsApi } from "../data/runs.api";
import { ROTULO_STATUS } from "../data/runs.modelos";

/** A data da run é um dia, gravado à meia-noite UTC. */
const DATA_RUN = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

/** Detalhe da run (/gestao/runs/:id, T-21): party, empréstimos, drops, lançamentos e a correção (US-07). */
@Component({
  selector: "app-run-detalhe-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    PontosPipe,
    RouterLink,
    AvisoComponent,
    BotaoComponent,
    EstadoComponent,
    EstadoProntoDirective,
    PaginaComponent,
    TabelaDirective,
    VazioComponent,
    CartaoParticipacaoComponent,
    DropsRunComponent,
  ],
  templateUrl: "./run-detalhe.page.html",
  styles: `
    section {
      display: grid;
      gap: var(--esp-3);
    }
    h2 {
      margin: 0;
      font-size: var(--fs-l);
      font-weight: 600;
      color: var(--texto-forte);
    }
    h2 small {
      font-size: var(--fs-s);
      font-weight: 400;
      color: var(--texto-suave);
    }
    p {
      margin: 0;
      color: var(--texto);
    }
    .linha-resumo {
      color: var(--texto-suave);
    }
    .acoes {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-2);
    }
    .grade {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
      gap: var(--esp-3);
    }
    .negativo {
      color: var(--erro);
    }
  `,
})
export class RunDetalhePage {
  private readonly api = inject(RunsApi);
  private readonly acao = inject(Acao);
  protected readonly ehAdmin = inject(AuthService).ehAdmin;
  /** A tela de correção ainda não foi liberada: sem ela, o botão só levaria ao início. */
  protected readonly correcaoLiberada = telaLiberada("/gestao/runs/:id/corrigir");

  /** Id da run, vindo da rota. */
  readonly id = input.required<string>();
  protected readonly rotuloStatus = ROTULO_STATUS;
  protected readonly rotuloTipo = ROTULO_TIPO_LANCAMENTO;
  protected readonly estado = signal<Carregavel<DetalheRun>>(carregando());
  protected readonly lancando = signal(false);
  protected readonly resultadoDrops = signal<ResultadoDropsRun | null>(null);
  private readonly run = computed(() => {
    const e = this.estado();
    return e.estado === "pronto" ? e.dados : null;
  });
  /** "Run" enquanto carrega ou dá erro; "Run de 20/11/2026" quando os dados chegam. */
  protected readonly titulo = computed(() => {
    const r = this.run();
    return r === null ? "Run" : `Run de ${DATA_RUN.format(new Date(r.data))}`;
  });
  protected readonly podeCorrigir = computed(
    () => this.correcaoLiberada && this.run() !== null && this.run()?.status !== "ESTORNADA",
  );
  protected readonly dropsPendentes = computed(
    () => (this.run()?.drops ?? []).filter((d) => !d.lancadoNoEstoque).length,
  );
  protected readonly somaLancamentos = computed(() =>
    (this.run()?.lancamentos ?? []).reduce((a, l) => a + l.valor, 0),
  );

  constructor() {
    // Recarrega ao navegar entre a run original e a correção (mesma página, id diferente).
    effect(() => {
      const id = this.id();
      this.estado.set(carregando());
      this.resultadoDrops.set(null);
      void this.carregar(id);
    });
  }

  private versao = 0;

  async carregar(id: string): Promise<void> {
    const minha = ++this.versao;
    try {
      const run = await this.api.detalhe(id);
      if (minha === this.versao) this.estado.set(pronto(run));
    } catch (e) {
      if (minha === this.versao) this.estado.set(comErro(mensagemDeErro(e)));
    }
  }

  /** D18: lança no estoque do grupo os drops ainda não lançados (cada drop uma vez). */
  protected async lancarDrops(id: string): Promise<void> {
    if (this.lancando()) return;
    this.lancando.set(true);
    try {
      const r = await this.api.lancarDrops(id);
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
}
