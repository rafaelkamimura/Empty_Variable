import { ChangeDetectionStrategy, Component, input, output, signal } from "@angular/core";
import { ImagemItemComponent } from "../../../shared/dominio/imagem-item.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import type { ResultadoBuscaItem } from "../data/farm.modelos";

/** Busca de itens (nome ou ID), fornecida por quem usa o campo: o componente não fala com a API. */
export type BuscarItens = (
  termo: string,
) => Promise<{ resultados: ResultadoBuscaItem[]; divinePride: boolean }>;

export interface ItemEscolhido {
  nome: string;
  idJogo: number | null;
}

const ROTULO_ORIGEM: Record<ResultadoBuscaItem["origem"], string> = {
  "meus-itens": "Meus itens",
  catalogo: "Catálogo do grupo",
  "divine-pride": "Divine Pride",
};

/**
 * D53: campo para achar um item pelo nome ou pelo ID do jogo. Mostra os itens do membro, os do
 * catálogo do grupo e, pelo ID, o nome que a Divine Pride devolve (com o ícone do jogo). Se nada
 * servir, o texto digitado vira um item novo. Combobox com a lista de resultados (Enter confirma,
 * Esc fecha a lista).
 */
@Component({
  selector: "app-farm-busca-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ImagemItemComponent, BotaoComponent],
  template: `
    <div class="busca">
      <div class="linha">
        <input
          type="text"
          [id]="idCampo()"
          [value]="texto()"
          (input)="digitar(valor($event))"
          (keydown.enter)="$event.preventDefault(); confirmar()"
          (keydown.escape)="resultados.set([])"
          [placeholder]="dica()"
          [attr.aria-label]="rotulo()"
          autocomplete="off"
          role="combobox"
          [attr.aria-expanded]="resultados().length > 0"
          [attr.aria-controls]="idCampo() + '-lista'"
        />
        <button uiBotao (click)="confirmar()" [disabled]="texto().trim().length === 0">
          {{ rotuloBotao() }}
        </button>
      </div>
      @if (resultados().length > 0) {
        <ul class="lista" role="listbox" [id]="idCampo() + '-lista'">
          @for (r of resultados(); track r.nome) {
            <li role="option" [attr.aria-selected]="false">
              <button type="button" (click)="escolherResultado(r)">
                <app-imagem-item [idJogo]="r.idJogo" [nome]="r.nome" [tamanho]="24" />
                <span class="nome">{{ r.nome }}</span>
                <span class="origem">{{ origem(r) }}{{ r.idJogo ? " · ID " + r.idJogo : "" }}</span>
              </button>
            </li>
          }
        </ul>
      } @else if (aviso()) {
        <p class="aviso">{{ aviso() }}</p>
      }
    </div>
  `,
  styles: `
    .busca {
      position: relative;
    }
    input {
      box-sizing: border-box;
      flex: 1 1 160px;
      min-width: 0;
      min-height: 40px;
      padding: var(--esp-2) var(--esp-3);
      border: 1px solid var(--borda-campo);
      border-radius: var(--raio-p);
      background: var(--fundo);
      color: var(--texto);
      font: inherit;
    }
    input::placeholder {
      color: var(--texto-apagado);
    }
    /* Em espaço estreito, o botão desce e o campo fica com a largura toda (a dica cabe inteira). */
    .linha {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-2);
    }
    .lista {
      position: absolute;
      z-index: var(--z-topo);
      left: 0;
      right: 0;
      margin: var(--esp-1) 0 0;
      padding: var(--esp-1);
      list-style: none;
      border: 1px solid var(--borda-forte);
      border-radius: var(--raio-m);
      background: var(--elevado);
      box-shadow: var(--sombra-2);
    }
    .lista button {
      display: grid;
      grid-template-columns: 24px minmax(0, 1fr) auto;
      align-items: center;
      gap: var(--esp-2);
      width: 100%;
      min-height: 40px;
      padding: var(--esp-1) var(--esp-2);
      border: 0;
      border-radius: var(--raio-p);
      background: transparent;
      color: var(--texto);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .lista button:hover,
    .lista button:focus-visible {
      background: var(--acento-fundo);
    }
    .nome {
      overflow-wrap: anywhere;
    }
    .origem,
    .aviso {
      font-size: var(--fs-xs);
      color: var(--texto-suave);
    }
    .aviso {
      margin: var(--esp-1) 0 0;
    }
  `,
})
export class FarmBuscaItemComponent {
  /** Como buscar os itens (a página passa a busca do store). */
  readonly buscar = input.required<BuscarItens>();
  readonly idCampo = input.required<string>();
  readonly rotulo = input("Item");
  readonly rotuloBotao = input("Adicionar");
  readonly dica = input("Nome ou ID do item (Divine Pride)");
  readonly escolher = output<ItemEscolhido>();

  readonly texto = signal("");
  readonly resultados = signal<ResultadoBuscaItem[]>([]);
  readonly aviso = signal<string | null>(null);
  private espera: ReturnType<typeof setTimeout> | undefined;
  private versao = 0;

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  origem(r: ResultadoBuscaItem): string {
    return ROTULO_ORIGEM[r.origem];
  }

  digitar(valor: string): void {
    this.texto.set(valor);
    this.aviso.set(null);
    clearTimeout(this.espera);
    const termo = valor.trim();
    const ehId = /^\d+$/.test(termo);
    if (termo.length < 2 && !ehId) {
      this.resultados.set([]);
      return;
    }
    // Pelo ID, espera mais: a Divine Pride pede para não varrer IDs ("501" não busca 5 e 50).
    this.espera = setTimeout(() => void this.consultar(termo, ehId), ehId ? 600 : 250);
  }

  private async consultar(termo: string, ehId: boolean): Promise<void> {
    const minha = ++this.versao;
    try {
      const r = await this.buscar()(termo);
      if (minha !== this.versao) return;
      this.resultados.set(r.resultados);
      if (r.resultados.length === 0) {
        this.aviso.set(
          ehId && !r.divinePride
            ? "Nenhum item conhecido com esse ID. Digite o nome para cadastrar."
            : ehId
              ? "A Divine Pride não conhece esse ID."
              : "Nenhum item encontrado. Confirme para cadastrar um item novo com esse nome.",
        );
      }
    } catch {
      if (minha === this.versao) this.resultados.set([]);
    }
  }

  escolherResultado(r: ResultadoBuscaItem): void {
    this.escolher.emit({ nome: r.nome, idJogo: r.idJogo });
    this.limpar();
  }

  /** Enter ou botão: usa o primeiro resultado com o mesmo nome, ou o texto como item novo. */
  confirmar(): void {
    const termo = this.texto().trim().replace(/\s+/g, " ");
    if (termo === "") return;
    const igual = this.resultados().find((r) => r.nome.toLowerCase() === termo.toLowerCase());
    const unicoPorId = /^\d+$/.test(termo) && this.resultados().length > 0 ? this.resultados()[0] : undefined;
    const escolhido = igual ?? unicoPorId;
    if (escolhido) this.escolher.emit({ nome: escolhido.nome, idJogo: escolhido.idJogo });
    else if (/^\d+$/.test(termo)) {
      this.aviso.set("Digite o nome do item: não há item conhecido com esse ID.");
      return;
    } else this.escolher.emit({ nome: termo.slice(0, 80), idJogo: null });
    this.limpar();
  }

  private limpar(): void {
    clearTimeout(this.espera);
    this.versao++;
    this.texto.set("");
    this.resultados.set([]);
    this.aviso.set(null);
  }
}
