import type { Routes } from "@angular/router";
import {
  adminGuard,
  anonimoGuard,
  autenticadoGuard,
  gestorGuard,
  inicioGuard,
  vinculadoGuard,
} from "./core/guardas";
import { TELAS_LIBERADAS } from "./core/telas-liberadas";
import { ROTAS_DEV } from "./dev/dev.routes";

/** paineis §4: o painel vem da URL — /me, /loja e /nebula (Cliente), /gestao (Gestão), /admin (Administração). */
const rotasCompletas: Routes = [
  {
    path: "",
    pathMatch: "full",
    canActivate: [inicioGuard],
    children: [],
  },
  {
    path: "login",
    canActivate: [anonimoGuard],
    title: "Entrar · Empty Variable",
    loadComponent: () => import("./paginas/login.component").then((m) => m.LoginComponent),
  },
  {
    path: "vinculo/aprovacoes",
    canActivate: [adminGuard],
    data: { filaAprovacoes: true },
    loadComponent: () => import("./paginas/vinculo.component").then((m) => m.VinculoComponent),
  },
  {
    path: "vinculo",
    canActivate: [autenticadoGuard],
    title: "Vínculo · Empty Variable",
    loadComponent: () => import("./paginas/vinculo.component").then((m) => m.VinculoComponent),
  },

  // ---- Cliente ----
  {
    path: "me",
    canActivate: [vinculadoGuard],
    title: "Minha área · Empty Variable",
    loadComponent: () => import("./paginas/me.component").then((m) => m.MeComponent),
  },
  {
    path: "loja",
    canActivate: [autenticadoGuard],
    title: "Loja · Empty Variable",
    loadComponent: () => import("./paginas/loja-catalogo.component").then((m) => m.LojaCatalogoComponent),
  },
  {
    path: "carteira",
    canActivate: [autenticadoGuard],
    title: "Carteira · Empty Variable",
    loadComponent: () => import("./paginas/carteira.component").then((m) => m.CarteiraComponent),
  },
  {
    path: "farm",
    canActivate: [autenticadoGuard],
    title: "Diário de farm · Empty Variable",
    loadComponent: () => import("./paginas/farm.component").then((m) => m.FarmComponent),
  },
  {
    path: "simulador",
    canActivate: [autenticadoGuard],
    title: "Simulador de dano · Empty Variable",
    loadComponent: () => import("./paginas/simulador-hub.component").then((m) => m.SimuladorHubComponent),
  },
  {
    path: "simulador/estimativa",
    canActivate: [autenticadoGuard],
    title: "Estimativa de dano · Empty Variable",
    loadComponent: () => import("./paginas/simulador.component").then((m) => m.SimuladorComponent),
  },
  {
    path: "loja/compras",
    canActivate: [vinculadoGuard],
    title: "Minhas compras · Empty Variable",
    loadComponent: () => import("./paginas/loja-compras.component").then((m) => m.LojaComprasComponent),
  },
  {
    path: "loja/ofertas",
    canActivate: [vinculadoGuard],
    title: "Minhas ofertas · Empty Variable",
    loadComponent: () => import("./paginas/loja-ofertas.component").then((m) => m.LojaOfertasComponent),
  },
  {
    path: "nebula",
    canActivate: [vinculadoGuard],
    title: "Nebula · Empty Variable",
    loadComponent: () => import("./paginas/nebula.component").then((m) => m.NebulaComponent),
  },
  {
    path: "nebula/solicitacoes",
    canActivate: [vinculadoGuard],
    title: "Minhas solicitações · Empty Variable",
    loadComponent: () =>
      import("./paginas/nebula-solicitacoes.component").then((m) => m.NebulaSolicitacoesComponent),
  },

  // ---- Gestão (gestor e admin, D37) ----
  {
    path: "gestao",
    pathMatch: "full",
    canActivate: [gestorGuard],
    title: "Gestão · Empty Variable",
    loadComponent: () => import("./paginas/gestao-inicio.component").then((m) => m.GestaoInicioComponent),
  },
  {
    path: "instancias-programadas",
    canActivate: [autenticadoGuard],
    loadComponent: () =>
      import("./paginas/instancias-programadas.component").then((m) => m.InstanciasProgramadasComponent),
  },
  {
    path: "gestao/grupos",
    canActivate: [gestorGuard],
    loadComponent: () => import("./paginas/gestao-grupos.component").then((m) => m.GestaoGruposComponent),
  },
  {
    path: "gestao/runs",
    canActivate: [gestorGuard],
    title: "Runs · Empty Variable",
    loadComponent: () => import("./paginas/admin-runs.component").then((m) => m.AdminRunsComponent),
  },
  {
    path: "gestao/runs/nova",
    canActivate: [gestorGuard],
    title: "Nova run · Empty Variable",
    loadComponent: () =>
      import("./paginas/admin-run-assistente.component").then((m) => m.AdminRunAssistenteComponent),
  },
  {
    path: "gestao/runs/:id/corrigir",
    canActivate: [gestorGuard],
    title: "Corrigir run · Empty Variable",
    loadComponent: () =>
      import("./paginas/admin-run-assistente.component").then((m) => m.AdminRunAssistenteComponent),
  },
  {
    path: "gestao/runs/:id",
    canActivate: [gestorGuard],
    title: "Run · Empty Variable",
    loadComponent: () =>
      import("./paginas/admin-run-detalhe.component").then((m) => m.AdminRunDetalheComponent),
  },
  {
    path: "gestao/saldos",
    canActivate: [gestorGuard],
    title: "Saldos · Empty Variable",
    loadComponent: () => import("./paginas/admin-saldos.component").then((m) => m.AdminSaldosComponent),
  },
  {
    path: "gestao/jogadores",
    canActivate: [gestorGuard],
    title: "Jogadores · Empty Variable",
    loadComponent: () => import("./paginas/admin-jogadores.component").then((m) => m.AdminJogadoresComponent),
  },
  {
    path: "gestao/classes",
    canActivate: [gestorGuard],
    title: "Classes · Empty Variable",
    loadComponent: () => import("./paginas/admin-classes.component").then((m) => m.AdminClassesComponent),
  },
  {
    path: "gestao/instancias",
    canActivate: [gestorGuard],
    title: "Instâncias · Empty Variable",
    loadComponent: () =>
      import("./paginas/gestao-instancias.component").then((m) => m.GestaoInstanciasComponent),
  },
  {
    path: "gestao/instancias/:id",
    canActivate: [gestorGuard],
    title: "Instância · Empty Variable",
    loadComponent: () =>
      import("./paginas/gestao-instancia.component").then((m) => m.GestaoInstanciaComponent),
  },
  {
    path: "gestao/parametros",
    canActivate: [gestorGuard],
    title: "Parâmetros · Empty Variable",
    loadComponent: () =>
      import("./paginas/admin-parametros.component").then((m) => m.AdminParametrosComponent),
  },
  {
    path: "gestao/receitas",
    canActivate: [gestorGuard],
    title: "Receitas · Empty Variable",
    loadComponent: () => import("./paginas/admin-receitas.component").then((m) => m.AdminReceitasComponent),
  },

  // ---- Administração (admin) ----
  {
    path: "admin",
    pathMatch: "full",
    canActivate: [adminGuard],
    title: "Administração · Empty Variable",
    loadComponent: () => import("./paginas/admin-inicio.component").then((m) => m.AdminInicioComponent),
  },
  {
    path: "admin/estoque",
    canActivate: [adminGuard],
    title: "Estoque · Empty Variable",
    loadComponent: () => import("./paginas/admin-estoque.component").then((m) => m.AdminEstoqueComponent),
  },
  {
    path: "admin/itens",
    canActivate: [adminGuard],
    title: "Itens · Empty Variable",
    loadComponent: () => import("./paginas/admin-itens.component").then((m) => m.AdminItensComponent),
  },
  {
    path: "admin/compras",
    canActivate: [adminGuard],
    title: "Compras · Empty Variable",
    loadComponent: () => import("./paginas/admin-compras.component").then((m) => m.AdminComprasComponent),
  },
  {
    path: "admin/ofertas",
    canActivate: [adminGuard],
    title: "Ofertas · Empty Variable",
    loadComponent: () => import("./paginas/admin-ofertas.component").then((m) => m.AdminOfertasComponent),
  },
  {
    path: "admin/nebula",
    canActivate: [adminGuard],
    title: "Entregas da Nebula · Empty Variable",
    data: { admin: true },
    loadComponent: () =>
      import("./paginas/nebula-solicitacoes.component").then((m) => m.NebulaSolicitacoesComponent),
  },
  {
    path: "admin/taxa",
    canActivate: [adminGuard],
    title: "Taxa da loja · Empty Variable",
    loadComponent: () => import("./paginas/admin-taxa.component").then((m) => m.AdminTaxaComponent),
  },
  {
    path: "admin/usuarios",
    canActivate: [adminGuard],
    title: "Usuários · Empty Variable",
    loadComponent: () => import("./paginas/admin-usuarios.component").then((m) => m.AdminUsuariosComponent),
  },

  // ---- URLs antigas da gestão (antes do M13): redirecionam (CT-136) ----
  { path: "admin/runs/nova", redirectTo: "gestao/runs/nova" },
  { path: "admin/runs/:id/corrigir", redirectTo: "gestao/runs/:id/corrigir" },
  { path: "admin/runs/:id", redirectTo: "gestao/runs/:id" },
  ...["runs", "saldos", "jogadores", "classes", "parametros", "receitas"].map((p) => ({
    path: `admin/${p}`,
    redirectTo: `gestao/${p}`,
  })),

  { path: "**", redirectTo: "" },
];

// Liberação incremental das telas (core/telas-liberadas.ts). As demais rotas retornam ao início nesta etapa.
// O catálogo vivo (/dev/catalogo, diretrizes §8.2) só existe fora de produção e vem antes do "**".
// Em produção, ROTAS_DEV é [] (fileReplacements em angular.json).
export const routes: Routes = [
  ...ROTAS_DEV,
  ...rotasCompletas.filter(({ path }) => TELAS_LIBERADAS.has(path ?? "")),
];
