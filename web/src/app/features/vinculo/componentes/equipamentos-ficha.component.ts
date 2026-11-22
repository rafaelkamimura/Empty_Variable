import { ChangeDetectionStrategy, Component, computed, input, output, signal } from "@angular/core";
import { detalhesDoEquipamento } from "../../../shared/dominio/build";
import { ImagemItemComponent } from "../../../shared/dominio/imagem-item.component";
import {
  type EquipamentoFicha,
  type Ficha,
  type ItemEquipamento,
  itemEquipado,
  type Slot,
  SLOTS,
  tituloDoSlot,
} from "../data/vinculo.modelos";
import { EquipamentoSelectComponent } from "./equipamento-select.component";

/**
 * Os 10 slots da ficha: escolhe um slot na grade e edita o equipamento dele logo abaixo, com o
 * refino, o grau, as cartas e os encantamentos da build importada (D57).
 */
@Component({
  selector: "app-equipamentos-ficha",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ImagemItemComponent, EquipamentoSelectComponent],
  template: `
    <div class="slots" role="group" aria-label="Slots de equipamento">
      @for (slot of slots; track slot[0]) {
        @let valor = equipamentos()[slot[0]];
        @let item = equipado(valor);
        <button
          type="button"
          class="slot"
          [attr.aria-pressed]="ativo()[0] === slot[0]"
          [attr.title]="titulo(valor)"
          (click)="ativo.set(slot)"
        >
          <span class="arte" aria-hidden="true">
            @if (item) {
              <app-imagem-item [idJogo]="item.id" [nome]="item.nome" [tamanho]="26" />
              @if (item.refino) {
                <span class="refino">+{{ item.refino }}</span>
              }
            } @else {
              <span class="marca" [class.preenchido]="valor !== undefined"></span>
            }
          </span>
          <span>{{ slot[1] }}</span>
        </button>
      }
    </div>
    @let slot = ativo();
    <div class="editor">
      <app-equipamento-select
        [rotulo]="slot[1]"
        [valor]="equipamentos()[slot[0]]"
        [itens]="itensDoSlot()"
        [erro]="erroCatalogo()"
        (mudou)="mudou.emit({ slot: slot[0], valor: $event })"
        (tentarDeNovo)="tentarDeNovo.emit()"
      />
      @for (linha of detalhes(); track linha) {
        <p class="detalhe">{{ linha }}</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
    .slots {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: var(--esp-1);
    }
    .slot {
      display: grid;
      justify-items: center;
      align-content: start;
      gap: var(--esp-1);
      min-width: 0;
      min-height: 64px;
      padding: var(--esp-1);
      border: 1px solid var(--borda-forte);
      border-radius: var(--raio-p);
      background: var(--cartao);
      color: var(--texto-suave);
      font: inherit;
      font-size: var(--fs-xs);
      overflow-wrap: break-word;
      hyphens: auto;
      cursor: pointer;
      transition:
        border-color var(--duracao) var(--curva),
        background var(--duracao) var(--curva);
    }
    .slot:hover {
      border-color: var(--acento-suave);
      color: var(--texto);
    }
    .slot[aria-pressed="true"] {
      border-color: var(--acento);
      background: var(--acento-fundo);
      color: var(--texto-forte);
    }
    .slot:focus-visible {
      outline: 2px solid var(--foco);
      outline-offset: 2px;
    }
    .arte {
      position: relative;
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border: 1px solid var(--borda-forte);
      border-radius: var(--raio-p);
      background: var(--superficie);
    }
    .marca {
      width: 8px;
      height: 8px;
      border: 1px solid var(--texto-apagado);
      transform: rotate(45deg);
    }
    .marca.preenchido {
      background: var(--sucesso);
      border-color: var(--sucesso);
    }
    .refino {
      position: absolute;
      right: -6px;
      bottom: -6px;
      padding: 0 var(--esp-1);
      border-radius: var(--raio-p);
      background: var(--elevado);
      color: var(--alerta);
      font-size: var(--fs-xs);
      font-weight: 700;
      line-height: 1.3;
    }
    .editor {
      display: grid;
      gap: var(--esp-1);
      padding: var(--esp-3);
      border: 1px solid var(--borda);
      border-radius: var(--raio-m);
      background: var(--cartao);
    }
    .detalhe {
      margin: 0;
      font-size: var(--fs-xs);
      color: var(--texto-suave);
      overflow-wrap: anywhere;
    }
  `,
})
export class EquipamentosFichaComponent {
  readonly equipamentos = input.required<Ficha["equipamentos"]>();
  /** Catálogo por slot (null enquanto carrega). */
  readonly catalogo = input.required<Readonly<Record<string, ItemEquipamento[]>> | null>();
  readonly erroCatalogo = input(false);
  readonly mudou = output<{ slot: string; valor: ItemEquipamento | undefined }>();
  readonly tentarDeNovo = output();

  protected readonly slots = SLOTS;
  protected readonly ativo = signal<Slot>(SLOTS[0]);
  protected readonly itensDoSlot = computed(() => {
    const c = this.catalogo();
    return c === null ? null : (c[this.ativo()[0]] ?? []);
  });
  protected readonly detalhes = computed(() => detalhesDoEquipamento(this.equipamentos()[this.ativo()[0]]));

  protected equipado(valor: EquipamentoFicha | undefined): ItemEquipamento | null {
    return itemEquipado(valor);
  }
  protected titulo(valor: EquipamentoFicha | undefined): string | null {
    return tituloDoSlot(valor);
  }
}
