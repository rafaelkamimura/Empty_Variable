import { ChangeDetectionStrategy, Component, computed, input, output, signal } from "@angular/core";
import { PontosPipe } from "../../../shared/pipes/pontos.pipe";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { SkeletonComponent } from "../../../shared/ui/skeleton/skeleton.component";
import {
  type Destinatario,
  idTransferencia,
  type PedidoTransferencia,
  pontosValidos,
} from "../data/carteira.modelos";

interface Revisao {
  id: string;
  destinatario: Destinatario;
  pontos: number;
}

/**
 * Conteúdo do painel "Transferir pontos", em dois passos: escolher destinatário e pontos, depois
 * revisar e confirmar. O id da transferência nasce na revisão e se mantém nas novas tentativas,
 * para a API não duplicar o envio. Só apresenta; a página carrega os destinatários e envia.
 */
@Component({
  selector: "app-formulario-transferencia",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PontosPipe,
    AvisoComponent,
    BotaoComponent,
    CampoComponent,
    CampoControleDirective,
    SkeletonComponent,
  ],
  template: `
    <p class="saldo">
      Saldo disponível <strong>{{ saldo() | pontos }}</strong>
    </p>
    @if (erro(); as mensagem) {
      <ui-aviso tom="erro">{{ mensagem }}</ui-aviso>
    }
    @if (revisao(); as r) {
      <p>
        Enviar <strong>{{ r.pontos | pontos }}</strong> para <strong>{{ r.destinatario.apelido }}</strong>?
      </p>
      <p>Saldo após o envio: {{ saldo() - r.pontos | pontos }}.</p>
      <div class="acoes">
        <button
          uiBotao
          variante="principal"
          [carregando]="enviando()"
          (click)="confirmar.emit({ id: r.id, destinatarioId: r.destinatario.id, pontos: r.pontos })"
        >
          Confirmar transferência
        </button>
        <button uiBotao [disabled]="enviando()" (click)="revisao.set(null)">Voltar</button>
      </div>
    } @else if (carregando()) {
      <ui-skeleton [quantidade]="2" />
      <span class="sr-only" role="status">Buscando jogadores</span>
    } @else if (destinatarios().length === 0) {
      <ui-aviso tom="info">Nenhum outro jogador com vínculo ativo disponível.</ui-aviso>
    } @else {
      <form class="formulario" (submit)="$event.preventDefault(); revisar()">
        <ui-campo rotulo="Destinatário">
          <select uiCampo [value]="destinatarioId()" (change)="destinatarioId.set(texto($event))">
            <option value="">Selecione um jogador</option>
            @for (jogador of destinatarios(); track jogador.id) {
              <option [value]="jogador.id">{{ jogador.apelido }}</option>
            }
          </select>
        </ui-campo>
        <ui-campo rotulo="Pontos" [dica]="'Até ' + (saldo() | pontos)">
          <input
            uiCampo
            type="number"
            inputmode="numeric"
            min="1"
            [max]="saldo()"
            step="1"
            [value]="pontos() ?? ''"
            (input)="pontos.set(numero($event))"
          />
        </ui-campo>
        <button uiBotao variante="principal" type="submit" [disabled]="!valido()">
          Revisar transferência
        </button>
      </form>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
    p {
      margin: 0;
    }
    .saldo {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--esp-2);
      padding: var(--esp-3);
      border: 1px solid var(--borda);
      border-radius: var(--raio-m);
      background: var(--cartao);
      color: var(--texto-suave);
    }
    .saldo strong {
      color: var(--texto-forte);
      font-variant-numeric: tabular-nums;
    }
    .formulario {
      display: grid;
      gap: var(--esp-3);
    }
    .acoes {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-2);
    }
  `,
})
export class FormularioTransferenciaComponent {
  readonly saldo = input.required<number>();
  readonly destinatarios = input<readonly Destinatario[]>([]);
  readonly carregando = input(false);
  readonly enviando = input(false);
  readonly erro = input<string | null>(null);
  readonly confirmar = output<PedidoTransferencia>();

  protected readonly destinatarioId = signal("");
  protected readonly pontos = signal<number | null>(null);
  protected readonly revisao = signal<Revisao | null>(null);
  protected readonly valido = computed(
    () => this.destinatarioId() !== "" && pontosValidos(this.pontos(), this.saldo()),
  );

  protected texto(evento: Event): string {
    return (evento.target as HTMLSelectElement).value;
  }

  protected numero(evento: Event): number | null {
    const v = (evento.target as HTMLInputElement).valueAsNumber;
    return Number.isNaN(v) ? null : v;
  }

  protected revisar(): void {
    const destinatario = this.destinatarios().find((j) => j.id === this.destinatarioId());
    const pontos = this.pontos();
    if (!destinatario || pontos === null || !this.valido()) return;
    this.revisao.set({ id: idTransferencia(), destinatario, pontos });
  }
}
