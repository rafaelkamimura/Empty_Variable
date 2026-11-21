import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { CascaComponent } from "./layout/casca.component";

/** Raiz: a casca (layout/) em volta das rotas. */
@Component({
  selector: "app-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, CascaComponent],
  template: `<app-casca><router-outlet /></app-casca>`,
})
export class AppComponent {}
