import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { IconeComponent, type NomeIcone } from "../shared/dominio/icone.component";

export interface ItemMenu {
  readonly rota: string;
  readonly rotulo: string;
  readonly icone: NomeIcone;
}

/**
 * Menu principal da casca (diretrizes §3, layout/). O item ativo ganha o fundo do acento e o
 * indicador lateral (`--acento-suave`), e anuncia `aria-current="page"`.
 */
@Component({
  selector: "app-menu-lateral",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconeComponent],
  template: `
    <nav aria-label="Menu principal">
      @for (item of itens(); track item.rota) {
        <a class="item" [routerLink]="item.rota" routerLinkActive="ativo" ariaCurrentWhenActive="page">
          <app-icone [nome]="item.icone" />
          <span>{{ item.rotulo }}</span>
        </a>
      }
    </nav>
  `,
  styles: `
    :host {
      display: block;
    }
    nav {
      display: flex;
      flex-direction: column;
      gap: var(--esp-1);
      padding: var(--esp-2);
      border: 1px solid var(--borda);
      border-radius: var(--raio-g);
      background: var(--superficie);
    }
    .item {
      display: flex;
      align-items: center;
      gap: var(--esp-3);
      min-height: 44px;
      padding: 0 var(--esp-3);
      border-radius: var(--raio-m);
      color: var(--texto);
      font-size: var(--fs-m);
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
      transition: background var(--duracao) var(--curva);
    }
    .item app-icone {
      flex: none;
      color: var(--texto-suave);
    }
    .item:hover {
      background: var(--elevado);
    }
    .item.ativo {
      background: var(--acento-fundo);
      color: var(--texto-forte);
      box-shadow: inset 3px 0 0 var(--acento-suave);
    }
    .item.ativo app-icone {
      color: var(--acento);
    }

    @media (max-width: 760px) {
      nav {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        padding: var(--esp-1);
      }
      .item {
        gap: var(--esp-2);
        padding: 0 var(--esp-2);
        font-size: var(--fs-s);
        white-space: normal;
      }
    }
  `,
})
export class MenuLateralComponent {
  readonly itens = input.required<readonly ItemMenu[]>();
}
