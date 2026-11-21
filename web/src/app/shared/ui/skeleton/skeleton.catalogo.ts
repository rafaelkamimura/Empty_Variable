import { ChangeDetectionStrategy, Component } from "@angular/core";
import { SkeletonComponent } from "./skeleton.component";

/** Exemplos do catálogo: ui-skeleton nos três formatos. */
@Component({
  selector: "ui-skeleton-catalogo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SkeletonComponent],
  template: `
    <h3>Linhas</h3>
    <ui-skeleton />
    <h3>Cartões</h3>
    <ui-skeleton formato="cartoes" [quantidade]="4" />
    <h3>Tabela</h3>
    <ui-skeleton formato="tabela" [quantidade]="5" />
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
    h3 {
      margin: var(--esp-3) 0 0;
      font-size: var(--fs-m);
      color: var(--texto-suave);
    }
  `,
})
export class SkeletonCatalogoComponent {}
