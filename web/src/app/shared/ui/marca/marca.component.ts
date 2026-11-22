import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

export type TamanhoMarca = "p" | "m" | "g";
export type VarianteMarca = "texto" | "animada";

/** Largura e altura (px) da imagem em cada tamanho, na proporção 12:7 do arquivo (144 × 84). */
const DIMENSOES: Record<TamanhoMarca, readonly [number, number]> = {
  p: [48, 28],
  m: [72, 42],
  g: [144, 84],
};

/**
 * A marca {∅_} (diretrizes §2.4): chaves no degradê do acento, ∅ lavanda e o cursor _ piscando a
 * 1 Hz (parado com `prefers-reduced-motion`). Na variante `animada`, a mesma marca aparece como
 * imagem, entre as nebulosas (com `prefers-reduced-motion`, entra o quadro parado). Decorativa
 * por padrão; com `rotulo`, vira uma imagem com nome acessível.
 *
 * @nivel atomo
 */
@Component({
  selector: "ui-marca",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[class.tamanho-p]": "tamanho() === 'p'",
    "[class.tamanho-g]": "tamanho() === 'g'",
    "[class.animada]": "variante() === 'animada'",
    "[attr.role]": "rotulo() ? 'img' : null",
    "[attr.aria-label]": "rotulo() ?? null",
    "[attr.aria-hidden]": "rotulo() ? null : 'true'",
  },
  template: `@if (variante() === "animada") {
      <picture>
        <source media="(prefers-reduced-motion: reduce)" srcset="imagens/empty-variable-header.png" />
        <img
          src="imagens/empty-variable-header.gif"
          alt=""
          [attr.width]="dimensoes()[0]"
          [attr.height]="dimensoes()[1]"
        />
      </picture>
    } @else {
      <span class="chave">{{ "{" }}</span><span class="nulo">∅</span><span class="cursor">_</span
      ><span class="chave">{{ "}" }}</span>
    }`,
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
    :host(.animada) {
      align-items: center;
    }
    picture,
    img {
      display: block;
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
  /** `p` (16 px), `m` (20 px, padrão) ou `g` (56 px, login e destaques). A imagem tem 28, 42 e 84 px de altura. */
  readonly tamanho = input<TamanhoMarca>("m");
  /** `texto` (padrão, os caracteres {∅_}) ou `animada` (a imagem da marca: topo e login). */
  readonly variante = input<VarianteMarca>("texto");
  /** Nome acessível. Sem ele, a marca é decorativa (escondida de leitores de tela). */
  readonly rotulo = input<string>();

  protected readonly dimensoes = computed(() => DIMENSOES[this.tamanho()]);
}
