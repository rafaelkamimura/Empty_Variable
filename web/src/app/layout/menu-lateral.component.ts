import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { IconeComponent, type NomeIcone } from "../shared/dominio/icone.component";

export interface ItemMenu {
  readonly rota: string;
  readonly rotulo: string;
  readonly icone: NomeIcone;
}

/**
 * Menu principal da casca (diretrizes §3, layout/), em trilho: cada item tem o ícone sobre o
 * rótulo, para sobrar largura ao conteúdo. No celular, os itens ficam lado a lado. O item ativo ganha o fundo do acento e o
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
          <app-icone [nome]="item.icone" [tamanho]="24" />
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
      padding: var(--esp-1);
      border: 1px solid var(--borda);
      border-radius: var(--raio-g);
      background: var(--superficie);
    }
    .item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--esp-1);
      min-height: 60px;
      padding: var(--esp-2) var(--esp-1);
      border-radius: var(--raio-m);
      color: var(--texto-suave);
      font-size: var(--fs-xs);
      font-weight: 600;
      line-height: 1.2;
      text-align: center;
      text-decoration: none;
      transition:
        background var(--duracao) var(--curva),
        color var(--duracao) var(--curva);
    }
    .item app-icone {
      flex: none;
    }
    .item:hover {
      background: var(--elevado);
      color: var(--texto);
    }
    .item.ativo {
      background: var(--acento-fundo);
      color: var(--texto-forte);
      box-shadow: inset 3px 0 0 var(--acento-suave);
    }
    .item.ativo app-icone {
      color: var(--acento);
    }

    /* No celular, uma faixa: os itens dividem a largura por igual e o indicador vai para baixo. */
    @media (max-width: 760px) {
      nav {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: minmax(0, 1fr);
      }
      .item.ativo {
        box-shadow: inset 0 -3px 0 var(--acento-suave);
      }
    }
  `,
})
export class MenuLateralComponent {
  readonly itens = input.required<readonly ItemMenu[]>();
}
