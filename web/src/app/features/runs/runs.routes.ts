// Rotas das runs (diretrizes §3.1). As antigas /admin/runs/... redirecionam para cá (app.routes.ts).
import type { Routes } from "@angular/router";
import { gestorGuard } from "../../core/guardas";
import { sairDoAssistenteGuard } from "./sair-do-assistente.guard";

const assistente = () => import("./paginas/assistente-run.page").then((m) => m.AssistenteRunPage);

export const ROTAS_RUNS: Routes = [
  {
    path: "gestao/runs",
    canActivate: [gestorGuard],
    title: "Runs · Empty Variable",
    loadComponent: () => import("./paginas/runs.page").then((m) => m.RunsPage),
  },
  {
    path: "gestao/runs/nova",
    canActivate: [gestorGuard],
    title: "Nova run · Empty Variable",
    loadComponent: assistente,
    canDeactivate: [sairDoAssistenteGuard],
  },
  {
    path: "gestao/runs/:id/corrigir",
    canActivate: [gestorGuard],
    title: "Corrigir run · Empty Variable",
    loadComponent: assistente,
    canDeactivate: [sairDoAssistenteGuard],
  },
  {
    path: "gestao/runs/:id",
    canActivate: [gestorGuard],
    title: "Run · Empty Variable",
    loadComponent: () => import("./paginas/run-detalhe.page").then((m) => m.RunDetalhePage),
  },
];
