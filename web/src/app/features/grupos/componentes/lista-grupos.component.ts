import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import { CartaoComponent } from "../../../shared/ui/cartao/cartao.component";
import { type Grupo, preenchidas, TOTAL_VAGAS } from "../data/grupos.modelos";

/** Grupos agendados (mais recentes primeiro), como cartões clicáveis; o aberto fica destacado. */
@Component({
  selector: "app-lista-grupos",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, BadgeComponent, CartaoComponent],
  template: `
    @for (g of grupos(); track g.id) {
      <button
        uiCartao
        type="button"
        [destaque]="selecionado() === g.id"
        [attr.aria-pressed]="selecionado() === g.id"
        [disabled]="bloqueado()"
        (click)="abrir.emit(g.id)"
      >
        <strong>{{ g.instancia.nome }}</strong>
        <span class="meta">
          {{ g.agendadoEm | date: "dd/MM HH:mm" : "-0300" }} · {{ ocupacao(g) }}/{{ totalVagas }} ·
          <ui-badge [tom]="g.fechadoEm ? 'neutro' : 'sucesso'">{{
            g.fechadoEm ? "Fechado" : "Aberto"
          }}</ui-badge>
        </span>
      </button>
    }
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
      gap: var(--esp-2);
    }
    strong {
      color: var(--texto-forte);
      overflow-wrap: anywhere;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--esp-1);
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
  `,
})
export class ListaGruposComponent {
  readonly grupos = input.required<readonly Grupo[]>();
  readonly selecionado = input<string | null>(null);
  readonly bloqueado = input(false);
  readonly abrir = output<string>();

  protected readonly totalVagas = TOTAL_VAGAS;
  protected ocupacao(g: Grupo): number {
    return preenchidas(g.vagas);
  }
}
