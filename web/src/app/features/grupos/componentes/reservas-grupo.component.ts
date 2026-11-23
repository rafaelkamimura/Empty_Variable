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
import {
  campoQueSaiu,
  focarAposRemover,
  focarDepois,
  primeiroControle,
} from "../../../shared/ui/formulario/foco";
import { GrupoCamposComponent } from "../../../shared/ui/grupo-campos/grupo-campos.component";
import { valorDoEvento } from "../../../shared/utils/evento";
import { type ClasseGrupo, TOTAL_VAGAS, type TipoReserva } from "../data/grupos.modelos";
import { campoGrupo, type ReservaRascunho } from "../data/novo-grupo.modelos";
import { ImportanciaComponent } from "./importancia.component";

/**
 * Reservas de um tipo (obrigatórias ou secundárias) no assistente de grupo: classe e importância
 * de cada uma, na ordem em que foram adicionadas. Cada reserva ocupa uma das 12 vagas.
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
    @for (r of reservas(); track r.chave; let n = $index) {
      <ui-grupo-campos [legenda]="'Reserva ' + (n + 1)" [attr.data-chave]="r.chave" data-linha>
        <ui-campo rotulo="Classe" [erro]="e.get(campo.classe(r.chave))">
          <select
            uiCampo
            [attr.data-campo]="campo.classe(r.chave)"
            (change)="alterar.emit({ chave: r.chave, parte: { classeId: valor($event) || null } })"
          >
            <option value="" [selected]="r.classeId === null">Escolha</option>
            @for (g of gruposDeClasses(); track g.nome) {
              <optgroup [label]="g.nome">
                @for (c of g.classes; track c.id) {
                  <option [value]="c.id" [selected]="r.classeId === c.id">{{ c.nomeOficial }}</option>
                }
              </optgroup>
            }
          </select>
        </ui-campo>
        <app-importancia
          [valor]="r.importancia"
          [campo]="campo.importancia(r.chave)"
          [erro]="e.get(campo.importancia(r.chave))"
          (mudar)="alterar.emit({ chave: r.chave, parte: { importancia: $event } })"
        />
        <button
          uiBotao
          slot="acoes"
          variante="fantasma"
          tamanho="p"
          data-acao="remover"
          [attr.aria-label]="'Remover reserva ' + (n + 1)"
          (click)="aoRemover(r.chave, n)"
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
  /** As reservas deste tipo, na ordem de inclusão. */
  readonly reservas = input.required<readonly ReservaRascunho[]>();
  readonly tipo = input.required<TipoReserva>();
  /** Vagas ainda livres no grupo (de todos os tipos). */
  readonly livres = input.required<number>();
  readonly classes = input.required<readonly ClasseGrupo[]>();
  /** Erros visíveis por campo (`campoGrupo`). */
  readonly erros = input<ReadonlyMap<string, string>>(new Map());
  readonly tocou = output<string>();
  readonly alterar = output<{ chave: string; parte: Partial<ReservaRascunho> }>();
  readonly adicionar = output();
  readonly remover = output<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  protected readonly campo = campoGrupo;
  protected readonly totalVagas = TOTAL_VAGAS;
  protected readonly valor = valorDoEvento;
  protected readonly gruposDeClasses = computed(() => agruparClasses(this.classes()));

  /** Nova reserva: o foco vai para a classe dela (a linha cuja chave não existia antes). */
  protected aoAdicionar(): void {
    const antes = new Set(this.reservas().map((r) => r.chave));
    this.adicionar.emit();
    focarDepois(this.injector, () =>
      primeiroControle(this.linhas().find((l) => !antes.has(l.getAttribute("data-chave") ?? ""))),
    );
  }

  /** Reserva removida: foco no "Remover" da seguinte ou em "Adicionar vaga". */
  protected aoRemover(chave: string, n: number): void {
    this.remover.emit(chave);
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
