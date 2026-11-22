import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";
import { CartaoComponent } from "../../../shared/ui/cartao/cartao.component";
import { AvatarClasseComponent } from "./avatar-classe.component";

/** Um personagem (vinculado ou da solicitação): retrato, nome, classe e nível. Abre a ficha. */
@Component({
  selector: "app-cartao-personagem",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CartaoComponent, AvatarClasseComponent],
  template: `
    <button uiCartao class="cartao" (click)="abrir.emit()" [attr.aria-label]="'Editar ficha de ' + nome()">
      <app-avatar-classe [classe]="classe()" />
      <strong>{{ nome() }}</strong>
      <small>{{ legenda() }}</small>
    </button>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .cartao {
      width: 100%;
      height: 100%;
      align-items: center;
      justify-content: center;
      text-align: center;
      min-height: 140px;
    }
    strong {
      color: var(--texto-forte);
      overflow-wrap: anywhere;
    }
    small {
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
  `,
})
export class CartaoPersonagemComponent {
  readonly nome = input.required<string>();
  /** Nome oficial da classe ("" se ainda não informada). */
  readonly classe = input("");
  readonly nivel = input<number | null | undefined>(null);
  readonly abrir = output();

  protected readonly legenda = computed(() => {
    const classe = this.classe() || "Classe a informar";
    return this.nivel() ? `${classe} · Nível ${this.nivel()}` : classe;
  });
}
