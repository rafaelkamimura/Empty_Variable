import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { CascaComponent } from "./layout/casca.component";

/**
 * Raiz: a casca (layout/) em volta das rotas.
 *
 * Fica na detecção padrão de propósito: o <router-outlet> é declarado aqui, então as páginas
 * roteadas são filhas desta view. Com OnPush, uma página antiga (sem OnPush) que muda um campo
 * comum depois de um await deixaria de redesenhar. Vira OnPush quando as páginas migrarem (§10).
 * O app-casca, que só recebe o outlet por projeção, já é OnPush.
 */
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection -- ver acima
@Component({
  selector: "app-root",
  imports: [RouterOutlet, CascaComponent],
  template: `<app-casca><router-outlet /></app-casca>`,
})
export class AppComponent {}
