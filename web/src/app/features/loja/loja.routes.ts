// Rotas da loja (diretrizes §3.1): cada feature exporta as suas, carregadas sob demanda.
import type { Routes } from "@angular/router";
import { autenticadoGuard, vinculadoGuard } from "../../core/guardas";

export const ROTAS_LOJA: Routes = [
  {
    path: "loja",
    canActivate: [autenticadoGuard],
    title: "Loja · Empty Variable",
    loadComponent: () => import("./paginas/catalogo.page").then((m) => m.CatalogoPage),
  },
  {
    path: "loja/compras",
    canActivate: [vinculadoGuard],
    title: "Minhas compras · Empty Variable",
    loadComponent: () => import("./paginas/compras.page").then((m) => m.ComprasPage),
  },
  {
    path: "loja/ofertas",
    canActivate: [vinculadoGuard],
    title: "Minhas ofertas · Empty Variable",
    loadComponent: () => import("./paginas/ofertas.page").then((m) => m.OfertasPage),
  },
];
