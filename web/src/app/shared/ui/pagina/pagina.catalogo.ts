import { ChangeDetectionStrategy, Component } from "@angular/core";
import { BotaoComponent } from "../botao/botao.component";
import { PaginaComponent } from "./pagina.component";

/** Exemplos do catálogo: ui-pagina com e sem ação e com texto longo. */
@Component({
  selector: "ui-pagina-catalogo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PaginaComponent, BotaoComponent],
  template: `
    <div class="moldura">
      <ui-pagina titulo="Estoque" subtitulo="Itens do grupo e de onde vieram.">
        <button uiBotao variante="principal">Nova entrada</button>
        <p class="conteudo">Conteúdo da página.</p>
      </ui-pagina>
    </div>
    <div class="moldura">
      <ui-pagina titulo="Carteira">
        <p class="conteudo">Sem subtítulo e sem ação principal.</p>
      </ui-pagina>
    </div>
    <div class="moldura">
      <ui-pagina
        titulo="Entregas da Nebula pendentes de conferência no jogo"
        subtitulo="Um subtítulo propositalmente longo para conferir a quebra de linha ao lado do botão principal em telas estreitas."
      >
        <span slot="acao"><button uiBotao variante="principal">Conferir entregas</button></span>
      </ui-pagina>
    </div>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-4);
    }
    .moldura {
      padding: var(--esp-4);
      border: 1px dashed var(--borda-forte);
      border-radius: var(--raio-g);
    }
    .conteudo {
      margin: 0;
      color: var(--texto-suave);
    }
  `,
})
export class PaginaCatalogoComponent {}
