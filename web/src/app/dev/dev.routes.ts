// Rotas de desenvolvimento. No build de produção este arquivo é trocado por dev.routes.producao.ts
// (fileReplacements em angular.json), então nada daqui chega ao bundle publicado.
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
