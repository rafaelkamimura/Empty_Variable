import { ChangeDetectionStrategy, Component, input, signal } from "@angular/core";
import { ehRecarga, RECARGAS, type Recarga, ROTULO_RECARGA } from "@betel/farm";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { CartaoComponent } from "../../../shared/ui/cartao/cartao.component";
import type { InstanciaCatalogo } from "../data/farm.modelos";

export interface NovaInstancia {
  nome: string;
  recarga: Recarga;
  /** Instância do catálogo de onde partiu (só se o nome não foi trocado). */
  instanciaId: string | null;
}

/** Formulário da instância nova, podendo partir do catálogo do grupo (nome e recarga sugerida). */
@Component({
  selector: "app-nova-instancia",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotaoComponent, CampoComponent, CampoControleDirective, CartaoComponent],
  template: `
    <ui-cartao>
      <form (submit)="$event.preventDefault(); enviar()">
        <h3>Nova instância</h3>
        @if (catalogo().length > 0) {
          <ui-campo rotulo="Partir do catálogo do grupo">
            <select uiCampo (change)="usarCatalogo(valor($event))">
              <option value="">Do catálogo do grupo (opcional)</option>
              @for (c of catalogo(); track c.id) {
                <option [value]="c.id" [selected]="doCatalogo() === c.id">{{ c.nome }}</option>
              }
            </select>
          </ui-campo>
        }
        <div class="linha">
          <ui-campo class="nome" rotulo="Nome da nova instância">
            <input
              uiCampo
              type="text"
              placeholder="Nome da instância"
              maxlength="80"
              [value]="nome()"
              (input)="nome.set(valor($event))"
            />
          </ui-campo>
          <ui-campo class="recarga" rotulo="Recarga da nova instância">
            <select uiCampo (change)="mudarRecarga(valor($event))">
              @for (r of recargas; track r) {
                <option [value]="r" [selected]="recarga() === r">{{ rotuloRecarga[r] }}</option>
              }
            </select>
          </ui-campo>
          <button
            uiBotao
            variante="principal"
            tipo="submit"
            [carregando]="enviando()"
            [disabled]="nome().trim() === ''"
          >
            Adicionar instância
          </button>
        </div>
        <p class="dica">
          A instância nova já vem marcada para todos os seus personagens; ajuste em “Quem faz”.
        </p>
      </form>
    </ui-cartao>
  `,
  styles: `
    form {
      display: grid;
      gap: var(--esp-2);
    }
    h3 {
      margin: 0;
      font-size: var(--fs-s);
      font-weight: 600;
      color: var(--texto-suave);
    }
    .linha {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--esp-2);
    }
    .linha .nome {
      flex: 1 1 200px;
    }
    .linha .recarga {
      flex: 0 1 180px;
    }
    .dica {
      margin: 0;
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
  `,
})
export class NovaInstanciaComponent {
  readonly catalogo = input.required<readonly InstanciaCatalogo[]>();
  /** Cria a instância; com sucesso, o formulário se limpa. */
  readonly criar = input.required<(nova: NovaInstancia) => Promise<boolean>>();

  protected readonly recargas = RECARGAS;
  protected readonly rotuloRecarga = ROTULO_RECARGA;
  protected readonly nome = signal("");
  protected readonly recarga = signal<Recarga>("DIARIA");
  protected readonly doCatalogo = signal<string | null>(null);
  protected readonly enviando = signal(false);

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected usarCatalogo(id: string): void {
    this.doCatalogo.set(id || null);
    const c = this.catalogo().find((x) => x.id === id);
    if (!c) return;
    this.nome.set(c.nome);
    if (c.recargaSugerida) this.recarga.set(c.recargaSugerida);
  }

  protected mudarRecarga(valor: string): void {
    if (ehRecarga(valor)) this.recarga.set(valor);
  }

  protected async enviar(): Promise<void> {
    const nome = this.nome().trim();
    if (!nome || this.enviando()) return;
    const c = this.catalogo().find((x) => x.id === this.doCatalogo() && x.nome === nome);
    this.enviando.set(true);
    const ok = await this.criar()({ nome, recarga: this.recarga(), instanciaId: c?.id ?? null });
    this.enviando.set(false);
    if (ok) {
      this.nome.set("");
      this.doCatalogo.set(null);
    }
  }
}
