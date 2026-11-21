import { Component, computed, effect, inject } from "@angular/core";
import { MatMenuModule } from "@angular/material/menu";
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { AuthService } from "./core/auth.service";
import { SaldoService } from "./core/saldo.service";
import { IconeComponent } from "./core/icone.component";
import { telaLiberada } from "./core/telas-liberadas";

export type Painel = "cliente" | "gestao" | "admin";

/** paineis §4: o painel ativo vem do começo da URL. */
export function painelDaUrl(url: string): Painel {
  if (url === "/gestao" || url.startsWith("/gestao/") || url.startsWith("/gestao?")) return "gestao";
  if (url === "/admin" || url.startsWith("/admin/") || url.startsWith("/admin?")) return "admin";
  return "cliente";
}

@Component({
  selector: "app-root",
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconeComponent, MatMenuModule],
  template: `
    <header class="barra">
      <a routerLink="/" class="marca" aria-label="Empty Variable, início">
        <span class="marca-icone"><app-icone nome="estrela" [tamanho]="20" [traco]="2" /></span>
        <span class="marca-texto">
          <strong>Empty Variable</strong>
        </span>
      </a>
      <span class="espaco"></span>
      @if (auth.usuario(); as u) {
        <div class="carteira" aria-label="Saldo da carteira" data-testid="saldo-topo">
          <small>Carteira</small>
          <strong>{{
            u.jogador ? (saldo.saldo() === null ? "—" : saldo.saldo() + " pts") : "Sem vínculo"
          }}</strong>
        </div>
        <button
          type="button"
          class="avatar"
          [matMenuTriggerFor]="menuPerfil"
          aria-label="Menu do perfil"
          [title]="nomeUsuario()"
        >
          @if (u.avatarUrl) {
            <img [src]="u.avatarUrl" alt="" />
          } @else {
            {{ inicial() }}
          }
        </button>
        <mat-menu #menuPerfil="matMenu">
          <a mat-menu-item routerLink="/vinculo"><app-icone nome="usuarios" /> Vínculo de jogador</a>
          @if (auth.ehGestor()) {
            <a mat-menu-item routerLink="/gestao/grupos"><app-icone nome="usuarios" /> Grupos agendados</a>
            @if (runsLiberadas) {
              <a mat-menu-item routerLink="/gestao/runs"><app-icone nome="espadas" /> Runs</a>
            }
          }
          @if (auth.ehAdmin()) {
            <a mat-menu-item routerLink="/vinculo/aprovacoes">Aprovar v&#237;nculos</a>
          }
          <a mat-menu-item routerLink="/carteira"><app-icone nome="moedas" /> Carteira</a>
          @if (auth.ehAdmin()) {
            <a mat-menu-item routerLink="/admin/estoque"> <app-icone nome="armazem" /> Estoque </a>
          }
          <button mat-menu-item type="button" (click)="sair()"><app-icone nome="sair" /> Sair</button>
        </mat-menu>
      }
    </header>

    <div class="corpo" [class.sem-menu]="!auth.usuario()">
      @if (auth.usuario()) {
        <nav class="lateral" aria-label="Menu principal">
          <a class="item" routerLink="/loja" routerLinkActive="ativo" ariaCurrentWhenActive="page">
            <app-icone nome="sacola" /> <span>Loja</span>
          </a>
          <a
            class="item"
            routerLink="/instancias-programadas"
            routerLinkActive="ativo"
            ariaCurrentWhenActive="page"
          >
            <app-icone nome="usuarios" /> <span>Inst&acirc;ncias</span>
          </a>
        </nav>
      }
      <main class="principal">
        <router-outlet />
        <p class="credito-imagens">Imagens: Divine Pride · Ragnarok Online © Gravity</p>
      </main>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100%;
    }
    .barra {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      gap: 16px;
      height: 64px;
      padding: 0 20px;
      background: var(--fundo);
      border-bottom: 1px solid var(--borda);
    }
    .marca {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--texto);
      text-decoration: none;
    }
    .marca-icone {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--acento);
      color: var(--sobre-acento);
    }
    .marca-texto {
      display: flex;
      flex-direction: column;
      line-height: 1.15;
    }
    .marca-texto strong {
      font-size: 16px;
    }
    .espaco {
      flex: 1;
    }
    .carteira {
      display: grid;
      text-align: right;
      white-space: nowrap;
    }
    .carteira small {
      color: var(--texto-suave);
      font-size: 11px;
    }
    .carteira strong {
      color: var(--acento-forte);
      font-size: 14px;
    }
    .avatar {
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      overflow: hidden;
      border-radius: 50%;
      background: var(--elevado);
      border: 1px solid var(--borda-forte);
      font-weight: 700;
      color: var(--texto);
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .corpo {
      display: grid;
      grid-template-columns: 236px minmax(0, 1fr);
      gap: 20px;
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }
    .corpo.sem-menu {
      grid-template-columns: minmax(0, 1fr);
    }
    .lateral {
      align-self: start;
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px;
      border: 1px solid var(--borda);
      border-radius: 16px;
      background: var(--superficie);
    }
    .item {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 42px;
      padding: 0 12px;
      border-radius: 10px;
      color: var(--texto);
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      white-space: nowrap;
    }
    .item app-icone {
      color: var(--texto-suave);
    }
    .item:hover {
      background: var(--elevado);
    }
    .item.ativo,
    .item.ativo:hover {
      background: var(--acento);
      color: var(--sobre-acento);
      font-weight: 700;
    }
    .item.ativo app-icone {
      color: var(--sobre-acento);
    }
    .principal {
      min-width: 0;
      container: conteudo / inline-size;
    }
    .principal ::ng-deep .pagina {
      margin-top: 0;
    }

    @media (max-width: 760px) {
      .barra {
        gap: 8px;
        padding-inline: 12px;
      }
      .corpo {
        grid-template-columns: minmax(0, 1fr);
        padding: 12px;
        gap: 12px;
      }
      .lateral {
        padding: 6px;
      }
    }
    @media (max-width: 380px) {
      .avatar {
        width: 32px;
        height: 32px;
      }
      .marca {
        gap: 6px;
      }
      .marca-icone {
        width: 30px;
        height: 30px;
      }
      .marca-texto strong {
        font-size: 14px;
      }
    }
  `,
})
export class AppComponent {
  readonly saldo = inject(SaldoService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  /** O item Runs só aparece com a tela liberada. */
  readonly runsLiberadas = telaLiberada("/gestao/runs");

  readonly nomeUsuario = computed(() => {
    const u = this.auth.usuario();
    return u === null ? "" : (u.globalName ?? u.discordUsername);
  });
  readonly inicial = computed(() => this.nomeUsuario().slice(0, 1).toUpperCase());

  constructor() {
    effect(() => {
      if (this.auth.usuario()?.jogador) void this.saldo.atualizar();
      else this.saldo.limpar();
    });
  }

  async sair(): Promise<void> {
    await this.auth.sair();
    await this.router.navigateByUrl("/login");
  }
}
