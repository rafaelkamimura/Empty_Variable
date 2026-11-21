// Rotas da Nebula (diretrizes §3.1). A fila do admin (/admin/nebula) é a mesma tela, no modo admin.
import type { Routes } from "@angular/router";
import { adminGuard, vinculadoGuard } from "../../core/guardas";

const solicitacoes = () => import("./paginas/solicitacoes.page").then((m) => m.SolicitacoesNebulaPage);

export const ROTAS_NEBULA: Routes = [
  {
    path: "nebula",
    canActivate: [vinculadoGuard],
    title: "Nebula · Empty Variable",
    loadComponent: () => import("./paginas/nebula.page").then((m) => m.NebulaPage),
  },
  {
    path: "nebula/solicitacoes",
    canActivate: [vinculadoGuard],
    title: "Minhas solicitações · Empty Variable",
    loadComponent: solicitacoes,
  },
  {
    path: "admin/nebula",
    canActivate: [adminGuard],
    title: "Entregas da Nebula · Empty Variable",
    data: { admin: true },
    loadComponent: solicitacoes,
  },
];
