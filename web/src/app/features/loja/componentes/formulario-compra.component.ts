import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from "@angular/core";
import { ImagemItemComponent } from "../../../shared/dominio/imagem-item.component";
import { PontosPipe } from "../../../shared/pipes/pontos.pipe";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { SkeletonComponent } from "../../../shared/ui/skeleton/skeleton.component";
import { compraValida, type ItemCatalogoLoja, type ItemVitrine, maximoDaCompra } from "../data/loja.modelos";

/**
 * Conteúdo do painel "Solicitar compra": o item, o preço, a quantidade e a confirmação. Só
 * apresenta; a página consulta a vitrine e envia a compra.
 */
@Component({
  selector: "app-formulario-compra",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ImagemItemComponent,
    PontosPipe,
    AvisoComponent,
    BotaoComponent,
    CampoComponent,
    CampoControleDirective,
    SkeletonComponent,
  ],
  template: `
    <div class="item">
      <app-imagem-item
        [idJogo]="item().idJogo"
        [nome]="item().nome"
        [tipo]="item().tipo"
        [tamanho]="64"
        [ilustracao]="true"
      />
      <div>
        <strong class="nome">{{ item().nome }}</strong>
        <p class="meta">{{ item().quantidade }} em estoque</p>
      </div>
    </div>

    @if (sucesso()) {
      <ui-aviso tom="sucesso">Solicitação registrada. O item aguarda entrega no jogo.</ui-aviso>
    } @else if (item().preco === null) {
      <ui-aviso tom="info">O administrador ainda precisa definir o preço de venda.</ui-aviso>
    } @else {
      <p class="preco">{{ preco() | pontos }} por unidade</p>
      @if (!vinculado()) {
        <ui-aviso tom="info"
          >É necessário ter um personagem vinculado à conta para solicitar a compra.</ui-aviso
        >
      } @else if (consultando()) {
        <ui-skeleton [quantidade]="2" />
        <span class="sr-only" role="status">Conferindo disponibilidade</span>
      } @else if (cotacao()) {
        <p class="meta">Disponível para você: {{ maximo() }} un. · Carteira: {{ saldo() | pontos }}</p>
        <ui-campo rotulo="Quantidade" [dica]="'Até ' + maximo() + ' un.'">
          <input
            uiCampo
            type="number"
            inputmode="numeric"
            min="1"
            [max]="maximo()"
            step="1"
            [value]="quantidade()"
            [disabled]="enviando()"
            (input)="definirQuantidade($event)"
            (keydown.enter)="confirmarSePuder()"
          />
        </ui-campo>
        <p class="total">Total: {{ total() | pontos }}</p>
        @if (semSaldo()) {
          <ui-aviso tom="alerta">Saldo insuficiente.</ui-aviso>
        }
        <button
          uiBotao
          variante="principal"
          [carregando]="enviando()"
          [disabled]="!podeComprar()"
          (click)="confirmarSePuder()"
        >
          Confirmar solicitação
        </button>
      }
    }
    @if (erro(); as mensagem) {
      <ui-aviso tom="erro">{{ mensagem }}</ui-aviso>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
    .item {
      display: flex;
      gap: var(--esp-3);
      align-items: center;
    }
    .nome {
      color: var(--texto-forte);
    }
    p {
      margin: 0;
    }
    .meta {
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
    .preco,
    .total {
      font-weight: 700;
      color: var(--texto-forte);
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class FormularioCompraComponent {
  readonly item = input.required<ItemCatalogoLoja>();
  /** Item na vitrine do membro (disponibilidade e limite); null enquanto consulta ou sem vínculo. */
  readonly cotacao = input<ItemVitrine | null>(null);
  readonly saldo = input<number | null>(null);
  readonly vinculado = input(false);
  readonly consultando = input(false);
  readonly enviando = input(false);
  readonly sucesso = input(false);
  readonly erro = input<string | null>(null);
  /** Confirmação com a quantidade escolhida. */
  readonly confirmar = output<number>();

  protected readonly quantidade = signal(1);
  protected readonly preco = computed(() => this.cotacao()?.preco ?? this.item().preco ?? 0);
  protected readonly maximo = computed(() => maximoDaCompra(this.cotacao()));
  /** Total da compra; com o campo vazio ou inválido, 0 (o botão já fica desabilitado). */
  protected readonly total = computed(() => {
    const q = this.quantidade();
    return Number.isFinite(q) ? (this.cotacao()?.preco ?? 0) * q : 0;
  });
  protected readonly semSaldo = computed(() => this.saldo() !== null && this.total() > (this.saldo() ?? 0));
  protected readonly podeComprar = computed(
    () => !this.enviando() && compraValida(this.quantidade(), this.maximo(), this.total(), this.saldo()),
  );

  constructor() {
    // Outro item: a quantidade volta a 1.
    effect(() => {
      this.item();
      this.quantidade.set(1);
    });
  }

  protected definirQuantidade(evento: Event): void {
    this.quantidade.set((evento.target as HTMLInputElement).valueAsNumber);
  }

  protected confirmarSePuder(): void {
    if (this.podeComprar()) this.confirmar.emit(this.quantidade());
  }
}
