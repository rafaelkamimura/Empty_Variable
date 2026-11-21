// Rotas de desenvolvimento: só são registradas fora de produção (app.routes.ts usa isDevMode()).
import type { Routes } from "@angular/router";

export const ROTAS_DEV: Routes = [
  {
    path: "dev/catalogo",
    title: "Catálogo · Empty Variable",
    loadComponent: () => import("./catalogo/catalogo.page").then((m) => m.CatalogoPage),
  },
  {
    path: "dev/catalogo/:entrada",
    title: "Catálogo · Empty Variable",
    loadComponent: () => import("./catalogo/catalogo.page").then((m) => m.CatalogoPage),
  },
];
