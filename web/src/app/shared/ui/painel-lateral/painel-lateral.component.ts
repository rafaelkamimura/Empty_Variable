import { CdkTrapFocus } from "@angular/cdk/a11y";
import { DOCUMENT } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  effect,
  inject,
  input,
  output,
  viewChild,
} from "@angular/core";
import { BotaoComponent } from "../botao/botao.component";

const CAMPOS = "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])";

/**
 * Formulário de criar e editar fora da página (diretrizes §5, §6.1 e §6.4): abre à direita sobre
 * um fundo escurecido e, no celular, ocupa a tela toda. Fecha no X, no fundo ou com Esc.
 * Ao abrir, o foco vai ao primeiro campo (ou ao painel) e fica preso nele (`cdkTrapFocus`);
 * ao fechar, volta ao elemento que o abriu.
 *
 * @nivel organismo
 */
@Component({
  selector: "ui-painel-lateral",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkTrapFocus, BotaoComponent],
  host: { "(document:keydown.escape)": "aoEsc()" },
  template: `
    @if (aberto()) {
      <div class="fundo" (click)="fechar.emit()" aria-hidden="true"></div>
      <aside
        class="janela"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="titulo()"
        #painel
        tabindex="-1"
        cdkTrapFocus
      >
        <header>
          <h2>{{ titulo() }}</h2>
          <button uiBotao variante="fantasma" class="fechar" (click)="fechar.emit()" aria-label="Fechar">
            ✕
          </button>
        </header>
        <div class="corpo-janela"><ng-content /></div>
      </aside>
    }
  `,
  styles: `
    .fundo {
      position: fixed;
      inset: 0;
      z-index: var(--z-painel);
      background: color-mix(in srgb, var(--sombra-cor) 55%, transparent);
    }
    .janela {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: calc(var(--z-painel) + 1);
      display: flex;
      flex-direction: column;
      width: min(520px, 100vw);
      box-sizing: border-box;
      background: var(--superficie);
      border-left: 1px solid var(--borda-forte);
      box-shadow: var(--sombra-2);
    }
    .janela:focus {
      outline: none;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--esp-3);
      padding: var(--esp-4) var(--esp-5);
      border-bottom: 1px solid var(--borda);
    }
    h2 {
      margin: 0;
      font-size: var(--fs-xl);
      font-weight: 700;
      color: var(--texto-forte);
    }
    .fechar {
      color: var(--texto-suave);
    }
    /* Só o conteúdo rola, e só quando o formulário é maior que a tela. */
    .corpo-janela {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: var(--esp-3);
      padding: var(--esp-4) var(--esp-5) var(--esp-5);
    }
  `,
})
export class PainelLateralComponent {
  /** Título do painel (vira o h2 e o nome acessível do diálogo). */
  readonly titulo = input.required<string>();
  /** Painel aberto. A página controla; o painel só avisa `fechar`. */
  readonly aberto = input(false);
  /** Pedido de fechar (X, fundo ou Esc). */
  readonly fechar = output();

  private readonly painel = viewChild<ElementRef<HTMLElement>>("painel");
  private readonly documento = inject(DOCUMENT);
  private origem: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const aberto = this.aberto();
      const el = this.painel()?.nativeElement;
      if (aberto && el) {
        const ativo = this.documento.activeElement;
        this.origem = ativo instanceof HTMLElement && !el.contains(ativo) ? ativo : this.origem;
        // Depois de o conteúdo projetado renderizar: primeiro campo, ou o próprio painel.
        setTimeout(() => (el.querySelector<HTMLElement>(CAMPOS) ?? el).focus());
      } else if (!aberto && this.origem) {
        const origem = this.origem;
        this.origem = null;
        setTimeout(() => origem.focus());
      }
    });
  }

  protected aoEsc(): void {
    if (this.aberto()) this.fechar.emit();
  }
}
