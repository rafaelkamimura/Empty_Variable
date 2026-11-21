import { ChangeDetectionStrategy, Component } from "@angular/core";
import { carregando, comErro, pronto } from "../../utils/carregavel";
import { BotaoComponent } from "../botao/botao.component";
import { EstadoComponent, EstadoProntoDirective } from "./estado.component";

/** Exemplos do catálogo: ui-estado em cada estado de um Carregavel. */
@Component({
  selector: "ui-estado-catalogo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EstadoComponent, EstadoProntoDirective, BotaoComponent],
  template: `
    <h3>Carregando (tabela)</h3>
    <ui-estado [valor]="carregando" formatoCarregando="tabela" />
    <h3>Erro</h3>
    <ui-estado [valor]="erro" />
    <h3>Vazio, com ação</h3>
    <ui-estado [valor]="vazio" mensagemVazio="Nenhum item no estoque.">
      <button uiBotao variante="principal" slot="vazio-acao">Nova entrada</button>
    </ui-estado>
    <h3>Pronto</h3>
    <ui-estado [valor]="itens">
      <ng-template uiEstadoPronto [tipo]="itens" let-lista>
        <ul class="lista">
          @for (i of lista; track i) {
            <li>{{ i }}</li>
          }
        </ul>
      </ng-template>
    </ui-estado>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
    h3 {
      margin: var(--esp-3) 0 0;
      font-size: var(--fs-m);
      color: var(--texto-suave);
    }
    .lista {
      margin: 0;
      color: var(--texto);
    }
  `,
})
export class EstadoCatalogoComponent {
  protected readonly carregando = carregando<string[]>();
  protected readonly erro = comErro<string[]>("A API demorou para responder.");
  protected readonly vazio = pronto<string[]>([]);
  protected readonly itens = pronto(["Alma de Betelgeuse", "Fragmento de Meteorito", "Pó de Meteorito"]);
}
