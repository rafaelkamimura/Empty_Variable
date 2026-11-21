import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  inject,
  input,
  ViewEncapsulation,
} from "@angular/core";

let proximoId = 0;

/**
 * Campo de formulário (diretrizes §5 e §6.4): rótulo visível, o controle projetado, dica e erro,
 * ligados por `for`/`id` e `aria-describedby`. O controle leva a diretiva `uiCampo`:
 * `<ui-campo rotulo="Quantidade"><input uiCampo type="number" inputmode="numeric" /></ui-campo>`.
 *
 * Usa `ViewEncapsulation.None` com as regras escopadas em `.ui-campo`, para estilizar o controle
 * projetado sem `::ng-deep` (§2.5).
 *
 * @nivel molecula
 */
@Component({
  selector: "ui-campo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: "ui-campo", "[class.com-erro]": "!!erro()" },
  template: `
    <label class="ui-campo-rotulo" [attr.for]="idControle">{{ rotulo() }}</label>
    <ng-content />
    @if (dica()) {
      <span class="ui-campo-dica" [id]="idDica">{{ dica() }}</span>
    }
    @if (erro()) {
      <span class="ui-campo-erro" [id]="idErro" role="alert">{{ erro() }}</span>
    }
  `,
  styles: `
    .ui-campo {
      display: grid;
      gap: var(--esp-1);
      min-width: 0;
    }
    .ui-campo-rotulo {
      font-size: var(--fs-s);
      font-weight: 600;
      color: var(--texto-suave);
    }
    .ui-campo :is(input, select, textarea) {
      box-sizing: border-box;
      width: 100%;
      min-height: 40px;
      padding: var(--esp-2) var(--esp-3);
      border: 1px solid var(--borda-campo);
      border-radius: var(--raio-p);
      background: var(--fundo);
      color: var(--texto);
      font: inherit;
      font-size: var(--fs-m);
    }
    .ui-campo :is(input, select, textarea)::placeholder {
      color: var(--texto-apagado);
    }
    .ui-campo :is(input, select, textarea):disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .ui-campo.com-erro :is(input, select, textarea) {
      border-color: var(--erro);
    }
    .ui-campo-dica {
      font-size: var(--fs-xs);
      color: var(--texto-apagado);
    }
    .ui-campo-erro {
      font-size: var(--fs-xs);
      color: var(--erro);
    }
  `,
})
export class CampoComponent {
  /** Rótulo visível (o placeholder não substitui o rótulo). */
  readonly rotulo = input.required<string>();
  /** Dica curta abaixo do controle. */
  readonly dica = input<string>();
  /** Mensagem de erro que diz como corrigir. Vazia, o campo está válido. */
  readonly erro = input<string>();

  private readonly id = `ui-campo-${++proximoId}`;
  readonly idControle = `${this.id}-controle`;
  readonly idDica = `${this.id}-dica`;
  readonly idErro = `${this.id}-erro`;
  /** Ids que descrevem o controle (dica e erro), para o `aria-describedby`. */
  readonly descritores = computed(
    () => [this.dica() ? this.idDica : "", this.erro() ? this.idErro : ""].filter((x) => x).join(" ") || null,
  );
}

/** Liga o controle nativo ao `ui-campo` que o envolve: id, descrição e estado de erro. */
@Directive({
  selector: "input[uiCampo], select[uiCampo], textarea[uiCampo]",
  host: {
    "[id]": "campo?.idControle ?? null",
    "[attr.aria-describedby]": "campo?.descritores() ?? null",
    "[attr.aria-invalid]": "campo?.erro() ? 'true' : null",
  },
})
export class CampoControleDirective {
  protected readonly campo = inject(CampoComponent, { optional: true });
}
