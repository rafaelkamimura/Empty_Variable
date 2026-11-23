import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  type OnInit,
  signal,
  viewChild,
} from "@angular/core";
import { MatStepper, MatStepperModule } from "@angular/material/stepper";
import { Router } from "@angular/router";
import { Acao } from "../../../core/acao";
import { mensagemDeErro } from "../../../core/modelos";
import { paraConfigMotor } from "../../../shared/dominio/cadastros";
import { recebeRun } from "../../../shared/dominio/instancias";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { EstadoComponent, EstadoProntoDirective } from "../../../shared/ui/estado/estado.component";
import { PaginaComponent } from "../../../shared/ui/pagina/pagina.component";
import { type Carregavel, carregando, comErro, pronto } from "../../../shared/utils/carregavel";
import { AcoesPassoComponent } from "../../../shared/ui/acoes-passo/acoes-passo.component";
import { PassoDadosComponent } from "../componentes/passo-dados.component";
import { PassoDropsComponent } from "../componentes/passo-drops.component";
import { PassoEmprestimosComponent } from "../componentes/passo-emprestimos.component";
import { PassoParticipantesComponent } from "../componentes/passo-participantes.component";
import { PendenciasComponent } from "../../../shared/ui/pendencias/pendencias.component";
import { PreviaRunComponent } from "../componentes/previa-run.component";
import {
  destinoDoRegistro,
  sugestoesPorCategoria,
  textoTeto,
  vistasEmprestimos,
} from "../data/assistente-run.modelos";
import { carregarAssistente, catalogosDe, type ContextoAssistente } from "../data/carga-assistente";
import * as edicao from "../data/edicao-run";
import { pendentesDoRascunho } from "../data/nag4eyes.modelos";
import { PASSOS_RUN, type PassoRun, pendencias } from "../data/pendencias-run";
import { calcularPrevia, montarCorpo } from "../data/previa-run";
import { RunsApi } from "../data/runs.api";
import { type Catalogos, novoRascunho, ROTULO_STATUS, type RascunhoRun } from "../data/runs.modelos";
import type { ComRascunhoNaoSalvo } from "../sair-do-assistente.guard";
import { focarPrimeiraPendencia, ValidacaoPassos } from "../../../shared/ui/formulario/validacao-passos";

/** Abaixo desta largura do conteúdo, os passos ficam um embaixo do outro. */
const LARGURA_PASSOS_LADO_A_LADO = 700;
const SEM_CATALOGOS: Catalogos = { jogadores: [], classes: [], instancias: [], itens: [] };

/**
 * Assistente de run (T-20) em 5 passos: dados → participantes → empréstimos → drops → revisão. A
 * prévia usa o mesmo motor da API (@betel/scoring). Com `id`, abre em modo correção (US-07), com
 * os parâmetros da run original (D17). Com `?rascunho=<id>`, pré-preenche com o rascunho do
 * nag4eyes e o envio o confirma. O que foi carregado fica num só `Carregavel<ContextoAssistente>`;
 * o rascunho, num signal à parte, editado sem mutação (edicao-run.ts).
 */
@Component({
  selector: "app-assistente-run-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatStepperModule,
    AvisoComponent,
    BotaoComponent,
    EstadoComponent,
    EstadoProntoDirective,
    PaginaComponent,
    AcoesPassoComponent,
    PassoDadosComponent,
    PassoDropsComponent,
    PassoEmprestimosComponent,
    PassoParticipantesComponent,
    PendenciasComponent,
    PreviaRunComponent,
  ],
  host: { "(window:beforeunload)": "avisarAntesDeSair($event)" },
  templateUrl: "./assistente-run.page.html",
  styleUrl: "./assistente-run.page.scss",
})
export class AssistenteRunPage implements OnInit, ComRascunhoNaoSalvo {
  private readonly api = inject(RunsApi);
  private readonly acao = inject(Acao);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Id da run a corrigir (rota /gestao/runs/:id/corrigir). */
  readonly id = input<string | undefined>();
  /** Id do rascunho do nag4eyes que pré-preenche a run (?rascunho=...). */
  readonly rascunho = input<string | undefined>();

  /** Funções de edição (edicao-run.ts), usadas no template com editar(). */
  protected readonly edicao = edicao;
  protected readonly carga = signal<Carregavel<ContextoAssistente>>(carregando());
  protected readonly run = signal<RascunhoRun>(novoRascunho());
  protected readonly motivo = signal("");
  protected readonly estreito = signal(false);
  protected readonly erroEnvio = signal<string | null>(null);
  protected readonly enviando = signal(false);
  /** Erro ao carregar as classes da instância escolhida. */
  protected readonly erroClasses = signal<string | null>(null);
  private readonly stepper = viewChild(MatStepper);
  private versaoClasses = 0;
  /** O rascunho como carregou (JSON), para saber se a pessoa mexeu; null antes de carregar e depois de registrar. */
  private readonly inicial = signal<string | null>(null);

  private readonly ctx = computed(() => {
    const c = this.carga();
    return c.estado === "pronto" ? c.dados : null;
  });
  private readonly catalogos = computed(() => {
    const c = this.ctx();
    return c === null ? SEM_CATALOGOS : catalogosDe(c);
  });
  private readonly config = computed(() => this.ctx()?.config ?? null);
  protected readonly correcaoDe = computed(() => this.ctx()?.correcaoDe ?? null);
  protected readonly pendentesRascunho = computed(() => {
    const o = this.ctx()?.origem;
    return o ? pendentesDoRascunho(o) : [];
  });
  protected readonly subtitulo = computed(() =>
    this.correcaoDe()
      ? `Os lançamentos da run original serão estornados e esta versão será registrada no lugar, com os parâmetros da run original (v${this.config()?.versao ?? "?"}).`
      : "Registre a run em cinco passos; a revisão mostra os pontos exatamente como serão gravados.",
  );
  protected readonly classesAtivas = computed(() => this.catalogos().classes.filter((c) => c.ativa));
  protected readonly itensAtivos = computed(() => this.catalogos().itens.filter((i) => i.ativo));
  /** CT-146: só instâncias ativas e com funções recebem run. */
  protected readonly instanciasDisponiveis = computed(() => this.catalogos().instancias.filter(recebeRun));
  protected readonly encontros = computed(
    () => this.catalogos().instancias.find((i) => i.id === this.run().instanciaId)?.vigente?.encontros ?? [],
  );
  /** A pontuação do Betelgeuse (informativa) só faz sentido nos encontros do Betelgeuse. */
  protected readonly ehBetelgeuse = computed(
    () =>
      this.encontros()
        .find((e) => e.id === this.run().encontroId)
        ?.codigo?.startsWith("BETELGEUSE") ?? false,
  );
  protected readonly pend = computed(() =>
    pendencias(this.run(), this.catalogos(), this.correcaoDe() === null ? null : this.motivo()),
  );
  protected readonly validacao = new ValidacaoPassos(this.pend, PASSOS_RUN);
  protected readonly previa = computed(() => {
    const c = this.config();
    return c === null ? null : calcularPrevia(this.run(), paraConfigMotor(c), this.catalogos());
  });
  protected readonly podeEnviar = computed(() => {
    const p = this.pend();
    const pv = this.previa();
    return PASSOS_RUN.every((passo) => p[passo].length === 0) && pv !== null && pv.erros.length === 0;
  });
  protected readonly teto = computed(() => textoTeto(this.config()));
  protected readonly sugestoes = computed(() => sugestoesPorCategoria(this.config()));
  protected readonly resumoRevisao = computed(() => {
    const r = this.run();
    const instancia = this.catalogos().instancias.find((i) => i.id === r.instanciaId)?.nome ?? "—";
    const encontro = this.encontros().find((e) => e.id === r.encontroId)?.nome ?? "—";
    return `${r.data} · ${instancia} · ${encontro} · ${ROTULO_STATUS[r.status]} · parâmetros v${this.config()?.versao ?? "?"}`;
  });
  /** Participantes como o passo dos empréstimos mostra (nome e credores prontos). */
  protected readonly vistasEmprestimos = computed(() =>
    vistasEmprestimos(this.catalogos().jogadores, this.run().participantes),
  );
  /** Há alteração ainda não registrada (para a guarda de saída e o beforeunload). */
  readonly alterado = computed(() => {
    const inicial = this.inicial();
    return inicial !== null && (JSON.stringify(this.run()) !== inicial || this.motivo().trim() !== "");
  });

  constructor() {
    // Os passos ficam lado a lado só quando o conteúdo é largo (container, não a janela: §6.6).
    const observador = new ResizeObserver(([e]) =>
      this.estreito.set((e?.contentRect.width ?? 0) < LARGURA_PASSOS_LADO_A_LADO),
    );
    observador.observe(this.host);
    inject(DestroyRef).onDestroy(() => observador.disconnect());
  }

  ngOnInit(): void {
    void this.iniciar();
  }

  /** Carrega catálogos, parâmetros e o rascunho inicial (novo, de correção ou do nag4eyes). */
  async iniciar(): Promise<void> {
    this.carga.set(carregando());
    this.inicial.set(null);
    try {
      const r = await carregarAssistente(this.api, { correcaoDe: this.id(), rascunhoId: this.rascunho() });
      if (!r.ok) {
        this.carga.set(comErro(r.mensagem));
        return;
      }
      this.run.set(r.run);
      this.inicial.set(JSON.stringify(r.run));
      this.carga.set(pronto(r.contexto));
    } catch (e) {
      this.carga.set(comErro(mensagemDeErro(e)));
    }
  }

  protected mudar(parte: Partial<RascunhoRun>): void {
    this.run.update((r) => ({ ...r, ...parte }));
  }

  /** Aplica uma das funções de edicao-run.ts ao rascunho. */
  protected editar<A extends unknown[]>(fn: (r: RascunhoRun, ...args: A) => RascunhoRun, ...args: A): void {
    this.run.update((r) => fn(r, ...args));
  }

  protected escolherClasse(i: number, classeId: string): void {
    this.run.update((r) => edicao.comClasse(r, i, classeId, this.catalogos().classes));
  }

  /** Trocar de instância troca encontros e funções: cada participante volta à função padrão da classe. */
  protected async escolherInstancia(instanciaId: string): Promise<void> {
    const inst = this.catalogos().instancias.find((i) => i.id === instanciaId);
    this.mudar({ instanciaId, encontroId: inst?.vigente?.encontros[0]?.id ?? null });
    await this.carregarClasses(instanciaId);
  }

  /**
   * Classes (com as funções da versão vigente) da instância escolhida. Só a resposta do pedido
   * mais recente vale. Enquanto carrega ou se der erro, a lista fica vazia: assim nenhum
   * participante fica com uma função de outra instância, e as pendências impedem o registro.
   */
  protected async carregarClasses(instanciaId: string): Promise<void> {
    const minha = ++this.versaoClasses;
    this.trocarClasses([]);
    this.erroClasses.set(null);
    try {
      const classes = await this.api.classes(instanciaId);
      if (minha === this.versaoClasses) this.trocarClasses(classes);
    } catch (e) {
      if (minha === this.versaoClasses) this.erroClasses.set(mensagemDeErro(e));
    }
  }

  protected recarregarClasses(): void {
    const id = this.run().instanciaId;
    if (id !== null) void this.carregarClasses(id);
  }

  private trocarClasses(classes: ContextoAssistente["classes"]): void {
    const c = this.ctx();
    if (c !== null) this.carga.set(pronto({ ...c, classes }));
    this.run.update((r) => edicao.comFuncoesPadrao(r, classes));
  }

  /**
   * Próximo: sem pendência, avança. Com pendência, não avança: mostra o erro em cada campo do passo
   * e leva o foco ao primeiro campo inválido (§6.4).
   */
  protected avancar(passo: PassoRun): void {
    const lista = this.pend()[passo];
    if (lista.length === 0) {
      this.stepper()?.next();
      return;
    }
    this.validacao.tentar(passo);
    const campos = lista.map((p) => p.campo);
    afterNextRender(() => focarPrimeiraPendencia(this.host, campos, passo), { injector: this.injector });
  }

  protected async enviar(): Promise<void> {
    const c = this.ctx();
    if (this.enviando() || c === null) return;
    if (!this.podeEnviar()) {
      this.erroEnvio.set("Há pendências na run: confira os passos anteriores e a prévia.");
      return;
    }
    this.erroEnvio.set(null);
    this.enviando.set(true);
    const destino = destinoDoRegistro(c.correcaoDe, this.motivo(), c.origem);
    try {
      const resp = await this.api.registrar(destino, montarCorpo(this.run(), this.catalogos()));
      const aviso = resp.avisosReducao.length > 0 ? " Houve redução proporcional de empréstimos." : "";
      this.acao.avisar(`${c.correcaoDe === null ? "Run registrada" : "Correção registrada"}.${aviso}`);
      // Registrado: sair da tela não pede mais confirmação.
      this.inicial.set(null);
      await this.router.navigate(["/gestao/runs", resp.runId]);
    } catch (e) {
      this.erroEnvio.set(mensagemDeErro(e));
    } finally {
      this.enviando.set(false);
    }
  }

  /** Fechar ou recarregar a aba com alteração não registrada: o navegador pergunta. */
  protected avisarAntesDeSair(evento: BeforeUnloadEvent): void {
    if (this.alterado()) evento.preventDefault();
  }
}
