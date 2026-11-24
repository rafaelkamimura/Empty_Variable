import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { mostraNaoIdentificado } from "../data/itens";
import type { ItemPatch } from "../data/relatorio.modelos";
import { TextoRoComponent } from "./texto-ro.component";

/** O corpo da linha de um item: a descrição do jogo, o texto de não identificado e os dados do cliente. */
@Component({
  selector: "app-detalhe-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TextoRoComponent],
  template: `
    @if (item().descricao.length > 0) {
      <app-texto-ro [linhas]="item().descricao" />
    } @else {
      <p class="sem">Sem descrição.</p>
    }
    @if (naoIdentificado()) {
      <div>
        <p class="titulo-bloco">Não identificado: {{ item().nomeNaoIdentificado }}</p>
        <app-texto-ro [linhas]="item().descricaoNaoIdentificada" />
      </div>
    }
    <dl class="dados">
      <div>
        <dt>Sprite</dt>
        <dd>{{ item().recurso || "sem sprite" }}</dd>
      </div>
      <div>
        <dt>Visual (ClassNum)</dt>
        <dd>{{ item().visual }}</dd>
      </div>
      <div>
        <dt>Efeito (EffectID)</dt>
        <dd>{{ item().efeito ?? "nenhum" }}</dd>
      </div>
    </dl>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
    .sem {
      margin: 0;
      color: var(--texto-apagado);
    }
    .titulo-bloco {
      margin: 0 0 var(--esp-1);
      font-size: var(--fs-s);
      font-weight: 600;
      color: var(--texto-suave);
    }
    .dados {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-1) var(--esp-5);
      margin: 0;
      font-size: var(--fs-xs);
      color: var(--texto-suave);
    }
    .dados div {
      display: flex;
      gap: var(--esp-1);
      min-width: 0;
    }
    dt::after {
      content: ":";
    }
    dd {
      margin: 0;
      font-family: var(--fonte-mono);
      color: var(--texto);
      overflow-wrap: anywhere;
    }
  `,
})
export class DetalheItemComponent {
  readonly item = input.required<ItemPatch>();

  protected readonly naoIdentificado = computed(() => mostraNaoIdentificado(this.item()));
}
