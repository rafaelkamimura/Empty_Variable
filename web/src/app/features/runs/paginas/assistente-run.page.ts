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
import type { ConfigPontuacao } from "@betel/scoring";
import { Acao } from "../../../core/acao";
import { mensagemDeErro } from "../../../core/modelos";
import {
  type Classe,
  type ItemCatalogo,
  paraConfigMotor,
  type VersaoParametros,
} from "../../../shared/dominio/cadastros";
import { type Instancia, recebeRun } from "../../../shared/dominio/instancias";
import { type Carregavel, carregando, comErro, pronto } from "../../../shared/utils/carregavel";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { EstadoComponent, EstadoProntoDirective } from "../../../shared/ui/estado/estado.component";
import { PaginaComponent } from "../../../shared/ui/pagina/pagina.component";
import { AcoesPassoComponent } from "../componentes/acoes-passo.component";
import { PassoDadosComponent } from "../componentes/passo-dados.component";
import { PassoDropsComponent } from "../componentes/passo-drops.component";
import { PassoEmprestimosComponent } from "../componentes/passo-emprestimos.component";
import { PassoParticipantesComponent } from "../componentes/passo-participantes.component";
import { PendenciasPassoComponent } from "../componentes/pendencias-passo.component";
import { PreviaRunComponent } from "../componentes/previa-run.component";
import {
  destinoDoRegistro,
  instanciaInicial,
  sugestoesPorCategoria,
  textoTeto,
  vistasEmprestimos,
} from "../data/assistente-run.modelos";
import { rascunhoDeRun } from "../data/detalhe-run.modelos";
import * as edicao from "../data/edicao-run";
import { pendentesDoRascunho, type RascunhoNag4eyes, rascunhoDeNag4eyes } from "../data/nag4eyes.modelos";
import { PASSOS_RUN, type PassoRun, pendencias } from "../data/pendencias-run";
import { calcularPrevia, montarCorpo } from "../data/previa-run";
import { RunsApi } from "../data/runs.api";
import { focarPrimeiraPendencia, ValidacaoPassos } from "./validacao-passos";
import {
  ajustarAVersaoVigente,
  type Catalogos,
  type JogadorCadastro,
  novoRascunho,
  ROTULO_STATUS,
  type RascunhoRun,
} from "../data/runs.modelos";

/** Abaixo desta largura do conteúdo, os passos ficam um embaixo do outro. */
const LARGURA_PASSOS_LADO_A_LADO = 700;

/**
 * Assistente de run (T-20) em 5 passos: dados → participantes → empréstimos → drops → revisão. A
 * prévia usa o mesmo motor da API (@betel/scoring). Com `id`, abre em modo correção (US-07), com
 * os parâmetros da run original (D17). Com `?rascunho=<id>`, pré-preenche com o rascunho do
 * nag4eyes e o envio o confirma. O rascunho fica num signal e é editado sem mutação (edicao-run.ts).
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
    PendenciasPassoComponent,
    PreviaRunComponent,
  ],
  templateUrl: "./assistente-run.page.html",
  styleUrl: "./assistente-run.page.scss",
})
export class AssistenteRunPage implements OnInit {
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

  protected readonly carga = signal<Carregavel<boolean>>(carregando());
  protected readonly estreito = signal(false);
  protected readonly erroEnvio = signal<string | null>(null);
  protected readonly enviando = signal(false);
  protected readonly jogadores = signal<JogadorCadastro[]>([]);
  private readonly instancias = signal<Instancia[]>([]);
  private readonly classes = signal<Classe[]>([]);
  private readonly itens = signal<ItemCatalogo[]>([]);
  private readonly config = signal<VersaoParametros | null>(null);
  protected readonly correcaoDe = signal<string | null>(null);
  protected readonly origemRascunho = signal<RascunhoNag4eyes | null>(null);
  protected readonly run = signal<RascunhoRun>(novoRascunho());
  protected readonly motivo = signal("");
  private readonly stepper = viewChild(MatStepper);
  /** Erro ao carregar as classes da instância escolhida. */
  protected readonly erroClasses = signal<string | null>(null);
  private versaoClasses = 0;

  protected readonly pendentesRascunho = computed(() => {
    const o = this.origemRascunho();
    return o === null ? [] : pendentesDoRascunho(o);
  });
  protected readonly subtitulo = computed(() =>
    this.correcaoDe()
      ? `Os lançamentos da run original serão estornados e esta versão será registrada no lugar, com os parâmetros da run original (v${this.config()?.versao ?? "?"}).`
      : "Registre a run em cinco passos; a revisão mostra os pontos exatamente como serão gravados.",
  );
  protected readonly classesAtivas = computed(() => this.classes().filter((c) => c.ativa));
  protected readonly itensAtivos = computed(() => this.itens().filter((i) => i.ativo));
  /** CT-146: só instâncias ativas e com funções recebem run. */
  protected readonly instanciasDisponiveis = computed(() => this.instancias().filter(recebeRun));
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
  protected readonly encontros = computed(
    () => this.instancias().find((i) => i.id === this.run().instanciaId)?.vigente?.encontros ?? [],
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
  protected readonly validacao = new ValidacaoPassos(this.pend);
  protected readonly previa = computed(() => {
    const c = this.configMotor();
    return c === null ? null : calcularPrevia(this.run(), c, this.catalogos());
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
    const instancia = this.instancias().find((i) => i.id === r.instanciaId)?.nome ?? "—";
    const encontro = this.encontros().find((e) => e.id === r.encontroId)?.nome ?? "—";
    return `${r.data} · ${instancia} · ${encontro} · ${ROTULO_STATUS[r.status]} · parâmetros v${this.config()?.versao ?? "?"}`;
  });

  /** Participantes como o passo dos empréstimos mostra (nome e credores prontos). */
  protected readonly vistasEmprestimos = computed(() =>
    vistasEmprestimos(this.jogadores(), this.run().participantes),
  );

  constructor() {
    // Os passos ficam lado a lado só quando o conteúdo é largo (container, não a janela: §6.6).
    const host = this.host;
    const observador = new ResizeObserver(([e]) =>
      this.estreito.set((e?.contentRect.width ?? 0) < LARGURA_PASSOS_LADO_A_LADO),
    );
    observador.observe(host);
    inject(DestroyRef).onDestroy(() => observador.disconnect());
  }

  ngOnInit(): void {
    void this.iniciar();
  }

  /** Carrega os catálogos e prepara o rascunho (novo, de correção ou do nag4eyes). */
  async iniciar(): Promise<void> {
    this.carga.set(carregando());
    try {
      const [jogadores, instancias, itens, versoes] = await Promise.all([
        this.api.jogadores(),
        this.api.instancias(),
        this.api.itens(),
        this.api.versoesParametros(),
      ]);
      this.jogadores.set(jogadores);
      this.instancias.set(instancias);
      this.itens.set(itens);
      const id = this.id();
      const erro =
        id === undefined ? await this.prepararNova(versoes) : await this.prepararCorrecao(id, versoes);
      if (erro === null && this.config() === null) {
        this.carga.set(comErro("Nenhuma versão de parâmetros encontrada."));
      } else {
        this.carga.set(erro === null ? pronto(true) : comErro(erro));
      }
    } catch (e) {
      this.carga.set(comErro(mensagemDeErro(e)));
    }
  }

  /** Run nova, talvez a partir de um rascunho do nag4eyes. Devolve o erro, ou null. */
  private async prepararNova(versoes: VersaoParametros[]): Promise<string | null> {
    this.config.set(versoes[0] ?? null);
    const idRascunho = this.rascunho();
    let origem: RascunhoNag4eyes | null = null;
    if (idRascunho) {
      origem = await this.api.rascunho(idRascunho);
      if (origem.status !== "PENDENTE") return "Este rascunho já foi confirmado ou descartado.";
      this.origemRascunho.set(origem);
    }
    const inicial = instanciaInicial(this.instanciasDisponiveis(), origem);
    if (inicial === undefined)
      return "Nenhuma instância ativa com funções. Cadastre uma em Gestão → Instâncias.";
    const base = novoRascunho(inicial.id, inicial.vigente?.encontros[0]?.id ?? null);
    this.run.set(origem === null ? base : rascunhoDeNag4eyes(origem, base));
    this.classes.set(await this.api.classes(inicial.id));
    return null;
  }

  /** Correção (US-07): a run como foi registrada, na versão vigente da instância (D46). */
  private async prepararCorrecao(id: string, versoes: VersaoParametros[]): Promise<string | null> {
    const run = await this.api.detalhe(id);
    if (run.status === "ESTORNADA") return "Esta run já foi corrigida.";
    this.correcaoDe.set(id);
    this.classes.set(await this.api.classes(run.versaoInstancia.instancia.id));
    this.run.set(
      ajustarAVersaoVigente(rascunhoDeRun(run), this.catalogos(), {
        encontro: run.encontro.nome,
        funcoes: new Map(run.participacoes.map((p) => [p.funcao.id, p.funcao.nome])),
      }),
    );
    // D17: a correção usa os parâmetros da run original.
    this.config.set(versoes.find((v) => v.id === run.config.id) ?? null);
    return null;
  }

  protected mudar(parte: Partial<RascunhoRun>): void {
    this.run.update((r) => ({ ...r, ...parte }));
  }

  /** Aplica uma das funções de edicao-run.ts ao rascunho. */
  protected editar<A extends unknown[]>(fn: (r: RascunhoRun, ...args: A) => RascunhoRun, ...args: A): void {
    this.run.update((r) => fn(r, ...args));
  }

  protected escolherClasse(i: number, classeId: string): void {
    this.run.update((r) => edicao.comClasse(r, i, classeId, this.classes()));
  }

  /** Trocar de instância troca encontros e funções: cada participante volta à função padrão da classe. */
  protected async escolherInstancia(instanciaId: string): Promise<void> {
    const inst = this.instancias().find((i) => i.id === instanciaId);
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
    this.classes.set([]);
    this.erroClasses.set(null);
    this.run.update((r) => edicao.comFuncoesPadrao(r, []));
    try {
      const classes = await this.api.classes(instanciaId);
      if (minha !== this.versaoClasses) return;
      this.classes.set(classes);
      this.run.update((r) => edicao.comFuncoesPadrao(r, classes));
    } catch (e) {
      if (minha === this.versaoClasses) this.erroClasses.set(mensagemDeErro(e));
    }
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
    afterNextRender(
      () =>
        focarPrimeiraPendencia(
          this.host,
          lista.map((p) => p.campo),
          passo,
        ),
      { injector: this.injector },
    );
  }

  protected recarregarClasses(): void {
    const id = this.run().instanciaId;
    if (id !== null) void this.carregarClasses(id);
  }

  protected async enviar(): Promise<void> {
    if (this.enviando()) return;
    if (!this.podeEnviar()) {
      this.erroEnvio.set("Há pendências na run: confira os passos anteriores e a prévia.");
      return;
    }
    this.erroEnvio.set(null);
    this.enviando.set(true);
    const alvo = this.correcaoDe();
    const destino = destinoDoRegistro(alvo, this.motivo(), this.origemRascunho());
    try {
      const resp = await this.api.registrar(destino, montarCorpo(this.run(), this.catalogos()));
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
