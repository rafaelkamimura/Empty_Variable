import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { ImagemItemComponent } from "../../../shared/dominio/imagem-item.component";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CartaoComponent } from "../../../shared/ui/cartao/cartao.component";
import type { DetalheRun, ResultadoDropsRun } from "../data/detalhe-run.modelos";

/** Itens obtidos na run e o lançamento no estoque do grupo (D18), cada drop uma vez. */
@Component({
  selector: "app-drops-run",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ImagemItemComponent, AvisoComponent, BadgeComponent, BotaoComponent, CartaoComponent],
  template: `
    <div class="grade" data-testid="runs-drops">
      @for (d of drops(); track d.id) {
        <ui-cartao role="article">
          <div class="topo">
            <app-imagem-item [idJogo]="d.item.idJogo ?? null" [nome]="d.item.nome" [tamanho]="32" />
            @if (d.lancadoNoEstoque) {
              <ui-badge tom="sucesso">No estoque</ui-badge>
            }
          </div>
          <div class="rodape">
            <strong>{{ d.item.nome }}</strong>
            <span class="qtd">{{ d.quantidade }}×</span>
          </div>
        </ui-cartao>
      }
    </div>
    @if (podeLancar()) {
      <button uiBotao [carregando]="lancando()" (click)="lancar.emit()">Lançar drops no estoque</button>
    }
    @if (resultado(); as res) {
      @for (n of res.naoLancados; track n.dropId) {
        <ui-aviso tom="alerta">{{ n.item }}: não lançado ({{ n.motivo }})</ui-aviso>
      }
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
      justify-items: start;
    }
    .grade {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 170px), 1fr));
      gap: var(--esp-3);
      width: 100%;
    }
    .topo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--esp-2);
    }
    .rodape {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--esp-2);
    }
    strong {
      color: var(--texto-forte);
      overflow-wrap: anywhere;
    }
    .qtd {
      font-weight: 700;
      color: var(--texto-forte);
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class DropsRunComponent {
  readonly drops = input.required<DetalheRun["drops"]>();
  /** Admin, run não estornada e com drops ainda fora do estoque. */
  readonly podeLancar = input(false);
  readonly lancando = input(false);
  readonly resultado = input<ResultadoDropsRun | null>(null);
  readonly lancar = output();
}
