import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { linhasDoCliente } from "../data/meta";
import type { MetaPatch } from "../data/relatorio.modelos";

/**
 * Bloco recolhido com os arquivos do patch: as linhas do patch.txt aplicadas e, quando o relatório
 * já chegou, os arquivos principais do cliente (GRF, Ragexe e pastas soltas) com o que mudou.
 */
@Component({
  selector: "app-arquivos-patch",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <details data-testid="datamine-arquivos">
      <summary>{{ titulo() }}</summary>
      <div class="conteudo">
        @if (linhas().length > 0) {
          <dl class="principais">
            @for (l of linhas(); track l.rotulo) {
              <div>
                <dt>{{ l.rotulo }}</dt>
                <dd>{{ l.valor }}</dd>
              </div>
            }
          </dl>
        }
        <div>
          <p class="titulo-bloco">Linhas do patch.txt</p>
          <ul class="nomes">
            @for (nome of patches(); track $index) {
              <li>{{ nome }}</li>
            }
          </ul>
        </div>
        @for (pasta of pastas(); track pasta.nome) {
          <div>
            <p class="titulo-bloco">{{ pasta.nome }}: arquivos alterados</p>
            <ul class="nomes">
              @for (arquivo of pasta.alterados; track arquivo) {
                <li>{{ arquivo }}</li>
              }
            </ul>
          </div>
        }
      </div>
    </details>
  `,
  styles: `
    :host {
      display: block;
      color: var(--texto-suave);
      font-size: var(--fs-s);
    }
    summary {
      padding: var(--esp-2) 0;
      cursor: pointer;
    }
    summary:focus-visible {
      outline: 2px solid var(--foco);
      outline-offset: 2px;
    }
    .conteudo {
      display: grid;
      gap: var(--esp-3);
      padding-block: var(--esp-2);
    }
    .principais {
      display: grid;
      gap: var(--esp-1);
      margin: 0;
      max-width: 80ch;
    }
    .principais div {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-1) var(--esp-2);
    }
    dt {
      font-weight: 600;
    }
    dt::after {
      content: ":";
    }
    dd {
      margin: 0;
      color: var(--texto);
      overflow-wrap: anywhere;
    }
    .titulo-bloco {
      margin: 0 0 var(--esp-1);
      font-weight: 600;
    }
    .nomes {
      margin: 0;
      padding-left: var(--esp-5);
      font-family: var(--fonte-mono);
      font-size: var(--fs-xs);
      color: var(--texto);
      overflow-wrap: anywhere;
    }
  `,
})
export class ArquivosPatchComponent {
  /** Nomes dos arquivos do patch.txt aplicados, já sem o número de sequência. */
  readonly patches = input.required<readonly string[]>();
  /** A meta do relatório, quando ele já carregou. */
  readonly meta = input<MetaPatch | null>(null);

  protected readonly linhas = computed(() => {
    const meta = this.meta();
    return meta === null ? [] : linhasDoCliente(meta);
  });
  protected readonly pastas = computed(() =>
    (this.meta()?.pastas ?? []).filter((p) => p.alterados.length > 0),
  );
  protected readonly titulo = computed(() => {
    const n = this.patches().length;
    const arquivos = `${n} ${n === 1 ? "arquivo" : "arquivos"} do patch.txt`;
    return this.linhas().length > 0 ? `${arquivos} e os arquivos principais do cliente` : arquivos;
  });
}
