import { ChangeDetectionStrategy, Component, computed, input, output, signal } from "@angular/core";
import { formatarPontos } from "../../../shared/pipes/pontos.pipe";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import type { ItemOfertavel } from "../data/loja.modelos";

/** Conteúdo do painel "Nova oferta": item e quantidade. Só apresenta; a página envia. */
@Component({
  selector: "app-formulario-oferta",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvisoComponent, BotaoComponent, CampoComponent, CampoControleDirective],
  template: `
    @if (itens().length === 0) {
      <ui-aviso tom="info">Nenhum item pode ser oferecido no momento.</ui-aviso>
    } @else {
      <form class="formulario" (submit)="$event.preventDefault(); enviarSePuder()">
        <ui-campo rotulo="Item">
          <select uiCampo [value]="itemId()" (change)="itemId.set(valor($event))">
            <option value="" disabled>Escolha o item</option>
            @for (i of itens(); track i.id) {
              <option [value]="i.id">
                {{ i.nome }} · {{ i.precoVigente === null ? "sem preço ainda" : pontos(i.precoVigente) }}
              </option>
            }
          </select>
        </ui-campo>
        <ui-campo rotulo="Quantidade">
          <input
            uiCampo
            type="number"
            inputmode="numeric"
            min="1"
            step="1"
            [value]="quantidade()"
            (input)="quantidade.set(numero($event))"
          />
        </ui-campo>
        <button uiBotao variante="principal" type="submit" [carregando]="enviando()" [disabled]="!valida()">
          Oferecer
        </button>
      </form>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .formulario {
      display: grid;
      gap: var(--esp-3);
    }
  `,
})
export class FormularioOfertaComponent {
  readonly itens = input.required<readonly ItemOfertavel[]>();
  readonly enviando = input(false);
  readonly enviar = output<{ itemId: string; quantidade: number }>();

  protected readonly itemId = signal("");
  protected readonly quantidade = signal(1);
  protected readonly valida = computed(
    () => this.itemId() !== "" && Number.isInteger(this.quantidade()) && this.quantidade() >= 1,
  );
  protected readonly pontos = formatarPontos;

  protected valor(evento: Event): string {
    return (evento.target as HTMLSelectElement).value;
  }

  protected numero(evento: Event): number {
    return (evento.target as HTMLInputElement).valueAsNumber;
  }

  protected enviarSePuder(): void {
    if (this.valida() && !this.enviando())
      this.enviar.emit({ itemId: this.itemId(), quantidade: this.quantidade() });
  }
}
