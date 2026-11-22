import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/** O que falta para avançar no passo do assistente. */
@Component({
  selector: "app-pendencias-passo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (pendencias().length > 0) {
      <ul aria-label="O que falta neste passo">
        @for (msg of pendencias(); track msg) {
          <li>{{ msg }}</li>
        }
      </ul>
    }
  `,
  styles: `
    ul {
      display: grid;
      gap: var(--esp-1);
      margin: 0;
      padding-left: var(--esp-5);
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
  `,
})
export class PendenciasPassoComponent {
  readonly pendencias = input.required<readonly string[]>();
}
