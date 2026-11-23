import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { RouterLink } from "@angular/router";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import { CartaoComponent } from "../../../shared/ui/cartao/cartao.component";
import { type Grupo, preenchidas, TOTAL_VAGAS } from "../data/grupos.modelos";
import { LinkConfirmavelDirective } from "./link-confirmavel.directive";

/**
 * Grupos agendados (mais recentes primeiro), como links para `?grupo=<id>`; o aberto fica
 * destacado e com `aria-current`. Com alteração não salva, o clique emite `abrir` para quem usa
 * perguntar antes de trocar.
 */
@Component({
  selector: "app-lista-grupos",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, BadgeComponent, CartaoComponent, LinkConfirmavelDirective],
  template: `
    @for (g of grupos(); track g.id) {
      <a
        uiCartao
        [routerLink]="['/gestao/grupos']"
        [queryParams]="{ grupo: g.id }"
        [destaque]="selecionado() === g.id"
        [attr.aria-current]="selecionado() === g.id ? 'page' : null"
        [appLinkConfirmavel]="confirmarAntes()"
        [bloqueado]="bloqueado()"
        (interceptado)="abrir.emit(g.id)"
      >
        <strong>{{ g.instancia.nome }}</strong>
        <span class="meta">
          {{ g.agendadoEm | date: "dd/MM HH:mm" : "-0300" }} · {{ ocupacao(g) }}/{{ totalVagas }} ·
          <ui-badge [tom]="g.fechadoEm ? 'neutro' : 'sucesso'">{{
            g.fechadoEm ? "Fechado" : "Aberto"
          }}</ui-badge>
        </span>
      </a>
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
  /** Salvando: os links não navegam. */
  readonly bloqueado = input(false);
  /** Há alteração não salva: o clique emite `abrir` em vez de navegar. */
  readonly confirmarAntes = input(false);
  readonly abrir = output<string>();

  protected readonly totalVagas = TOTAL_VAGAS;
  protected ocupacao(g: Grupo): number {
    return preenchidas(g.vagas);
  }
}
