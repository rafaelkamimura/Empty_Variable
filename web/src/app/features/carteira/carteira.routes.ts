// Rotas da carteira (diretrizes §3.1).
import type { Routes } from "@angular/router";
import { autenticadoGuard } from "../../core/guardas";

export const ROTAS_CARTEIRA: Routes = [
  {
    path: "carteira",
    canActivate: [autenticadoGuard],
    title: "Carteira · Empty Variable",
    loadComponent: () => import("./paginas/carteira.page").then((m) => m.CarteiraPage),
  },
];
