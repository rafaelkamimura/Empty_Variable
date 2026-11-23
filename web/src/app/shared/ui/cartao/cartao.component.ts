import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
} from "@angular/core";

/**
 * Superfície de conteúdo (diretrizes §2.4 e §5): `--cartao`, borda `--borda`, raio grande e
 * sem sombra. Use `<ui-cartao>` para conteúdo; `<a uiCartao>` ou `<button uiCartao>` para um
 * cartão clicável, que ganha hover e o brilho de foco.
 *
 * Slots: `[slot=cabecalho]`, conteúdo e `[slot=rodape]` (os dois opcionais).
 *
 * @nivel organismo
 */
@Component({
  selector: "ui-cartao, a[uiCartao], button[uiCartao]",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "ui-cartao",
    "[class.clicavel]": "clicavel",
    "[class.destaque]": "destaque()",
    "[class.apagado]": "apagado()",
    "[attr.type]": "ehBotao ? 'button' : null",
  },
  template: `
    <div class="topo"><ng-content select="[slot=cabecalho]" /></div>
    <ng-content />
    <div class="rodape"><ng-content select="[slot=rodape]" /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--esp-2);
      box-sizing: border-box;
      min-width: 0;
      padding: var(--esp-3);
      border: 1px solid var(--borda);
      border-radius: var(--raio-g);
      background: var(--cartao);
      color: var(--texto);
      font: inherit;
      text-align: left;
      text-decoration: none;
      transition:
        border-color var(--duracao) var(--curva),
        box-shadow var(--duracao) var(--curva);
    }
    :host(.clicavel) {
      cursor: pointer;
    }
    :host(.clicavel:is(:disabled, [aria-disabled="true"])) {
      cursor: default;
      opacity: 0.6;
    }
    :host(.clicavel:not(:disabled, [aria-disabled="true"]):hover),
    :host(.destaque) {
      border-color: var(--borda-forte);
    }
    :host(.clicavel:focus-visible) {
      box-shadow: var(--brilho-acento);
    }
    :host(.destaque) {
      border-color: var(--acento);
    }
    :host(.apagado) {
      opacity: 0.6;
    }
    .topo:empty,
    .rodape:empty {
      display: none;
    }
    .rodape {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--esp-2);
      margin-top: auto;
    }
  `,
})
export class CartaoComponent {
  /** Realce de seleção (borda no acento). */
  readonly destaque = input(false, { transform: booleanAttribute });
  /** Item indisponível: o cartão fica esmaecido (o motivo deve estar escrito no conteúdo). */
  readonly apagado = input(false, { transform: booleanAttribute });

  private readonly tag = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.tagName;
  protected readonly ehBotao = this.tag === "BUTTON";
  protected readonly clicavel = this.tag === "A" || this.tag === "BUTTON";
}
