import { booleanAttribute, ChangeDetectionStrategy, Component, input } from "@angular/core";

/**
 * O começo de toda linha do relatório: o código (ID, em fonte mono) e o nome. Com `caminho`, o nome
 * é um caminho de arquivo e também vai em mono, quebrando em qualquer ponto.
 */
@Component({
  selector: "app-identificacao",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class.caminho]": "caminho()" },
  template: `
    @if (codigo() !== "") {
      <span class="codigo">{{ codigo() }}</span>
    }
    <strong class="nome">{{ nome() }}</strong>
    @if (detalhe()) {
      <span class="detalhe">{{ detalhe() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--esp-1) var(--esp-2);
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .codigo {
      font-family: var(--fonte-mono);
      font-size: var(--fs-s);
      color: var(--texto-suave);
      font-variant-numeric: tabular-nums;
    }
    .nome {
      font-weight: 600;
      color: var(--texto-forte);
    }
    :host(.caminho) .nome {
      font-family: var(--fonte-mono);
      font-size: var(--fs-s);
      font-weight: 400;
      color: var(--texto);
    }
    .detalhe {
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
  `,
})
export class IdentificacaoComponent {
  /** ID do item, da skill, da quest… Vazio não mostra nada. */
  readonly codigo = input<string | number>("");
  readonly nome = input.required<string>();
  /** Texto curto depois do nome (ex.: a constante da skill, o nome antigo). */
  readonly detalhe = input<string>("");
  /** O nome é um caminho de arquivo. */
  readonly caminho = input(false, { transform: booleanAttribute });
}
