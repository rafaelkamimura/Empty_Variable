import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";
import { MatMenuModule } from "@angular/material/menu";
import { RouterLink } from "@angular/router";
import { IconeComponent } from "../core/icone.component";
import type { UsuarioMe } from "../core/modelos";
import { formatarPontos } from "../shared/pipes/pontos.pipe";
import { MarcaComponent } from "../shared/ui/marca/marca.component";

/**
 * Topo da casca (diretrizes §2.4): a marca {∅_}, o saldo com o brilho da aurora atrás e o menu
 * do perfil. A faixa fina da aurora fica na borda de baixo.
 */
@Component({
  selector: "app-topo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatMenuModule, IconeComponent, MarcaComponent],
  template: `
    <header class="topo">
      <a routerLink="/" class="inicio" aria-label="Empty Variable, início">
        <ui-marca />
        <span class="nome">Empty Variable</span>
      </a>
      <span class="espaco"></span>
      @let u = usuario();
      <div class="carteira" aria-label="Saldo da carteira" data-testid="saldo-topo">
        <small>Carteira</small>
        <strong>{{ textoSaldo() }}</strong>
      </div>
      <button
        type="button"
        class="avatar"
        [matMenuTriggerFor]="menuPerfil"
        aria-label="Menu do perfil"
        [title]="nome()"
      >
        @if (u.avatarUrl) {
          <img [src]="u.avatarUrl" alt="" />
        } @else {
          {{ inicial() }}
        }
      </button>
      <mat-menu #menuPerfil="matMenu">
        <a mat-menu-item routerLink="/vinculo"><app-icone nome="usuarios" /> Vínculo de jogador</a>
        @if (ehGestor()) {
          <a mat-menu-item routerLink="/gestao/grupos"><app-icone nome="usuarios" /> Grupos agendados</a>
          @if (runsLiberadas()) {
            <a mat-menu-item routerLink="/gestao/runs"><app-icone nome="espadas" /> Runs</a>
          }
        }
        @if (ehAdmin()) {
          <a mat-menu-item routerLink="/vinculo/aprovacoes"><app-icone nome="usuarios" /> Aprovar vínculos</a>
        }
        <a mat-menu-item routerLink="/carteira"><app-icone nome="moedas" /> Carteira</a>
        @if (ehAdmin()) {
          <a mat-menu-item routerLink="/admin/estoque"><app-icone nome="armazem" /> Estoque</a>
        }
        <button mat-menu-item type="button" (click)="sair.emit()"><app-icone nome="sair" /> Sair</button>
      </mat-menu>
    </header>
  `,
  styles: `
    :host {
      position: sticky;
      top: 0;
      z-index: var(--z-topo);
      display: block;
    }
    .topo {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--esp-4);
      height: 64px;
      padding: 0 var(--esp-5);
      background: var(--superficie);
    }
    .topo::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 2px;
      background: var(--aurora);
      opacity: 0.8;
    }
    .inicio {
      display: flex;
      align-items: center;
      gap: var(--esp-3);
      min-height: 44px;
      color: var(--texto-forte);
      text-decoration: none;
      border-radius: var(--raio-m);
    }
    .nome {
      font-size: var(--fs-l);
      font-weight: 700;
    }
    .espaco {
      flex: 1;
    }
    .carteira {
      position: relative;
      display: grid;
      padding: var(--esp-1) var(--esp-3);
      text-align: right;
      white-space: nowrap;
      isolation: isolate;
    }
    .carteira::before {
      content: "";
      position: absolute;
      inset: -6px -10px;
      z-index: -1;
      border-radius: var(--raio-total);
      background: radial-gradient(
        closest-side,
        color-mix(in srgb, var(--destaque) 22%, transparent),
        transparent
      );
    }
    .carteira small {
      color: var(--texto-suave);
      font-size: var(--fs-xs);
    }
    .carteira strong {
      color: var(--texto-forte);
      font-size: var(--fs-m);
      font-variant-numeric: tabular-nums;
    }
    .avatar {
      flex-shrink: 0;
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      padding: 0;
      overflow: hidden;
      border: 1px solid var(--borda-forte);
      border-radius: var(--raio-total);
      background: var(--elevado);
      color: var(--texto);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Itens do menu do perfil (renderizados no overlay, mas do template deste componente). */

    [mat-menu-item] app-icone {
      margin-right: var(--esp-2);
      color: var(--texto-suave);
      vertical-align: middle;
    }

    @media (max-width: 760px) {
      .topo {
        gap: var(--esp-2);
        padding: 0 var(--esp-3);
      }
    }
    @media (max-width: 420px) {
      .nome {
        display: none;
      }
    }
  `,
})
export class TopoComponent {
  /** Usuário logado (a casca só mostra o topo com usuário). */
  readonly usuario = input.required<UsuarioMe>();
  /** Saldo em pontos (null enquanto carrega). */
  readonly saldo = input<number | null>(null);
  readonly ehGestor = input(false);
  readonly ehAdmin = input(false);
  /** O item Runs só aparece com a tela liberada. */
  readonly runsLiberadas = input(false);
  readonly sair = output();

  protected readonly nome = computed(() => {
    const u = this.usuario();
    return u.globalName ?? u.discordUsername;
  });
  protected readonly inicial = computed(() => this.nome().slice(0, 1).toUpperCase());
  protected readonly textoSaldo = computed(() =>
    this.usuario().jogador ? formatarPontos(this.saldo()) : "Sem vínculo",
  );
}
