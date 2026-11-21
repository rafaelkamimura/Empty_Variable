import { booleanAttribute, ChangeDetectionStrategy, Component, input, model } from "@angular/core";

export interface OpcaoChip {
  readonly valor: string;
  readonly rotulo: string;
  /** Contagem mostrada ao lado do rótulo (ex.: itens naquele filtro). */
  readonly contagem?: number;
}

/**
 * Grupo de filtros em chip (diretrizes §5 e §6.1). Seleção única (`selecionado`, uma string) ou
 * múltipla (`multipla` + `selecionados`). Cada chip é um botão com `aria-pressed`.
 *
 * @nivel molecula
 */
@Component({
  selector: "ui-chips-filtro",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: "group", "[attr.aria-label]": "rotulo()" },
  template: `
    @for (o of opcoes(); track o.valor) {
      <button type="button" class="opcao" [attr.aria-pressed]="ativo(o.valor)" (click)="alternar(o.valor)">
        {{ o.rotulo }}
        @if (o.contagem !== undefined) {
          <span class="qtd">{{ o.contagem }}</span>
        }
      </button>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-2);
    }
    .opcao {
      display: inline-flex;
      align-items: center;
      gap: var(--esp-2);
      min-height: 40px;
      padding: 0 var(--esp-4);
      border: 1px solid var(--borda-campo);
      border-radius: var(--raio-total);
      background: transparent;
      color: var(--texto);
      font: inherit;
      font-size: var(--fs-s);
      font-weight: 600;
      cursor: pointer;
    }
    .opcao:hover {
      background: var(--acento-fundo);
    }
    .opcao[aria-pressed="true"] {
      border-color: var(--acento);
      background: var(--acento-fundo);
      color: var(--texto-forte);
    }
    .qtd {
      min-width: 1.5em;
      padding: 0 var(--esp-1);
      border-radius: var(--raio-total);
      background: var(--elevado);
      color: var(--texto-suave);
      font-size: var(--fs-xs);
      font-variant-numeric: tabular-nums;
      text-align: center;
    }
    .opcao[aria-pressed="true"] .qtd {
      background: var(--acento);
      color: var(--sobre-acento);
    }
  `,
})
export class ChipsFiltroComponent {
  /** Nome do grupo para leitores de tela (ex.: "Filtrar por tipo"). */
  readonly rotulo = input.required<string>();
  readonly opcoes = input.required<readonly OpcaoChip[]>();
  /** Seleção múltipla: usa `selecionados` em vez de `selecionado`. */
  readonly multipla = input(false, { transform: booleanAttribute });
  /** Valor escolhido na seleção única. */
  readonly selecionado = model<string>("");
  /** Valores escolhidos na seleção múltipla. */
  readonly selecionados = model<readonly string[]>([]);

  protected ativo(valor: string): boolean {
    return this.multipla() ? this.selecionados().includes(valor) : this.selecionado() === valor;
  }

  protected alternar(valor: string): void {
    if (!this.multipla()) {
      this.selecionado.set(valor);
      return;
    }
    const atual = this.selecionados();
    this.selecionados.set(atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor]);
  }
}
