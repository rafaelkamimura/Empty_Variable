import { DatePipe } from "@angular/common";
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
} from "@angular/core";
import { MatStepper, MatStepperModule } from "@angular/material/stepper";
import { AcoesPassoComponent } from "../../../shared/ui/acoes-passo/acoes-passo.component";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { estreitoAbaixoDe } from "../../../shared/ui/formulario/estreito";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { PendenciasComponent } from "../../../shared/ui/pendencias/pendencias.component";
import { valorDoEvento } from "../../../shared/utils/evento";
import { campoQueSaiu } from "../../../shared/ui/formulario/foco";
import { focarPrimeiraPendencia, ValidacaoPassos } from "../../../shared/ui/formulario/validacao-passos";
import {
  type OpcoesGrupos,
  partidaDe,
  resumoReservas,
  TOTAL_VAGAS,
  type TipoReserva,
} from "../data/grupos.modelos";
import {
  campoGrupo,
  comNovaReserva,
  comReserva,
  novoRascunhoGrupo,
  PASSOS_GRUPO,
  type PassoGrupo,
  pendenciasGrupo,
  type RascunhoGrupo,
  type ReservaRascunho,
  reservasDoTipo,
  semReserva,
  vagasLivres,
} from "../data/novo-grupo.modelos";
import { ReservasGrupoComponent } from "./reservas-grupo.component";

/** Abaixo desta largura do conteúdo, os passos ficam um embaixo do outro. */
const LARGURA_PASSOS_LADO_A_LADO = 700;
const VAZIO = JSON.stringify(novoRascunhoGrupo());

/**
 * Assistente de criação de grupo: instância → obrigatórias → secundárias → data e hora → revisão.
 * Cada "Próximo" fica sempre clicável: com pendência, mostra o erro nos campos e leva o foco ao
 * primeiro inválido (§6.4). Quem usa recebe o rascunho em `criar` e faz a chamada.
 */
@Component({
  selector: "app-novo-grupo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    MatStepperModule,
    AcoesPassoComponent,
    AvisoComponent,
    CampoComponent,
    CampoControleDirective,
    PendenciasComponent,
    ReservasGrupoComponent,
  ],
  templateUrl: "./novo-grupo.component.html",
  styles: `
    :host {
      display: block;
    }
    .passo {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--esp-4);
      padding-top: var(--esp-3);
    }
    h3 {
      margin: 0;
      font-size: var(--fs-l);
      color: var(--texto-forte);
    }
    .escolhidas {
      padding: var(--esp-3);
      border: 1px solid var(--borda);
      border-radius: var(--raio-m);
      background: var(--cartao);
      color: var(--texto-suave);
      overflow-wrap: anywhere;
    }
    .resumo {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--esp-1) var(--esp-3);
      margin: 0;
    }
    dt {
      color: var(--texto-suave);
    }
    dd {
      margin: 0 0 var(--esp-2);
      overflow-wrap: anywhere;
    }
    @container conteudo (min-width: 520px) {
      .resumo {
        grid-template-columns: minmax(0, 10rem) minmax(0, 1fr);
      }
      dd {
        margin: 0;
      }
    }
  `,
})
export class NovoGrupoComponent {
  readonly opcoes = input.required<OpcoesGrupos>();
  readonly salvando = input(false);
  readonly erroEnvio = input<string | null>(null);
  readonly criar = output<RascunhoGrupo>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly stepper = viewChild(MatStepper);
  protected readonly campo = campoGrupo;
  protected readonly totalVagas = TOTAL_VAGAS;
  protected readonly valor = valorDoEvento;
  /** Os passos ficam lado a lado só quando o conteúdo é largo. */
  protected readonly estreito = estreitoAbaixoDe(LARGURA_PASSOS_LADO_A_LADO);
  protected readonly rascunho = signal<RascunhoGrupo>(novoRascunhoGrupo());
  /** Relógio das pendências (data no futuro): atualizado a cada tentativa de avançar. */
  private readonly agora = signal(Date.now());
  protected readonly pend = computed(() => pendenciasGrupo(this.rascunho(), this.agora()));
  protected readonly validacao = new ValidacaoPassos(this.pend, PASSOS_GRUPO);
  /** A pessoa já preencheu algo (para perguntar antes de descartar). */
  readonly alterado = computed(() => JSON.stringify(this.rascunho()) !== VAZIO);
  /** Avisa quem usa quando passa a ter (ou deixa de ter) alteração não salva. */
  readonly alteracao = output<boolean>();
  protected readonly partida = computed(() => partidaDe(this.rascunho().horario));
  protected readonly nomeInstancia = computed(
    () => this.opcoes().instancias.find((i) => i.id === this.rascunho().instanciaId)?.nome ?? "—",
  );
  protected readonly reservasObrigatorias = computed(() => reservasDoTipo(this.rascunho(), "OBRIGATORIA"));
  protected readonly reservasSecundarias = computed(() => reservasDoTipo(this.rascunho(), "SECUNDARIA"));
  protected readonly obrigatorias = computed(() =>
    resumoReservas(this.reservasObrigatorias(), "OBRIGATORIA", this.opcoes().classes),
  );
  protected readonly secundarias = computed(() =>
    resumoReservas(this.reservasSecundarias(), "SECUNDARIA", this.opcoes().classes),
  );
  protected readonly livres = computed(() => vagasLivres(this.rascunho()));

  constructor() {
    effect(() => this.alteracao.emit(this.alterado()));
  }

  protected mudar(parte: Partial<RascunhoGrupo>): void {
    this.rascunho.update((r) => ({ ...r, ...parte }));
  }

  protected alterarReserva(chave: string, parte: Partial<ReservaRascunho>): void {
    this.rascunho.update((r) => comReserva(r, chave, parte));
  }

  protected adicionarReserva(tipo: TipoReserva): void {
    this.rascunho.update((r) => comNovaReserva(r, tipo));
  }

  protected removerReserva(chave: string): void {
    this.rascunho.update((r) => semReserva(r, chave));
  }

  protected sairDoHorario(evento: FocusEvent): void {
    const campo = campoQueSaiu(evento);
    if (campo !== null) this.validacao.tocar(campo);
  }

  /** Próximo: sem pendência, avança; com pendência, mostra os erros e foca o primeiro campo inválido. */
  protected avancar(passo: PassoGrupo): void {
    this.agora.set(Date.now());
    const lista = this.pend()[passo];
    if (lista.length === 0) {
      this.stepper()?.next();
      return;
    }
    this.validacao.tentar(passo);
    const campos = lista.map((p) => p.campo);
    afterNextRender(() => focarPrimeiraPendencia(this.host, campos, passo), { injector: this.injector });
  }

  protected confirmar(): void {
    this.agora.set(Date.now());
    const p = this.pend();
    const passo = PASSOS_GRUPO.find((x) => p[x].length > 0);
    if (passo !== undefined) {
      // A hora pode ter passado enquanto a pessoa revisava: volta ao passo com problema.
      const stepper = this.stepper();
      if (stepper) stepper.selectedIndex = PASSOS_GRUPO.indexOf(passo);
      this.avancar(passo);
      return;
    }
    if (!this.salvando()) this.criar.emit(this.rascunho());
  }
}
