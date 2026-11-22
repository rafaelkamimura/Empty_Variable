import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  type OnInit,
  signal,
} from "@angular/core";
import { MatStepperModule } from "@angular/material/stepper";
import { Router, RouterLink } from "@angular/router";
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
import { PassoDadosComponent } from "../componentes/passo-dados.component";
import { PassoDropsComponent } from "../componentes/passo-drops.component";
import { PassoEmprestimosComponent } from "../componentes/passo-emprestimos.component";
import { PassoParticipantesComponent } from "../componentes/passo-participantes.component";
import { PendenciasPassoComponent } from "../componentes/pendencias-passo.component";
import { PreviaRunComponent } from "../componentes/previa-run.component";
import {
  credoresDe,
  destinoDoRegistro,
  instanciaInicial,
  nomeDoParticipante,
  sugestoesPorCategoria,
  textoTeto,
} from "../data/assistente-run.modelos";
import { rascunhoDeRun } from "../data/detalhe-run.modelos";
import * as edicao from "../data/edicao-run";
import { pendentesDoRascunho, type RascunhoNag4eyes, rascunhoDeNag4eyes } from "../data/nag4eyes.modelos";
import { calcularPrevia, montarCorpo } from "../data/previa-run";
import { RunsApi } from "../data/runs.api";
import {
  ajustarAVersaoVigente,
  type Catalogos,
  type JogadorCadastro,
  novoRascunho,
  pendencias,
  ROTULO_STATUS,
  type RascunhoParticipante,
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
    RouterLink,
    AvisoComponent,
    BotaoComponent,
    EstadoComponent,
    EstadoProntoDirective,
    PaginaComponent,
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
  protected readonly pend = computed(() => {
    const p = pendencias(this.run(), this.catalogos());
    if (this.correcaoDe() !== null && this.motivo().trim().length < 3)
      p[1] = [...p[1], "Informe o motivo da correção."];
    return p;
  });
  protected readonly previa = computed(() => {
    const c = this.configMotor();
    return c === null ? null : calcularPrevia(this.run(), c, this.catalogos());
  });
  protected readonly podeEnviar = computed(() => {
    const p = this.pend();
    const pv = this.previa();
    return [p[1], p[2], p[3], p[4]].every((l) => l.length === 0) && pv !== null && pv.erros.length === 0;
  });
  protected readonly teto = computed(() => textoTeto(this.config()));
  protected readonly sugestoes = computed(() => sugestoesPorCategoria(this.config()));
  protected readonly resumoRevisao = computed(() => {
    const r = this.run();
    const instancia = this.instancias().find((i) => i.id === r.instanciaId)?.nome ?? "—";
    const encontro = this.encontros().find((e) => e.id === r.encontroId)?.nome ?? "—";
    return `${r.data} · ${instancia} · ${encontro} · ${ROTULO_STATUS[r.status]} · parâmetros v${this.config()?.versao ?? "?"}`;
  });

  /** "Nome (Jogador)" do participante, para o passo dos empréstimos. */
  protected readonly nomePersonagem = (p: RascunhoParticipante): string =>
    nomeDoParticipante(this.jogadores(), p);
  /** O credor não pode ser o próprio jogador do personagem (C3). */
  protected readonly credoresPara = (p: RascunhoParticipante): JogadorCadastro[] =>
    credoresDe(this.jogadores(), p);

  constructor() {
    // Os passos ficam lado a lado só quando o conteúdo é largo (container, não a janela: §6.6).
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
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
    try {
      this.classes.set(await this.api.classes(instanciaId));
      this.run.update((r) => edicao.comFuncoesPadrao(r, this.classes()));
    } catch (e) {
      this.acao.avisar(mensagemDeErro(e));
    }
  }

  protected async enviar(): Promise<void> {
    if (!this.podeEnviar() || this.enviando()) return;
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
