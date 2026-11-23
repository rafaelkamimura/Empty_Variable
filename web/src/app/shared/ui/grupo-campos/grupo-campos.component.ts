import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/**
 * Grupo de campos com legenda (diretrizes §5 e §6.4): um `fieldset` que junta os `ui-campo` de um
 * mesmo item (um participante, um empréstimo, um drop) numa grade fluida, com as ações do item
 * abaixo. A legenda é o nome do grupo para o leitor de tela e aparece na tela.
 *
 * ```html
 * <ui-grupo-campos legenda="Participante 1">
 *   <ui-campo rotulo="Personagem">…</ui-campo>
 *   <button uiBotao slot="acoes">Remover</button>
 * </ui-grupo-campos>
 * ```
 *
 * @nivel molecula
 */
@Component({
  selector: "ui-grupo-campos",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class.estreito]": "larguraCampo() === 'p'" },
  template: `
    <fieldset>
      <legend>{{ legenda() }}</legend>
      <div class="campos"><ng-content /></div>
      <div class="acoes"><ng-content select="[slot=acoes]" /></div>
    </fieldset>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
      --grupo-campo-min: 220px;
    }
    :host(.estreito) {
      --grupo-campo-min: 160px;
    }
    fieldset {
      display: grid;
      gap: var(--esp-3);
      min-width: 0;
      margin: 0;
      padding: var(--esp-3);
      border: 1px solid var(--borda);
      border-radius: var(--raio-m);
    }
    legend {
      padding: 0 var(--esp-1);
      font-size: var(--fs-s);
      font-weight: 600;
      color: var(--texto-suave);
      overflow-wrap: anywhere;
    }
    .campos {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--grupo-campo-min)), 1fr));
      align-items: start;
      gap: var(--esp-2) var(--esp-3);
    }
    .acoes {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-2);
    }
    .acoes:empty {
      display: none;
    }
  `,
})
export class GrupoCamposComponent {
  /** Nome do grupo, mostrado na legenda ("Participante 1"). */
  readonly legenda = input.required<string>();
  /** Largura mínima de cada campo na grade: `p` (160 px) para muitos campos curtos, `m` (220 px) por padrão. */
  readonly larguraCampo = input<"p" | "m">("m");
}
