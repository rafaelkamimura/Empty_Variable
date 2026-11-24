import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { TextoColoridoComponent } from "../../../shared/ui/texto-colorido/texto-colorido.component";
import { contarDiff, diffLinhas, type TipoLinhaDiff } from "../data/diff-linhas";
import { tokenizarTextoRo, type TrechoRo } from "../data/texto-ro";

interface LinhaMostrada {
  readonly tipo: TipoLinhaDiff;
  readonly trechos: readonly TrechoRo[];
}

const MARCA: Record<TipoLinhaDiff, string> = { igual: "", adicionada: "+", removida: "−" };
const ROTULO: Record<TipoLinhaDiff, string> = { igual: "", adicionada: "Adicionada:", removida: "Removida:" };

/**
 * Descrição antes e depois do patch, numa lista só: cada linha que entrou leva "+" e cada linha que
 * saiu leva "−" (sinal e texto para leitor de tela, além do fundo; nunca só a cor, diretrizes §7).
 */
@Component({
  selector: "app-diff-descricao",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TextoColoridoComponent],
  template: `
    <p class="resumo">{{ resumo() }}</p>
    @if (mudou()) {
      <ul class="linhas">
        @for (l of linhas(); track $index) {
          <li
            class="linha"
            [class.adicionada]="l.tipo === 'adicionada'"
            [class.removida]="l.tipo === 'removida'"
            [attr.data-mudanca]="l.tipo"
          >
            <span class="marca" aria-hidden="true">{{ marca[l.tipo] }}</span>
            @if (l.tipo !== "igual") {
              <span class="sr-only">{{ rotulo[l.tipo] }}</span>
            }
            <ui-texto-colorido [trechos]="l.trechos" />
          </li>
        }
      </ul>
    }
  `,
  styles: `
    :host {
      display: block;
      max-width: 80ch;
    }
    .resumo {
      margin: 0 0 var(--esp-2);
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
    .linhas {
      margin: 0;
      padding: 0;
      list-style: none;
      line-height: 1.5;
    }
    .linha {
      display: grid;
      grid-template-columns: var(--esp-5) minmax(0, 1fr);
      padding: 0 var(--esp-2);
      border-inline-start: 2px solid transparent;
    }
    .marca {
      font-family: var(--fonte-mono);
      font-weight: 700;
    }
    .adicionada {
      border-inline-start-color: var(--sucesso);
      background: var(--sucesso-fundo);
    }
    .adicionada .marca {
      color: var(--sucesso);
    }
    .removida {
      border-inline-start-color: var(--erro);
      background: var(--erro-fundo);
    }
    .removida .marca {
      color: var(--erro);
    }
  `,
})
export class DiffDescricaoComponent {
  /** Linhas antes do patch, com a marcação do jogo. */
  readonly antes = input.required<readonly string[]>();
  /** Linhas depois do patch. */
  readonly depois = input.required<readonly string[]>();

  protected readonly marca = MARCA;
  protected readonly rotulo = ROTULO;
  private readonly diff = computed(() => diffLinhas(this.antes(), this.depois()));
  protected readonly linhas = computed<LinhaMostrada[]>(() =>
    this.diff().map((l) => ({ tipo: l.tipo, trechos: tokenizarTextoRo(l.texto) })),
  );
  private readonly contagem = computed(() => contarDiff(this.diff()));
  protected readonly mudou = computed(() => this.contagem().adicionadas + this.contagem().removidas > 0);
  protected readonly resumo = computed(() => {
    const { adicionadas, removidas } = this.contagem();
    if (adicionadas + removidas === 0) return "O texto não mudou.";
    const partes: string[] = [];
    if (adicionadas > 0)
      partes.push(`${adicionadas} ${adicionadas === 1 ? "linha adicionada" : "linhas adicionadas"} (+)`);
    if (removidas > 0)
      partes.push(`${removidas} ${removidas === 1 ? "linha removida" : "linhas removidas"} (−)`);
    return `${partes.join(" e ")}.`;
  });
}
