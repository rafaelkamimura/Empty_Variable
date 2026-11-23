import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import type { ItemCatalogo } from "../../../shared/dominio/cadastros";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import type { RascunhoRun } from "../data/runs.modelos";
import { numeroDoEvento, valorDoEvento } from "../../../shared/utils/evento";

type Drop = RascunhoRun["drops"][number];

/** Passo 4 do assistente: itens obtidos na run (não mudam a pontuação). */
@Component({
  selector: "app-passo-drops",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotaoComponent, CampoComponent, CampoControleDirective],
  template: `
    <p class="dica">Os itens obtidos não alteram a pontuação.</p>
    @for (d of drops(); track $index; let i = $index) {
      <fieldset class="linha">
        <legend>Item {{ i + 1 }}</legend>
        <ui-campo rotulo="Item">
          <select uiCampo (change)="alterar.emit({ i, parte: { itemId: valor($event) || null } })">
            <option value="" [selected]="d.itemId === null">Escolha</option>
            @for (it of itens(); track it.id) {
              <option [value]="it.id" [selected]="d.itemId === it.id">{{ it.nome }}</option>
            }
          </select>
        </ui-campo>
        <ui-campo rotulo="Quantidade">
          <input
            uiCampo
            type="number"
            min="1"
            step="1"
            inputmode="numeric"
            [value]="d.quantidade ?? ''"
            (input)="alterar.emit({ i, parte: { quantidade: numero($event) } })"
          />
        </ui-campo>
        <button
          uiBotao
          variante="fantasma"
          tamanho="p"
          (click)="remover.emit(i)"
          [attr.aria-label]="'Remover item ' + (i + 1)"
        >
          Remover
        </button>
      </fieldset>
    }
    <button uiBotao (click)="adicionar.emit()">Adicionar item</button>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
      justify-items: start;
    }
    .dica {
      margin: 0;
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
    .linha {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) auto;
      align-items: end;
      gap: var(--esp-2) var(--esp-3);
      width: 100%;
      box-sizing: border-box;
      margin: 0;
      padding: var(--esp-3);
      border: 1px solid var(--borda);
      border-radius: var(--raio-m);
    }
    legend {
      padding: 0 var(--esp-1);
      font-size: var(--fs-s);
      font-weight: 600;
      color: var(--texto-suave);
    }
    @container conteudo (max-width: 600px) {
      .linha {
        grid-template-columns: minmax(0, 1fr);
      }
      .linha button {
        justify-self: start;
      }
    }
  `,
})
export class PassoDropsComponent {
  readonly drops = input.required<readonly Drop[]>();
  readonly itens = input.required<readonly ItemCatalogo[]>();
  readonly alterar = output<{ i: number; parte: Partial<Drop> }>();
  readonly adicionar = output();
  readonly remover = output<number>();

  protected readonly valor = valorDoEvento;
  protected readonly numero = numeroDoEvento;
}
