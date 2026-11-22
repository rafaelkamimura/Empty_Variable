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
      <!-- Recriado a cada slot: a busca e o campo recomeçam vazios. -->
      @for (atual of [slot]; track atual[0]) {
        <app-equipamento-select
          [rotulo]="atual[1]"
          [valor]="equipamentos()[atual[0]]"
          [itens]="itensDoSlot()"
          [erro]="erroCatalogo()"
          (mudou)="mudou.emit({ slot: atual[0], valor: $event })"
          (tentarDeNovo)="tentarDeNovo.emit()"
        />
      }
      @for (linha of detalhes(); track linha) {
        <p class="detalhe">{{ linha }}</p>
      }
    </div>
  `,
  styleUrl: "./equipamentos-ficha.component.scss",
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
