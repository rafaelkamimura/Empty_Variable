// Rotas dos grupos de instância (diretrizes §3.1): a gestão (gestor) e a agenda do membro.
import type { Routes } from "@angular/router";
import { autenticadoGuard, gestorGuard } from "../../core/guardas";
import { sairSemSalvarGuard } from "../../core/sair-sem-salvar.guard";

export const ROTAS_GRUPOS: Routes = [
  {
    path: "instancias-programadas",
    canActivate: [autenticadoGuard],
    title: "Instâncias programadas · Empty Variable",
    loadComponent: () =>
      import("./paginas/instancias-programadas.page").then((m) => m.InstanciasProgramadasPage),
  },
  {
    path: "gestao/grupos",
    canActivate: [gestorGuard],
    canDeactivate: [sairSemSalvarGuard],
    title: "Grupos de instância · Empty Variable",
    loadComponent: () => import("./paginas/gestao-grupos.page").then((m) => m.GestaoGruposPage),
  },
];
