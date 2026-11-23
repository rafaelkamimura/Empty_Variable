import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

let proximoId = 0;

/**
 * Importância de uma reserva, de 1 a 5, como estrelas. São rádios nativos num `fieldset` com
 * legenda (teclado: setas trocam o valor), cada um com o nome "N de 5" para o leitor de tela.
 */
@Component({
  selector: "app-importancia",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset [attr.aria-invalid]="erro() ? true : null" [attr.aria-describedby]="erro() ? idErro : null">
      <legend>Importância</legend>
      <div class="estrelas">
        @for (n of valores; track n) {
          <label class="estrela" [class.marcada]="n <= (valor() ?? 0)">
            <input
              type="radio"
              [name]="nome"
              [value]="n"
              [checked]="valor() === n"
              [attr.aria-label]="n + ' de 5'"
              [attr.data-campo]="campo()"
              (change)="mudar.emit(n)"
            />
            <span aria-hidden="true">{{ n <= (valor() ?? 0) ? "★" : "☆" }}</span>
          </label>
        }
      </div>
      @if (erro(); as e) {
        <span class="erro" [id]="idErro" role="alert">{{ e }}</span>
      }
    </fieldset>
  `,
  styles: `
    fieldset {
      display: grid;
      gap: var(--esp-1);
      margin: 0;
      padding: 0;
      border: 0;
      min-width: 0;
    }
    legend {
      padding: 0;
      margin-bottom: var(--esp-1);
      font-size: var(--fs-s);
      font-weight: 600;
      color: var(--texto);
    }
    .estrelas {
      display: flex;
      gap: var(--esp-1);
    }
    .estrela {
      position: relative;
      display: grid;
      place-items: center;
      min-width: 32px;
      min-height: 32px;
      border-radius: var(--raio-p);
      color: var(--texto-suave);
      cursor: pointer;
    }
    .estrela.marcada {
      color: var(--alerta);
    }
    .estrela input {
      position: absolute;
      inset: 0;
      margin: 0;
      opacity: 0;
      cursor: pointer;
    }
    .estrela span {
      font-size: var(--fs-xl);
      line-height: 1;
    }
    .estrela:focus-within {
      outline: 2px solid var(--foco);
      outline-offset: 1px;
    }
    .erro {
      font-size: var(--fs-xs);
      color: var(--erro);
    }
  `,
})
export class ImportanciaComponent {
  readonly valor = input<number | null>(null);
  /** Id do campo (`data-campo`) dos rádios: o foco vai ao primeiro, e sair de qualquer um marca o campo como tocado. */
  readonly campo = input<string | null>(null);
  readonly erro = input<string | undefined>();
  readonly mudar = output<number>();

  protected readonly valores = [1, 2, 3, 4, 5] as const;
  protected readonly nome = `importancia-${++proximoId}`;
  protected readonly idErro = `${this.nome}-erro`;
}
