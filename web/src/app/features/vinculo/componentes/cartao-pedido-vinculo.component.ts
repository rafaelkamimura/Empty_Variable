import { ChangeDetectionStrategy, Component, computed, input, output, signal } from "@angular/core";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { CartaoComponent } from "../../../shared/ui/cartao/cartao.component";
import { erroDoMotivo, type Solicitacao } from "../data/vinculo.modelos";

/**
 * Uma solicitação de vínculo na fila do admin (D12): quem pediu, os personagens e as ações. Quem
 * pediu não aprova o próprio vínculo. A rejeição pede o motivo ali mesmo (de 3 a 500 caracteres).
 */
@Component({
  selector: "app-cartao-pedido-vinculo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotaoComponent, CampoComponent, CampoControleDirective, CartaoComponent],
  template: `
    @let p = pedido();
    <ui-cartao role="article">
      <h2>{{ p.jogador?.apelido ?? p.apelidoProposto }}</h2>
      <p class="meta">Discord: {{ p.usuario.globalName ?? p.usuario.discordUsername }}</p>
      <ul class="personagens" aria-label="Personagens">
        @if (p.fichas?.length) {
          @for (ficha of p.fichas; track ficha.nome) {
            <li>{{ ficha.nome }} · {{ nomeDaClasse()(ficha.classeId) }} · Nível {{ ficha.nivelBase }}</li>
          }
        } @else {
          @for (nome of p.personagensNovos; track nome) {
            <li>{{ nome }}</li>
          }
        }
      </ul>
      @if (rejeitando()) {
        <form class="rejeicao" (submit)="$event.preventDefault(); confirmarRejeicao()">
          <ui-campo
            rotulo="Motivo da rejeição"
            dica="O membro vê o motivo e pode corrigir e enviar de novo."
            [erro]="erroMotivo() ?? ''"
          >
            <textarea
              uiCampo
              rows="2"
              maxlength="500"
              [value]="motivo()"
              (input)="motivo.set(texto($event))"
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
          @if (proprio()) {
            <p class="meta">Outro administrador precisa aprovar este vínculo.</p>
          } @else {
            <button uiBotao variante="principal" [carregando]="enviando()" (click)="aprovar.emit()">
              Aprovar vínculo
            </button>
          }
          <button uiBotao variante="fantasma" [disabled]="enviando()" (click)="abrirRejeicao()">
            Rejeitar
          </button>
        </div>
      }
    </ui-cartao>
  `,
  styles: `
    :host {
      display: block;
    }
    h2 {
      margin: 0;
      font-size: var(--fs-l);
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
    .personagens {
      display: grid;
      gap: var(--esp-1);
      margin: 0;
      padding: 0;
      list-style: none;
      color: var(--texto);
      overflow-wrap: anywhere;
    }
    .rejeicao {
      display: grid;
      gap: var(--esp-2);
      max-width: 520px;
    }
    .acoes {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--esp-2);
    }
  `,
})
export class CartaoPedidoVinculoComponent {
  readonly pedido = input.required<Solicitacao>();
  /** Nome oficial da classe pelo id. */
  readonly nomeDaClasse = input.required<(id: string) => string>();
  /** O pedido é do próprio admin logado (não pode aprovar). */
  readonly proprio = input(false);
  readonly enviando = input(false);
  readonly aprovar = output();
  readonly rejeitar = output<string>();

  protected readonly rejeitando = signal(false);
  protected readonly motivo = signal("");
  private readonly tentou = signal(false);
  protected readonly erroMotivo = computed(() => (this.tentou() ? erroDoMotivo(this.motivo()) : null));

  protected texto(evento: Event): string {
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
