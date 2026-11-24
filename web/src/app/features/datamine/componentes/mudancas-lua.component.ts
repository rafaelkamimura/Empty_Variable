import { ChangeDetectionStrategy, Component, computed, input, signal } from "@angular/core";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import type { MudancaLua, OperacaoLua } from "../data/relatorio.modelos";
import { BlocoCodigoComponent } from "./bloco-codigo.component";

const MARCA: Record<OperacaoLua, string> = { add: "+", del: "−", chg: "~" };
const ROTULO: Record<OperacaoLua, string> = { add: "Adicionado", del: "Removido", chg: "Alterado" };
/** Uma tabela pode ter centenas de mudanças: entram de 40 em 40. */
const PASSO = 40;
/** Até este tamanho, e numa linha só, os valores cabem ao lado do caminho; acima disso vão em bloco. */
const LIMITE_CURTO = 60;

interface MudancaMostrada extends MudancaLua {
  readonly curta: boolean;
}

const ehCurto = (valor: string): boolean => valor.length <= LIMITE_CURTO && !valor.includes("\n");

/**
 * As mudanças de uma tabela Lua: o caminho (tabela/chave), o que aconteceu (sinal e palavra, nunca
 * só a cor) e os valores de antes e de agora.
 */
@Component({
  selector: "app-mudancas-lua",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BlocoCodigoComponent, BotaoComponent],
  template: `
    <ul class="mudancas">
      @for (m of visiveis(); track $index) {
        <li class="mudanca" [attr.data-op]="m.op">
          <p class="caminho">
            <span
              class="marca"
              [class.add]="m.op === 'add'"
              [class.del]="m.op === 'del'"
              aria-hidden="true"
              >{{ marca[m.op] }}</span
            >
            <span class="op">{{ rotulo[m.op] }}</span>
            <code>{{ m.caminho }}</code>
          </p>
          @if (m.curta) {
            <p class="curta">
              @if (m.op !== "add") {
                <span class="lado">Antes</span> <code>{{ m.antes || "(vazio)" }}</code>
              }
              @if (m.op === "chg") {
                <span aria-hidden="true">→</span>
              }
              @if (m.op !== "del") {
                <span class="lado">{{ m.op === "add" ? "Valor" : "Agora" }}</span>
                <code>{{ m.depois || "(vazio)" }}</code>
              }
            </p>
          } @else {
            @if (m.op !== "add") {
              <div class="valor">
                <span class="lado">Antes</span>
                <app-bloco-codigo [texto]="m.antes" />
              </div>
            }
            @if (m.op !== "del") {
              <div class="valor">
                <span class="lado">{{ m.op === "add" ? "Valor" : "Agora" }}</span>
                <app-bloco-codigo [texto]="m.depois" />
              </div>
            }
          }
        </li>
      }
    </ul>
    @if (restantes() > 0) {
      <button uiBotao tamanho="p" class="mais" (click)="mostrarMais()">
        Mostrar mais {{ proximas() }} ({{ restantes() }} restantes)
      </button>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
      min-width: 0;
    }
    .mudancas {
      display: grid;
      gap: var(--esp-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .mudanca {
      display: grid;
      gap: var(--esp-1);
      min-width: 0;
    }
    .caminho {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--esp-1) var(--esp-2);
      margin: 0;
    }
    .marca {
      font-family: var(--fonte-mono);
      font-weight: 700;
      color: var(--alerta);
    }
    .marca.add {
      color: var(--sucesso);
    }
    .marca.del {
      color: var(--erro);
    }
    .op {
      font-size: var(--fs-s);
      font-weight: 600;
      color: var(--texto-suave);
    }
    code {
      font-family: var(--fonte-mono);
      font-size: var(--fs-s);
      color: var(--texto-forte);
      overflow-wrap: anywhere;
    }
    .curta {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--esp-1) var(--esp-2);
      margin: 0;
      padding-inline-start: var(--esp-5);
    }
    .valor {
      display: grid;
      gap: var(--esp-1);
      min-width: 0;
    }
    .lado {
      font-size: var(--fs-xs);
      color: var(--texto-suave);
    }
    .mais {
      justify-self: start;
    }
  `,
})
export class MudancasLuaComponent {
  readonly mudancas = input.required<readonly MudancaLua[]>();

  protected readonly marca = MARCA;
  protected readonly rotulo = ROTULO;
  private readonly limite = signal(PASSO);
  protected readonly visiveis = computed<MudancaMostrada[]>(() =>
    this.mudancas()
      .slice(0, this.limite())
      .map((m) => ({ ...m, curta: ehCurto(m.antes) && ehCurto(m.depois) })),
  );
  protected readonly restantes = computed(() => this.mudancas().length - this.visiveis().length);
  protected readonly proximas = computed(() => Math.min(PASSO, this.restantes()));

  protected mostrarMais(): void {
    this.limite.update((n) => n + PASSO);
  }
}
