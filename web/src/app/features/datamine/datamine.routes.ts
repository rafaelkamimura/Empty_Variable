// Rotas do datamine de patches (D63, diretrizes §3.1).
import type { Routes } from "@angular/router";
import { autenticadoGuard } from "../../core/guardas";

export const ROTAS_DATAMINE: Routes = [
  {
    path: "datamine",
    canActivate: [autenticadoGuard],
    title: "Patches do cliente · Empty Variable",
    loadComponent: () => import("./paginas/patches.page").then((m) => m.PatchesPage),
  },
  {
    path: "datamine/:id",
    canActivate: [autenticadoGuard],
    title: "Patch · Empty Variable",
    loadComponent: () => import("./paginas/patch.page").then((m) => m.PatchPage),
  },
];
