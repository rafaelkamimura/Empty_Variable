import { ChangeDetectionStrategy, Component, input } from "@angular/core";

export type TamanhoMarca = "p" | "m" | "g";

/**
 * A marca {∅_} (diretrizes §2.4): chaves no degradê do acento, ∅ lavanda e o cursor _ piscando a
 * 1 Hz (parado com `prefers-reduced-motion`). Decorativa por padrão; com `rotulo`, vira uma
 * imagem com nome acessível.
 *
 * @nivel atomo
 */
@Component({
  selector: "ui-marca",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[class.tamanho-p]": "tamanho() === 'p'",
    "[class.tamanho-g]": "tamanho() === 'g'",
    "[attr.role]": "rotulo() ? 'img' : null",
    "[attr.aria-label]": "rotulo() ?? null",
    "[attr.aria-hidden]": "rotulo() ? null : 'true'",
  },
  template: `<span class="chave">{{ "{" }}</span
    ><span class="nulo">∅</span><span class="cursor">_</span><span class="chave">{{ "}" }}</span>`,
  styles: `
    :host {
      display: inline-flex;
      align-items: baseline;
      font-family: var(--fonte-mono);
      font-size: var(--fs-xl);
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
      user-select: none;
    }
    :host(.tamanho-p) {
      font-size: var(--fs-l);
    }
    :host(.tamanho-g) {
      font-size: calc(var(--fs-2xl) * 2);
    }
    .chave {
      background: var(--acento-degrade);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .nulo {
      color: var(--texto);
    }
    .cursor {
      color: var(--acento-suave);
      animation: piscar 1s steps(1) infinite;
    }
    @keyframes piscar {
      50% {
        opacity: 0;
      }
    }
  `,
})
export class MarcaComponent {
  /** `p` (16 px), `m` (20 px, padrão) ou `g` (56 px, login e destaques). */
  readonly tamanho = input<TamanhoMarca>("m");
  /** Nome acessível. Sem ele, a marca é decorativa (escondida de leitores de tela). */
  readonly rotulo = input<string>();
}
