import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";

/**
 * Explicação longa, recolhida (diretrizes §5 e §6.1): a página abre direto no que importa.
 *
 * Usa `ViewEncapsulation.None` com tudo escopado em `.ui-como-funciona`, para dar espaçamento
 * aos parágrafos projetados sem `::ng-deep` (§2.5).
 *
 * @nivel molecula
 */
@Component({
  selector: "ui-como-funciona",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: "ui-como-funciona" },
  template: `
    <details>
      <summary>{{ titulo() }}</summary>
      <div class="conteudo"><ng-content /></div>
    </details>
  `,
  styles: `
    .ui-como-funciona {
      display: block;
    }
    .ui-como-funciona > details {
      border: 1px solid var(--borda);
      border-radius: var(--raio-g);
      background: var(--superficie);
    }
    .ui-como-funciona summary {
      cursor: pointer;
      min-height: 40px;
      box-sizing: border-box;
      padding: var(--esp-3) var(--esp-4);
      font-size: var(--fs-m);
      font-weight: 600;
      color: var(--texto-suave);
      list-style-position: inside;
    }
    .ui-como-funciona summary:hover {
      color: var(--texto);
    }
    .ui-como-funciona .conteudo {
      padding: 0 var(--esp-4) var(--esp-3);
      font-size: var(--fs-m);
      color: var(--texto-suave);
    }
    .ui-como-funciona .conteudo p {
      margin: var(--esp-2) 0;
    }
  `,
})
export class ComoFuncionaComponent {
  /** Texto do resumo clicável. */
  readonly titulo = input("Como funciona");
}
