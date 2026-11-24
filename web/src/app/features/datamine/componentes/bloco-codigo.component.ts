import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/** Trecho de dado cru do cliente (JSON de uma tabela Lua, valor de um campo), em fonte mono e com quebra de linha. */
@Component({
  selector: "app-bloco-codigo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<pre>{{ texto() }}</pre>`,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    pre {
      margin: 0;
      padding: var(--esp-2) var(--esp-3);
      border: 1px solid var(--borda);
      border-radius: var(--raio-p);
      background: var(--superficie);
      color: var(--texto);
      font-family: var(--fonte-mono);
      font-size: var(--fs-xs);
      line-height: 1.5;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
  `,
})
export class BlocoCodigoComponent {
  readonly texto = input.required<string>();
}
