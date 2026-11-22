import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";
import { diaDoJogo, formatarZeny, horaDoServidor, ROTULO_RECARGA, rotuloDoDia } from "@betel/farm";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CartaoComponent } from "../../../shared/ui/cartao/cartao.component";
import { type InstanciaFarm, type SituacaoCard, textoDosDrops } from "../data/farm.modelos";

/**
 * Uma instância no dia de um personagem: verde quando feita (com os drops e quando libera), ou
 * disponível para o check-in. O editor de drops entra pelo conteúdo projetado, quando aberto.
 */
@Component({
  selector: "app-cartao-instancia",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, BotaoComponent, CartaoComponent],
  template: `
    <ui-cartao
      role="article"
      class="cartao"
      [class.feita]="situacao().feita"
      [attr.data-testid]="'inst-' + instancia().nome"
    >
      <div class="topo">
        <h3>{{ instancia().nome }}</h3>
        <ui-badge [tom]="situacao().feita ? 'sucesso' : 'neutro'">{{ recarga() }}</ui-badge>
      </div>
      @if (situacao().feita && situacao().checkin; as c) {
        <p class="feito">✓ Feita {{ diaFeito() }} às {{ hora(c.feitoEm) }}</p>
        <p class="drops">
          {{ drops() }}
          @if (valor() > 0) {
            · <span class="zeny">{{ zeny(valor()) }}</span>
          }
        </p>
        <p class="dica">Libera {{ libera() }} às 04:00</p>
      } @else {
        @if (!aberto()) {
          <p class="drops">{{ nomesDrops() }}</p>
        }
        @if (situacao().diaFeita !== null) {
          <p class="dica">Última vez: {{ ultimaVez() }}</p>
        }
      }
      @if (aberto()) {
        <ng-content />
      } @else if (situacao().feita && situacao().checkin) {
        <div class="acoes">
          <button uiBotao tamanho="p" (click)="editar.emit()">Editar drops</button>
          <button uiBotao variante="perigo" tamanho="p" (click)="desfazer.emit()">Desfazer check-in</button>
        </div>
      } @else {
        <div class="acoes">
          <button uiBotao variante="principal" (click)="checkin.emit()">Check-in</button>
        </div>
      }
    </ui-cartao>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .cartao {
      height: 100%;
    }
    .cartao.feita {
      border-color: var(--sucesso);
      background: linear-gradient(var(--sucesso-fundo), var(--sucesso-fundo)), var(--cartao);
    }
    .topo {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--esp-2);
    }
    h3 {
      margin: 0;
      font-size: var(--fs-l);
      font-weight: 600;
      color: var(--texto-forte);
      overflow-wrap: anywhere;
    }
    p {
      margin: 0;
    }
    .feito {
      font-weight: 600;
      color: var(--sucesso);
    }
    .drops {
      color: var(--texto);
      overflow-wrap: anywhere;
    }
    .zeny {
      color: var(--alerta);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .dica {
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
    .acoes {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-2);
      margin-top: auto;
      padding-top: var(--esp-1);
    }
  `,
})
export class CartaoInstanciaComponent {
  readonly instancia = input.required<InstanciaFarm>();
  readonly situacao = input.required<SituacaoCard>();
  /** Dia do jogo de hoje (para "hoje", "ontem", "seg 24/11"). */
  readonly hoje = input.required<number>();
  /** Nomes dos itens que a instância costuma dropar. */
  readonly nomesDrops = input.required<string>();
  /** Valor em zeny dos drops do check-in feito. */
  readonly valor = input(0);
  /** O editor de drops está aberto neste cartão (vem pelo conteúdo projetado). */
  readonly aberto = input(false);

  readonly checkin = output();
  readonly editar = output();
  readonly desfazer = output();

  protected readonly recarga = computed(() => ROTULO_RECARGA[this.instancia().recarga]);
  protected readonly drops = computed(() => {
    const c = this.situacao().checkin;
    return c ? textoDosDrops(c) : "";
  });
  protected readonly diaFeito = computed(() => {
    const c = this.situacao().checkin;
    return c ? rotuloDoDia(diaDoJogo(Date.parse(c.feitoEm)), this.hoje()) : "";
  });
  protected readonly libera = computed(() => {
    const s = this.situacao();
    return s.feita ? rotuloDoDia(s.liberaNoDia, this.hoje()) : "";
  });
  protected readonly ultimaVez = computed(() => {
    const d = this.situacao().diaFeita;
    return d === null ? "" : rotuloDoDia(d, this.hoje());
  });

  protected hora(iso: string): string {
    return horaDoServidor(Date.parse(iso));
  }

  protected zeny(v: number): string {
    return formatarZeny(v);
  }
}
