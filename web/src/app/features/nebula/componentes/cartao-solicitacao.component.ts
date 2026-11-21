import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from "@angular/core";
import { IconeComponent } from "../../../shared/dominio/icone.component";
import { tomDe } from "../../../shared/dominio/visual";
import { PontosPipe } from "../../../shared/pipes/pontos.pipe";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { CartaoComponent } from "../../../shared/ui/cartao/cartao.component";
import {
  erroDoMotivo,
  ROTULO_STATUS_NEBULA,
  rotuloDaPeca,
  type SolicitacaoNebula,
  tomDoStatus,
} from "../data/nebula.modelos";

/**
 * Uma solicitação de Nebula. Para o membro: a situação e o cancelamento enquanto pendente. Na fila
 * do admin: quem pediu, os materiais por lote, a entrega e a rejeição, que pede o motivo ali mesmo.
 */
@Component({
  selector: "app-cartao-solicitacao",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    IconeComponent,
    PontosPipe,
    BadgeComponent,
    BotaoComponent,
    CampoComponent,
    CampoControleDirective,
    CartaoComponent,
  ],
  template: `
    @let s = solicitacao();
    <ui-cartao role="article" class="cartao" [destaque]="s.status === 'PENDENTE'">
      <span class="arte" [style.color]="tom()" aria-hidden="true">
        <app-icone nome="armadura" [tamanho]="36" [traco]="1.4" />
      </span>
      <div class="corpo">
        <div class="topo">
          <h2>{{ s.receita.nome }}</h2>
          <ui-badge [tom]="tomStatus()">{{ rotulos[s.status] }}</ui-badge>
        </div>
        <p class="meta">
          @if (admin()) {
            <strong>{{ s.jogador.apelido }}</strong> ·
          }
          {{ s.criadaEm | date: "dd/MM/yyyy HH:mm" }} · {{ peca() }} ·
          <span class="valor">{{ s.preco | pontos }}</span> (preço v{{ s.precoReceita.versao }})
        </p>
        <ul class="materiais" aria-label="Materiais">
          @if (admin() && s.status === "PENDENTE") {
            @for (l of s.lotes; track $index) {
              <li>
                {{ l.quantidade }}× {{ l.item }} <small>(lote #{{ l.lote }})</small>
              </li>
            }
          } @else {
            @for (m of s.materiais; track m.itemId) {
              <li>{{ m.quantidade }}× {{ m.item }}</li>
            }
          }
        </ul>
        @if (s.motivo) {
          <p class="meta">Motivo: {{ s.motivo }}</p>
        }
        @if (s.status === "PENDENTE") {
          @if (rejeitando()) {
            <form class="rejeicao" (submit)="$event.preventDefault(); confirmarRejeicao()">
              <ui-campo
                rotulo="Motivo da rejeição"
                dica="O membro vê o motivo. Os pontos e os materiais voltam."
                [erro]="erroMotivo() ?? undefined"
              >
                <textarea
                  uiCampo
                  rows="2"
                  maxlength="300"
                  [value]="motivo()"
                  (input)="motivo.set(valor($event))"
                ></textarea>
              </ui-campo>
              <div class="acoes">
                <button uiBotao variante="perigo" tipo="submit" [carregando]="enviando()">
                  Confirmar rejeição
                </button>
                <button uiBotao variante="fantasma" [disabled]="enviando()" (click)="rejeitando.set(false)">
                  Voltar
                </button>
              </div>
            </form>
          } @else {
            <div class="acoes">
              @if (admin()) {
                <button uiBotao variante="principal" [carregando]="enviando()" (click)="entregar.emit()">
                  Entreguei os materiais
                </button>
                <button uiBotao variante="fantasma" [disabled]="enviando()" (click)="abrirRejeicao()">
                  Rejeitar
                </button>
              } @else {
                <button uiBotao [carregando]="enviando()" (click)="cancelar.emit()">
                  Cancelar solicitação
                </button>
              }
            </div>
          }
        }
      </div>
    </ui-cartao>
  `,
  styles: `
    :host {
      display: block;
    }
    .cartao {
      flex-direction: row;
      align-items: stretch;
      gap: var(--esp-3);
    }
    .arte {
      flex: 0 0 84px;
      display: grid;
      place-items: center;
      min-height: 84px;
      border-radius: var(--raio-m);
      background:
        radial-gradient(ellipse at 50% 55%, var(--acento-fundo), transparent 75%), var(--superficie);
    }
    .corpo {
      flex: 1;
      min-width: 0;
      display: grid;
      gap: var(--esp-2);
      align-content: start;
    }
    .topo {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--esp-2);
    }
    h2 {
      margin: 0;
      font-size: var(--fs-m);
      font-weight: 600;
      color: var(--texto-forte);
      overflow-wrap: anywhere;
    }
    p {
      margin: 0;
    }
    .meta {
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
    .meta strong {
      color: var(--texto);
    }
    .valor {
      color: var(--texto-forte);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .materiais {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-1);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .materiais li {
      padding: 0 var(--esp-2);
      border-radius: var(--raio-total);
      background: var(--elevado);
      font-size: var(--fs-s);
      line-height: 1.8;
      color: var(--texto);
    }
    .materiais small {
      color: var(--texto-suave);
    }
    .rejeicao {
      display: grid;
      gap: var(--esp-2);
      max-width: 520px;
    }
    .acoes {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-2);
    }
    @container conteudo (max-width: 600px) {
      .arte {
        display: none;
      }
    }
  `,
})
export class CartaoSolicitacaoComponent {
  readonly solicitacao = input.required<SolicitacaoNebula>();
  /** Fila do admin: mostra quem pediu, os lotes, entregar e rejeitar. */
  readonly admin = input(false);
  readonly enviando = input(false);
  readonly entregar = output();
  readonly rejeitar = output<string>();
  readonly cancelar = output();

  protected readonly rotulos = ROTULO_STATUS_NEBULA;
  protected readonly rejeitando = signal(false);
  protected readonly motivo = signal("");
  /** O erro do motivo só aparece depois da primeira tentativa (§6.4). */
  private readonly tentou = signal(false);
  protected readonly erroMotivo = computed(() => (this.tentou() ? erroDoMotivo(this.motivo()) : null));
  protected readonly tom = computed(() => tomDe(this.solicitacao().receita.nome));
  protected readonly tomStatus = computed(() => tomDoStatus(this.solicitacao().status));
  protected readonly peca = computed(() => rotuloDaPeca(this.solicitacao()));

  protected valor(evento: Event): string {
    return (evento.target as HTMLTextAreaElement).value;
  }

  protected abrirRejeicao(): void {
    this.motivo.set("");
    this.tentou.set(false);
    this.rejeitando.set(true);
  }

  protected confirmarRejeicao(): void {
    this.tentou.set(true);
    if (erroDoMotivo(this.motivo()) !== null || this.enviando()) return;
    this.rejeitar.emit(this.motivo().trim());
  }
}
