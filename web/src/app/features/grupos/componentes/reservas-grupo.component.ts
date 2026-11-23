import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  output,
} from "@angular/core";
import { agruparClasses } from "../../../shared/dominio/grupos-classes";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { GrupoCamposComponent } from "../../../shared/ui/grupo-campos/grupo-campos.component";
import { valorDoEvento } from "../../../shared/utils/evento";
import { campoQueSaiu, focarAposRemover, focarDepois, primeiroControle } from "../../../shared/utils/foco";
import {
  type ClasseGrupo,
  indicesDoTipo,
  TOTAL_VAGAS,
  type TipoReserva,
  type Vaga,
} from "../data/grupos.modelos";
import { campoGrupo } from "../data/novo-grupo.modelos";
import { ImportanciaComponent } from "./importancia.component";

/**
 * Reservas de um tipo (obrigatórias ou secundárias) no assistente de grupo: classe e importância
 * de cada uma. Cada reserva ocupa uma das 12 vagas; as que sobram ficam livres.
 */
@Component({
  selector: "app-reservas-grupo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BotaoComponent,
    CampoComponent,
    CampoControleDirective,
    GrupoCamposComponent,
    ImportanciaComponent,
  ],
  host: { "(focusout)": "aoSair($event)" },
  template: `
    @let e = erros();
    <p class="apoio">
      {{
        tipo() === "OBRIGATORIA"
          ? "Estas vagas precisam estar preenchidas para fechar o grupo."
          : "Estas vagas reservam uma classe e podem ficar abertas."
      }}
      {{ livres() }} de {{ totalVagas }} vagas ainda livres.
    </p>
    @for (i of indices(); track i; let n = $index) {
      @let v = vagas()[i]!;
      <ui-grupo-campos [legenda]="'Reserva ' + (n + 1)" data-linha>
        <ui-campo rotulo="Classe" [erro]="e.get(campo.classe(i))">
          <select
            uiCampo
            [attr.data-campo]="campo.classe(i)"
            (change)="alterar.emit({ i, parte: { classeId: valor($event) || null } })"
          >
            <option value="" [selected]="v.classeId === null">Escolha</option>
            @for (g of gruposDeClasses(); track g.nome) {
              <optgroup [label]="g.nome">
                @for (c of g.classes; track c.id) {
                  <option [value]="c.id" [selected]="v.classeId === c.id">{{ c.nomeOficial }}</option>
                }
              </optgroup>
            }
          </select>
        </ui-campo>
        <app-importancia
          [valor]="v.importancia"
          [campo]="campo.importancia(i)"
          [erro]="e.get(campo.importancia(i))"
          (mudar)="alterar.emit({ i, parte: { importancia: $event } })"
        />
        <button
          uiBotao
          slot="acoes"
          variante="fantasma"
          tamanho="p"
          data-acao="remover"
          [attr.aria-label]="'Remover reserva ' + (n + 1)"
          (click)="aoRemover(i, n)"
        >
          Remover
        </button>
      </ui-grupo-campos>
    }
    <button uiBotao data-acao="adicionar" [disabled]="livres() === 0" (click)="aoAdicionar()">
      Adicionar vaga
    </button>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
    :host > button {
      justify-self: start;
    }
    .apoio {
      margin: 0;
      color: var(--texto-suave);
    }
  `,
})
export class ReservasGrupoComponent {
  readonly vagas = input.required<readonly Vaga[]>();
  readonly tipo = input.required<TipoReserva>();
  readonly classes = input.required<readonly ClasseGrupo[]>();
  /** Erros visíveis por campo (`campoGrupo`). */
  readonly erros = input<ReadonlyMap<string, string>>(new Map());
  readonly tocou = output<string>();
  readonly alterar = output<{ i: number; parte: Partial<Vaga> }>();
  readonly adicionar = output();
  readonly remover = output<number>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  protected readonly campo = campoGrupo;
  protected readonly totalVagas = TOTAL_VAGAS;
  protected readonly valor = valorDoEvento;
  protected readonly indices = computed(() => indicesDoTipo(this.vagas(), this.tipo()));
  protected readonly livres = computed(() => indicesDoTipo(this.vagas(), "LIVRE").length);
  protected readonly gruposDeClasses = computed(() => agruparClasses(this.classes()));

  /** Nova reserva: o foco vai para a classe dela. */
  protected aoAdicionar(): void {
    this.adicionar.emit();
    focarDepois(this.injector, () => primeiroControle(this.linhas().at(-1)));
  }

  /** Reserva removida: foco no "Remover" da seguinte ou em "Adicionar vaga". */
  protected aoRemover(i: number, n: number): void {
    this.remover.emit(i);
    focarAposRemover(
      this.injector,
      () => this.linhas(),
      n,
      () => this.host.querySelector<HTMLElement>("[data-acao=adicionar]:not(:disabled)"),
    );
  }

  protected aoSair(evento: FocusEvent): void {
    const campo = campoQueSaiu(evento);
    if (campo !== null) this.tocou.emit(campo);
  }

  private linhas(): Element[] {
    return Array.from(this.host.querySelectorAll("[data-linha]"));
  }
}
