import { ChangeDetectionStrategy, Component } from "@angular/core";
import { CampoComponent, CampoControleDirective } from "./campo.component";

/** Exemplos do catálogo: ui-campo com input, select, dica, erro, desabilitado e rótulo oculto. */
@Component({
  selector: "ui-campo-catalogo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CampoComponent, CampoControleDirective],
  template: `
    <ui-campo rotulo="Buscar item"><input uiCampo type="search" placeholder="Ex.: Alma" /></ui-campo>
    <ui-campo rotulo="Quantidade" dica="Você pode comprar até 5 unidades.">
      <input uiCampo type="number" inputmode="numeric" min="1" value="1" />
    </ui-campo>
    <ui-campo rotulo="Item">
      <select uiCampo>
        <option>Alma de Betelgeuse</option>
        <option>Fragmento de Meteorito</option>
      </select>
    </ui-campo>
    <ui-campo rotulo="Quantidade" erro="Use um número inteiro maior que zero.">
      <input uiCampo type="number" inputmode="numeric" value="0" />
    </ui-campo>
    <ui-campo rotulo="Observação"><input uiCampo disabled value="Campo desabilitado" /></ui-campo>
    <ui-campo rotulo="Preço de Oridecon" rotuloOculto
      ><input uiCampo placeholder="Rótulo oculto: só em célula de tabela"
    /></ui-campo>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: var(--esp-4);
    }
  `,
})
export class CampoCatalogoComponent {}
