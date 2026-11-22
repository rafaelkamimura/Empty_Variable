// Rotas do vínculo (diretrizes §3.1).
import type { Routes } from "@angular/router";
import { adminGuard, autenticadoGuard } from "../../core/guardas";

export const ROTAS_VINCULO: Routes = [
  {
    path: "vinculo/aprovacoes",
    canActivate: [adminGuard],
    title: "Solicitações de vínculo · Empty Variable",
    loadComponent: () => import("./paginas/aprovacoes.page").then((m) => m.AprovacoesVinculoPage),
  },
  {
    path: "vinculo",
    canActivate: [autenticadoGuard],
    title: "Vínculo · Empty Variable",
    loadComponent: () => import("./paginas/vinculo.page").then((m) => m.VinculoPage),
  },
];
