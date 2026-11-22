import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { iconeDaClasse } from "../../../shared/dominio/icones-classes";
import { siglaDaClasse, tomDe } from "../../../shared/dominio/visual";

/**
 * Retrato do personagem: o ícone da classe (sprite do jogo) ou, sem ícone, as iniciais da classe
 * no tom dela. Decorativo: o nome da classe sempre aparece ao lado.
 */
@Component({
  selector: "app-avatar-classe",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "aria-hidden": "true", "[class.grande]": "tamanho() === 'g'", "[style.color]": "tom()" },
  template: `
    @if (icone(); as src) {
      <img [src]="src" alt="" />
    } @else {
      <span class="sigla">{{ sigla() }}</span>
    }
  `,
  styles: `
    :host {
      display: grid;
      place-items: center;
      flex: none;
      width: 56px;
      height: 56px;
      border: 1px solid currentColor;
      border-radius: var(--raio-m);
      background:
        radial-gradient(ellipse at 50% 55%, var(--acento-fundo), transparent 75%), var(--superficie);
    }
    :host(.grande) {
      width: 88px;
      height: 88px;
      border-radius: var(--raio-g);
    }
    img {
      width: calc(100% - 12px);
      height: calc(100% - 12px);
      object-fit: contain;
      image-rendering: pixelated;
    }
    .sigla {
      font-size: var(--fs-l);
      font-weight: 700;
    }
    :host(.grande) .sigla {
      font-size: var(--fs-2xl);
    }
  `,
})
export class AvatarClasseComponent {
  /** Nome oficial da classe ("" quando ainda não foi escolhida). */
  readonly classe = input.required<string>();
  readonly tamanho = input<"p" | "g">("p");

  protected readonly icone = computed(() => (this.classe() ? iconeDaClasse(this.classe()) : null));
  protected readonly sigla = computed(() => (this.classe() ? siglaDaClasse(this.classe()) : "?"));
  protected readonly tom = computed(() => (this.classe() ? tomDe(this.classe()) : "var(--texto-suave)"));
}
