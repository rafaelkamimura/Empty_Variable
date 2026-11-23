import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import type { ItemCatalogo } from "../../../shared/dominio/cadastros";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { GrupoCamposComponent } from "../../../shared/ui/grupo-campos/grupo-campos.component";
import type { RascunhoRun } from "../data/runs.modelos";
import { numeroDoEvento, valorDoEvento } from "../../../shared/utils/evento";

type Drop = RascunhoRun["drops"][number];

/** Passo 4 do assistente: itens obtidos na run (não mudam a pontuação). */
@Component({
  selector: "app-passo-drops",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvisoComponent, BotaoComponent, CampoComponent, CampoControleDirective, GrupoCamposComponent],
  template: `
    <ui-aviso tom="info">Os itens obtidos não alteram a pontuação.</ui-aviso>
    @for (d of drops(); track $index; let i = $index) {
      <ui-grupo-campos [legenda]="'Item ' + (i + 1)">
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
          slot="acoes"
          variante="fantasma"
          tamanho="p"
          (click)="remover.emit(i)"
          [attr.aria-label]="'Remover item ' + (i + 1)"
        >
          Remover
        </button>
      </ui-grupo-campos>
    }
    <button uiBotao (click)="adicionar.emit()">Adicionar item</button>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
    :host > button {
      justify-self: start;
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
