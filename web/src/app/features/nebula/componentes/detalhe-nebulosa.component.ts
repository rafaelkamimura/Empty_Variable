import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { PontosPipe } from "../../../shared/pipes/pontos.pipe";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import {
  bloqueioSolicitar,
  faltasDe,
  nomeDaPeca,
  percentual,
  precoDe,
  type ReceitaAberta,
  temPeca,
} from "../data/nebula.modelos";

/**
 * Detalhes de uma Nebulosa (US-17, US-18): a escolha da peça Astral (D31), o que o grupo tem de
 * cada material, o preço (D32), o saldo depois e o limite. O botão Solicitar só habilita quando
 * tudo está disponível (briefing §7); o motivo do bloqueio aparece logo acima.
 */
@Component({
  selector: "app-detalhe-nebulosa",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatSlideToggleModule, AvisoComponent, BotaoComponent, PontosPipe],
  template: `
    @let r = receita();
    @if (comPeca()) {
      <mat-slide-toggle [checked]="trazPeca()" (change)="trazPecaChange.emit($event.checked)"
        >Trago minha {{ peca() }}</mat-slide-toggle
      >
    }
    <h3>Materiais do grupo</h3>
    <ul class="materiais" data-testid="materiais">
      @for (f of faltas(); track f.itemId) {
        <li>
          <span class="nome">{{ f.item }}</span>
          <span class="barra" aria-hidden="true">
            <span class="cheia" [class.falta]="f.falta > 0" [style.width.%]="pct(f.tenho, f.preciso)"></span>
          </span>
          <span class="qtd" [class.falta]="f.falta > 0">{{ f.tenho }}/{{ f.preciso }}</span>
          @if (f.falta > 0) {
            <span class="sr-only">, faltam {{ f.falta }}</span>
          }
        </li>
      }
    </ul>
    <dl class="valores">
      <div>
        <dt>Preço</dt>
        <dd class="forte">{{ preco() | pontos }}</dd>
      </div>
      <div>
        <dt>Saldo depois</dt>
        <dd [class.falta]="saldoDepois() < 0">{{ saldoDepois() | pontos }}</dd>
      </div>
      @if (r.limitePorMembro !== null) {
        <div>
          <dt>Limite</dt>
          <dd>{{ r.limiteRestante }} de {{ r.limitePorMembro }} a cada {{ r.limitePeriodoDias }} dias</dd>
        </div>
      }
    </dl>
    @if (bloqueio(); as b) {
      <ui-aviso tom="alerta">{{ b }}</ui-aviso>
    }
    <div class="acoes">
      <button
        uiBotao
        variante="principal"
        [carregando]="enviando()"
        [disabled]="bloqueio() !== null"
        (click)="solicitar.emit()"
      >
        Solicitar
      </button>
    </div>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
    h3 {
      margin: 0;
      font-size: var(--fs-s);
      font-weight: 600;
      color: var(--texto-suave);
    }
    .materiais {
      display: grid;
      gap: var(--esp-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .materiais li {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(48px, 1fr) auto;
      align-items: center;
      gap: var(--esp-3);
      font-size: var(--fs-s);
    }
    .nome {
      overflow-wrap: anywhere;
      color: var(--texto);
    }
    .barra {
      height: 8px;
      border-radius: var(--raio-total);
      background: var(--elevado);
      overflow: hidden;
    }
    .cheia {
      display: block;
      height: 100%;
      background: var(--acento);
    }
    .cheia.falta {
      background: var(--alerta);
    }
    .qtd {
      text-align: right;
      font-variant-numeric: tabular-nums;
      color: var(--texto);
    }
    .falta {
      color: var(--alerta);
    }
    .valores {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-2) var(--esp-5);
      margin: 0;
    }
    .valores dt {
      font-size: var(--fs-xs);
      color: var(--texto-suave);
    }
    .valores dd {
      margin: 0;
      font-variant-numeric: tabular-nums;
      color: var(--texto);
    }
    .valores dd.forte {
      font-weight: 700;
      color: var(--texto-forte);
    }
    .valores dd.falta {
      color: var(--alerta);
    }
    .acoes {
      display: flex;
      gap: var(--esp-2);
    }
  `,
})
export class DetalheNebulosaComponent {
  readonly receita = input.required<ReceitaAberta>();
  readonly trazPeca = input.required<boolean>();
  readonly saldo = input.required<number>();
  readonly enviando = input(false);
  readonly trazPecaChange = output<boolean>();
  readonly solicitar = output();

  protected readonly comPeca = computed(() => temPeca(this.receita()));
  protected readonly peca = computed(() => nomeDaPeca(this.receita()));
  protected readonly faltas = computed(() => faltasDe(this.receita(), this.trazPeca()));
  protected readonly preco = computed(() => precoDe(this.receita(), this.trazPeca()));
  protected readonly saldoDepois = computed(() => this.saldo() - this.preco());
  protected readonly bloqueio = computed(() =>
    bloqueioSolicitar(this.receita(), this.trazPeca(), this.saldo()),
  );

  protected pct(tenho: number, preciso: number): number {
    return percentual(tenho, preciso);
  }
}
