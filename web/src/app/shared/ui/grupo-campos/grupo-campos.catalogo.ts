import { ChangeDetectionStrategy, Component } from "@angular/core";
import { BotaoComponent } from "../botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../campo/campo.component";
import { GrupoCamposComponent } from "./grupo-campos.component";

/** Exemplos do catálogo: ui-grupo-campos com ações, com erro, com campos curtos e legenda longa. */
@Component({
  selector: "ui-grupo-campos-catalogo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotaoComponent, CampoComponent, CampoControleDirective, GrupoCamposComponent],
  template: `
    <ui-grupo-campos legenda="Participante 1">
      <ui-campo rotulo="Personagem">
        <select uiCampo>
          <option>Ana-MTK</option>
        </select>
      </ui-campo>
      <ui-campo rotulo="Classe" erro="Escolha a classe.">
        <select uiCampo>
          <option>Escolha</option>
        </select>
      </ui-campo>
      <ui-campo rotulo="Participação" dica="Parcial vale metade">
        <select uiCampo>
          <option>Completa (1)</option>
        </select>
      </ui-campo>
      <button uiBotao variante="fantasma" tamanho="p" slot="acoes">Remover</button>
    </ui-grupo-campos>
    <ui-grupo-campos legenda="Item 1" larguraCampo="p">
      <ui-campo rotulo="Item"><input uiCampo /></ui-campo>
      <ui-campo rotulo="Quantidade"><input uiCampo type="number" inputmode="numeric" /></ui-campo>
      <ui-campo rotulo="Desabilitado"><input uiCampo disabled value="—" /></ui-campo>
    </ui-grupo-campos>
    <ui-grupo-campos
      legenda="Uma legenda propositalmente longa para conferir a quebra de linha em telas estreitas, sem estourar"
    >
      <ui-campo rotulo="Campo"><input uiCampo /></ui-campo>
    </ui-grupo-campos>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
  `,
})
export class GrupoCamposCatalogoComponent {}
