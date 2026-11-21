// Substitui dev.routes.ts no build de produção (fileReplacements em angular.json): sem rotas de
// desenvolvimento, nenhum import() do catálogo entra no bundle e nenhum chunk dele é emitido.
import type { Routes } from "@angular/router";

export const ROTAS_DEV: Routes = [];
