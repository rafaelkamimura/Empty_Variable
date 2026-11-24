import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component, effect, inject } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "../core/auth.service";
import { SaldoService } from "../core/saldo.service";
import { telaLiberada } from "../core/telas-liberadas";
import { CeuComponent } from "./ceu.component";
import { type ItemMenu, MenuLateralComponent } from "./menu-lateral.component";
import { TopoComponent } from "./topo.component";

const ITENS_MENU: readonly ItemMenu[] = [
  { rota: "/loja", rotulo: "Loja", icone: "sacola" },
  { rota: "/instancias-programadas", rotulo: "Instâncias", icone: "usuarios" },
  { rota: "/farm", rotulo: "Diário de farm", icone: "ampulheta" },
  { rota: "/simulador", rotulo: "Simulação de dano", icone: "espadas" },
  { rota: "/datamine", rotulo: "Patches do cliente", icone: "caixa" },
];

/**
 * Casca da aplicação (diretrizes §3, layout/): o céu ao fundo, topo, menu principal e a área de conteúdo, que é o
 * contêiner `conteudo` das container queries (§6.6). Sem usuário (login), só o conteúdo.
 */
@Component({
  selector: "app-casca",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, CeuComponent, TopoComponent, MenuLateralComponent],
  template: `
    <app-ceu />
    @if (auth.usuario(); as u) {
      <app-topo
        [usuario]="u"
        [saldo]="saldo.saldo()"
        [ehGestor]="auth.ehGestor()"
        [ehAdmin]="auth.ehAdmin()"
        [runsLiberadas]="runsLiberadas"
        (sair)="sair()"
      />
      <div class="corpo">
        <app-menu-lateral class="menu" [itens]="itensMenu" />
        <main class="principal">
          <ng-container *ngTemplateOutlet="conteudo" />
          <p class="credito">Imagens: Divine Pride · Ragnarok Online © Gravity</p>
        </main>
      </div>
    } @else {
      <main class="principal sozinho"><ng-container *ngTemplateOutlet="conteudo" /></main>
    }
    <!-- Um só ng-content: o Angular projeta o conteúdo num lugar só, então ele vive aqui. -->
    <ng-template #conteudo><ng-content /></ng-template>
  `,
  styles: `
    /* --casca-menu: largura do menu em trilho. --casca-largura: o menu, o vão, a largura
     * máxima do conteúdo (§6.6) e as margens. O topo usa as duas, para a marca ficar sobre o menu. */
    :host {
      --casca-menu: 104px;
      --casca-largura: calc(var(--largura-conteudo) + var(--casca-menu) + var(--esp-5) * 3);
      display: block;
      min-height: 100%;
    }
    .corpo {
      display: grid;
      grid-template-columns: var(--casca-menu) minmax(0, 1fr);
      gap: var(--esp-5);
      box-sizing: border-box;
      max-width: var(--casca-largura);
      margin: 0 auto;
      padding: var(--esp-5);
    }
    .menu {
      align-self: start;
      position: sticky;
      top: calc(64px + var(--esp-5));
    }
    .principal {
      min-width: 0;
      container: conteudo / inline-size;
    }
    .sozinho {
      min-height: 100vh;
      min-height: 100dvh;
    }
    .credito {
      margin: var(--esp-5) 0 var(--esp-2);
      font-size: var(--fs-xs);
      color: var(--texto-apagado);
      text-align: center;
    }

    @media (max-width: 760px) {
      .corpo {
        grid-template-columns: minmax(0, 1fr);
        gap: var(--esp-3);
        padding: var(--esp-3);
      }
      .menu {
        position: static;
      }
    }
  `,
})
export class CascaComponent {
  protected readonly auth = inject(AuthService);
  protected readonly saldo = inject(SaldoService);
  private readonly router = inject(Router);
  protected readonly itensMenu = ITENS_MENU;
  protected readonly runsLiberadas = telaLiberada("/gestao/runs");

  constructor() {
    effect(() => {
      if (this.auth.usuario()?.jogador) void this.saldo.atualizar();
      else this.saldo.limpar();
    });
  }

  protected async sair(): Promise<void> {
    await this.auth.sair();
    await this.router.navigateByUrl("/login");
  }
}
