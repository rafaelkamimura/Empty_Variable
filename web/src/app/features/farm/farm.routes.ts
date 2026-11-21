// Rotas do Diário de farm (diretrizes §3.1).
import type { Routes } from "@angular/router";
import { autenticadoGuard } from "../../core/guardas";

export const ROTAS_FARM: Routes = [
  {
    path: "farm",
    canActivate: [autenticadoGuard],
    title: "Diário de farm · Empty Variable",
    loadComponent: () => import("./paginas/farm.page").then((m) => m.FarmPage),
  },
];
