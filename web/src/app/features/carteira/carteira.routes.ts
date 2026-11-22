// Rotas da carteira (diretrizes §3.1).
import type { Routes } from "@angular/router";
import { autenticadoGuard, vinculadoGuard } from "../../core/guardas";

export const ROTAS_CARTEIRA: Routes = [
  {
    path: "carteira",
    canActivate: [autenticadoGuard],
    title: "Carteira · Empty Variable",
    loadComponent: () => import("./paginas/carteira.page").then((m) => m.CarteiraPage),
  },
  {
    path: "me",
    canActivate: [vinculadoGuard],
    title: "Minha área · Empty Variable",
    loadComponent: () => import("./paginas/minha-area.page").then((m) => m.MinhaAreaPage),
  },
];
