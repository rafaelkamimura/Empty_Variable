import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";
import { ImagemItemComponent } from "../../../shared/dominio/imagem-item.component";
import { PontosPipe } from "../../../shared/pipes/pontos.pipe";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import { CartaoComponent } from "../../../shared/ui/cartao/cartao.component";
import { type ReceitaAberta, seloDaNebulosa, temPeca } from "../data/nebula.modelos";

/**
 * Uma Nebulosa na vitrine: arte, selo (pode solicitar, faltam materiais, limite), nome e as duas
 * modalidades (trazendo a peça e com a peça do estoque), com preço e quantas o grupo consegue
 * montar. O cartão inteiro é o botão que abre os detalhes.
 */
@Component({
  selector: "app-cartao-nebulosa",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, CartaoComponent, ImagemItemComponent, PontosPipe],
  template: `
    @let r = receita();
    <button
      uiCartao
      class="cartao"
      [destaque]="selecionada()"
      (click)="abrir.emit()"
      [attr.aria-label]="'Ver ' + r.nome"
    >
      <span class="arte">
        <app-imagem-item
          [idJogo]="r.itemProduzido.idJogo"
          [nome]="r.nome"
          [tamanho]="72"
          [ilustracao]="true"
        />
        <ui-badge class="selo" [tom]="selo().tom">{{ selo().texto }}</ui-badge>
      </span>
      <strong class="nome">{{ r.nome }}</strong>
      <span class="modos">
        <span class="modo">
          <span class="rotulo">Trazendo a peça</span>
          <span
            >{{ r.precoVigente?.precoTrazendoPeca | pontos }} ·
            {{ r.disponibilidade.trazendoPeca }} disponível(is)</span
          >
        </span>
        @if (comPeca()) {
          <span class="modo">
            <span class="rotulo">Peça do estoque</span>
            <span
              >{{ r.precoVigente?.precoComPeca | pontos }} ·
              {{ r.disponibilidade.comPecaDoEstoque }} disponível(is)</span
            >
          </span>
        }
      </span>
    </button>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .cartao {
      width: 100%;
      height: 100%;
      padding: 0;
      gap: var(--esp-1);
      overflow: hidden;
    }
    .arte {
      position: relative;
      display: grid;
      place-items: center;
      aspect-ratio: 4 / 3;
      min-height: 96px;
      background:
        radial-gradient(ellipse at 50% 55%, var(--acento-fundo), transparent 75%), var(--superficie);
    }
    .selo {
      position: absolute;
      top: var(--esp-2);
      left: var(--esp-2);
    }
    .nome {
      padding: var(--esp-2) var(--esp-3) 0;
      font-size: var(--fs-m);
      font-weight: 600;
      color: var(--texto-forte);
      overflow-wrap: anywhere;
    }
    .modos {
      display: grid;
      gap: var(--esp-1);
      padding: 0 var(--esp-3) var(--esp-3);
      font-size: var(--fs-s);
      color: var(--texto);
      font-variant-numeric: tabular-nums;
    }
    .modo {
      display: grid;
    }
    .rotulo {
      font-size: var(--fs-xs);
      color: var(--texto-suave);
    }
  `,
})
export class CartaoNebulosaComponent {
  readonly receita = input.required<ReceitaAberta>();
  readonly selecionada = input(false);
  readonly abrir = output();

  protected readonly selo = computed(() => seloDaNebulosa(this.receita()));
  protected readonly comPeca = computed(() => temPeca(this.receita()));
}
