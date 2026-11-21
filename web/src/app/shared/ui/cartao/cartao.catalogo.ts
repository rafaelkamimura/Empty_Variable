import { ChangeDetectionStrategy, Component } from "@angular/core";
import { CartaoComponent } from "./cartao.component";

/** Exemplos do catálogo: ui-cartao simples, clicável, em destaque, apagado e com texto longo. */
@Component({
  selector: "ui-cartao-catalogo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CartaoComponent],
  template: `
    <ui-cartao>
      <strong slot="cabecalho">Alma de Betelgeuse</strong>
      <span class="meta">Material · 12 no estoque</span>
      <span slot="rodape" class="valor">350 pts</span>
    </ui-cartao>
    <button uiCartao>
      <strong>Cartão clicável (botão)</strong>
      <span class="meta">Hover e brilho no foco.</span>
    </button>
    <a uiCartao href="#exemplo">
      <strong>Cartão clicável (link)</strong>
      <span class="meta">Leva a outra tela.</span>
    </a>
    <ui-cartao [destaque]="true"
      ><strong>Selecionado</strong><span class="meta">Borda no acento.</span></ui-cartao
    >
    <ui-cartao [apagado]="true"
      ><strong>Indisponível</strong><span class="meta">Sem estoque.</span></ui-cartao
    >
    <ui-cartao>
      <strong>Armadura Nebulosa POD com um nome bem longo para testar a quebra</strong>
      <span class="meta">Texto longo dentro do cartão, que precisa quebrar sem estourar a grade.</span>
    </ui-cartao>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: var(--esp-4);
    }
    .meta {
      font-size: var(--fs-xs);
      color: var(--texto-suave);
    }
    .valor {
      font-weight: 700;
      color: var(--texto-forte);
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class CartaoCatalogoComponent {}
