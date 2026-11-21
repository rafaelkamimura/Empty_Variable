import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";
import { ImagemItemComponent } from "../../../shared/dominio/imagem-item.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { chanceDoLoot, nomeDoLoot, origensDoLoot, resumoDoLoot } from "../data/cadastro.modelos";
import type { ItemLoot, LootInstancia } from "../data/farm.modelos";

/**
 * D60: loot de uma instância do catálogo (recompensas pela browiki e drops dos chefes pela Divine
 * Pride), com o que ainda falta nos drops da instância do diário.
 */
@Component({
  selector: "app-loot-instancia",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ImagemItemComponent, BotaoComponent],
  template: `
    <h4>Loot da instância</h4>
    @if (loot(); as l) {
      <p class="dica">{{ resumo() }}</p>
      @if (faltam().length > 0) {
        <button uiBotao tamanho="p" (click)="adicionar.emit(faltam())">
          Adicionar os {{ faltam().length }} aos drops
        </button>
        <ul>
          @for (item of faltam(); track item.idJogo) {
            <li>
              <span class="nome" [title]="origens(item)">
                <app-imagem-item [idJogo]="item.idJogo" [nome]="nome(item)" [tamanho]="24" />
                {{ nome(item) }}
              </span>
              <span class="chance">{{ chance(item) }}</span>
              <button
                uiBotao
                variante="fantasma"
                tamanho="p"
                (click)="adicionar.emit([item])"
                [attr.aria-label]="'Adicionar ' + nome(item)"
              >
                Adicionar
              </button>
            </li>
          }
        </ul>
      } @else if (l.itens.length > 0) {
        <p class="dica">Todo o loot já está nos drops.</p>
      }
      @if (l.pendentes > 0) {
        <button uiBotao tamanho="p" [carregando]="carregando()" (click)="ver.emit()">
          Buscar o que falta
        </button>
      }
    } @else {
      <p class="dica">
        Recompensas da instância (browiki) e o que os chefes dela dropam (Divine Pride, servidor LATAM).
      </p>
      <button uiBotao tamanho="p" [carregando]="carregando()" (click)="ver.emit()">
        Ver loot da instância
      </button>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-2);
      justify-items: start;
    }
    h4 {
      margin: 0;
      font-size: var(--fs-s);
      font-weight: 600;
      color: var(--texto-suave);
    }
    p {
      margin: 0;
    }
    .dica {
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
    ul {
      display: grid;
      gap: var(--esp-1);
      width: 100%;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      align-items: center;
      gap: var(--esp-2);
    }
    .nome {
      display: inline-flex;
      align-items: center;
      gap: var(--esp-2);
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .chance {
      font-size: var(--fs-s);
      color: var(--texto-suave);
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class LootInstanciaComponent {
  /** Loot já buscado (null enquanto não foi). */
  readonly loot = input.required<LootInstancia | null>();
  /** Itens do loot que ainda não estão nos drops. */
  readonly faltam = input.required<readonly ItemLoot[]>();
  readonly carregando = input(false);
  readonly ver = output();
  readonly adicionar = output<readonly ItemLoot[]>();

  protected readonly resumo = computed(() => {
    const l = this.loot();
    return l ? resumoDoLoot(l) : "";
  });
  protected nome(item: ItemLoot): string {
    return nomeDoLoot(item);
  }
  protected chance(item: ItemLoot): string {
    return chanceDoLoot(item);
  }
  protected origens(item: ItemLoot): string {
    return origensDoLoot(item);
  }
}
