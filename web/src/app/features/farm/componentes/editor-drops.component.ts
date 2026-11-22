import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { ImagemItemComponent } from "../../../shared/dominio/imagem-item.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { quantidadeDoTexto } from "../data/farm.modelos";
import { type BuscarItens, FarmBuscaItemComponent, type ItemEscolhido } from "./busca-item.component";

export interface ItemEditor {
  readonly id: string;
  readonly nome: string;
  readonly idJogo: number | null;
}

/**
 * Editor dos drops de uma run (check-in novo ou edição): quantidade por item, com − e +, um item
 * extra pela busca e a opção de lembrar itens novos na instância. Só apresenta; o estado do
 * rascunho fica na aba.
 */
@Component({
  selector: "app-editor-drops",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ImagemItemComponent, BotaoComponent, FarmBuscaItemComponent],
  template: `
    <span class="titulo">Quanto dropou nesta run</span>
    @for (item of itens(); track item.id) {
      <div class="linha">
        <app-imagem-item [idJogo]="item.idJogo" [nome]="item.nome" [tamanho]="24" />
        <label [for]="prefixo() + item.id">{{ item.nome }}</label>
        <span class="passo">
          <button
            uiBotao
            variante="fantasma"
            tamanho="p"
            (click)="mudar(item.id, -1)"
            [attr.aria-label]="'Menos ' + item.nome"
          >
            −
          </button>
          <input
            type="number"
            min="0"
            inputmode="numeric"
            placeholder="0"
            [id]="prefixo() + item.id"
            [value]="quantidades()[item.id] ?? ''"
            (input)="definir.emit({ id: item.id, valor: texto($event) })"
          />
          <button
            uiBotao
            variante="fantasma"
            tamanho="p"
            (click)="mudar(item.id, 1)"
            [attr.aria-label]="'Mais ' + item.nome"
          >
            +
          </button>
        </span>
      </div>
    } @empty {
      <p class="dica">Nenhum item listado. Adicione abaixo o que dropou, ou confirme só a execução.</p>
    }
    <app-farm-busca-item
      [buscar]="buscar()"
      [idCampo]="prefixo() + 'extra'"
      rotulo="Outro item dropado"
      dica="Dropou outro item? Nome ou ID"
      (escolher)="extra.emit($event)"
    />
    <label class="marcar">
      <input type="checkbox" [checked]="lembrar()" (change)="lembrarMudou.emit(marcado($event))" />
      Lembrar itens novos nesta instância
    </label>
    <div class="acoes">
      <button uiBotao variante="principal" [carregando]="enviando()" (click)="confirmar.emit()">
        {{ editando() ? "Salvar drops" : "Confirmar check-in" }}
      </button>
      <button uiBotao variante="fantasma" [disabled]="enviando()" (click)="cancelar.emit()">Cancelar</button>
    </div>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-2);
      padding: var(--esp-3);
      border: 1px solid var(--borda);
      border-radius: var(--raio-m);
      background: var(--superficie);
    }
    .titulo {
      font-size: var(--fs-s);
      font-weight: 600;
      color: var(--texto-suave);
    }
    /* O nome nunca é espremido: se ele não cabe ao lado do − [n] +, o controle desce para a linha de baixo. */
    .linha {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--esp-1) var(--esp-2);
    }
    .linha app-imagem-item {
      flex: none;
    }
    .linha label {
      flex: 1 1 auto;
      min-width: 0;
      overflow-wrap: anywhere;
      color: var(--texto);
    }
    .passo {
      flex: none;
      display: inline-flex;
      align-items: center;
      gap: var(--esp-1);
      margin-left: auto;
    }
    .passo input {
      box-sizing: border-box;
      width: 64px;
      min-height: 40px;
      padding: 0 var(--esp-2);
      border: 1px solid var(--borda-campo);
      border-radius: var(--raio-p);
      background: var(--fundo);
      color: var(--texto);
      font: inherit;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
    .dica {
      margin: 0;
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
    .marcar {
      display: flex;
      align-items: center;
      gap: var(--esp-2);
      min-height: 40px;
      font-size: var(--fs-s);
      color: var(--texto);
    }
    .marcar input {
      width: 18px;
      height: 18px;
      accent-color: var(--acento);
    }
    .acoes {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-2);
    }
  `,
})
export class EditorDropsComponent {
  readonly itens = input.required<readonly ItemEditor[]>();
  /** Quantidade digitada por item (texto, como no campo). */
  readonly quantidades = input.required<Readonly<Partial<Record<string, string>>>>();
  /** Prefixo dos ids dos campos (único por cartão). */
  readonly prefixo = input.required<string>();
  readonly buscar = input.required<BuscarItens>();
  /** Editando os drops de um check-in já feito (muda o texto do botão). */
  readonly editando = input(false);
  readonly enviando = input(false);
  readonly lembrar = input(true);

  readonly definir = output<{ id: string; valor: string }>();
  readonly extra = output<ItemEscolhido>();
  readonly lembrarMudou = output<boolean>();
  readonly confirmar = output();
  readonly cancelar = output();

  protected texto(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected marcado(evento: Event): boolean {
    return (evento.target as HTMLInputElement).checked;
  }

  protected mudar(id: string, delta: number): void {
    const atual = quantidadeDoTexto(this.quantidades()[id]);
    this.definir.emit({ id, valor: String(Math.max(0, atual + delta)) });
  }
}
