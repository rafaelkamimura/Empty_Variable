import { ChangeDetectionStrategy, Component, computed, input, output, signal } from "@angular/core";
import type { EquipamentoFicha, ItemEquipamento } from "../../../shared/dominio/build";
import { ImagemItemComponent } from "../../../shared/dominio/imagem-item.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";

const MAXIMO_OPCOES = 35;

const normalizar = (nome: string) =>
  nome
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");

/**
 * Escolha do equipamento de um slot: busca por nome e lista com até 35 opções. Um item escrito à
 * mão num cadastro anterior aparece como "(cadastro anterior)" até ser trocado.
 */
@Component({
  selector: "app-equipamento-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ImagemItemComponent, BotaoComponent, CampoComponent, CampoControleDirective],
  template: `
    <ui-campo [rotulo]="'Buscar ' + rotulo()" rotuloOculto>
      <input uiCampo type="search" placeholder="Buscar equipamento" (input)="busca.set(texto($event))" />
    </ui-campo>
    <ui-campo [rotulo]="rotulo()" [dica]="dica()">
      <select uiCampo [disabled]="itens() === null" (change)="escolher(texto($event))">
        <option value="" [selected]="chave() === ''">Sem equipamento</option>
        @if (legado(); as nome) {
          <option value="legado" [selected]="chave() === 'legado'">{{ nome }} (cadastro anterior)</option>
        }
        @for (item of opcoes(); track item.id) {
          <option [value]="item.id" [selected]="chave() === '' + item.id">{{ item.nome }}</option>
        }
      </select>
    </ui-campo>
    @if (selecionado(); as item) {
      <div class="escolha">
        <app-imagem-item [idJogo]="item.id" [nome]="item.nome" [tamanho]="24" />
        <span>{{ item.nome }}</span>
      </div>
    }
    @if (erro()) {
      <button uiBotao tamanho="p" (click)="tentarDeNovo.emit()">Tentar carregar a lista de novo</button>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-2);
      min-width: 0;
    }
    .escolha {
      display: flex;
      align-items: center;
      gap: var(--esp-2);
      font-size: var(--fs-s);
      color: var(--texto);
      overflow-wrap: anywhere;
    }
  `,
})
export class EquipamentoSelectComponent {
  readonly rotulo = input.required<string>();
  readonly valor = input<EquipamentoFicha | undefined>(undefined);
  /** Itens do slot no catálogo (null enquanto carrega). */
  readonly itens = input.required<readonly ItemEquipamento[] | null>();
  readonly erro = input(false);
  readonly mudou = output<ItemEquipamento | undefined>();
  readonly tentarDeNovo = output();

  protected readonly busca = signal("");
  protected readonly selecionado = computed(() => {
    const v = this.valor();
    return typeof v === "object" ? v : null;
  });
  protected readonly legado = computed(() => {
    const v = this.valor();
    return typeof v === "string" ? v : null;
  });
  protected readonly chave = computed(
    () => this.selecionado()?.id.toString() ?? (this.legado() ? "legado" : ""),
  );
  private readonly resultados = computed(() => {
    const termo = normalizar(this.busca().trim());
    const itens = this.itens() ?? [];
    return termo ? itens.filter((item) => normalizar(item.nome).includes(termo)) : itens;
  });
  protected readonly opcoes = computed(() => {
    const primeiros = this.resultados().slice(0, MAXIMO_OPCOES);
    const atual = this.selecionado();
    return atual && !primeiros.some((item) => item.id === atual.id) ? [atual, ...primeiros] : primeiros;
  });
  protected readonly dica = computed(() => {
    if (this.itens() === null)
      return this.erro() ? "Não foi possível carregar a lista." : "Carregando a lista…";
    if (this.busca().trim() && this.resultados().length === 0) return "Nenhum equipamento encontrado.";
    if (this.resultados().length > MAXIMO_OPCOES) return "Digite mais do nome para refinar a busca.";
    return "";
  });

  protected texto(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected escolher(id: string): void {
    if (id === "legado") return;
    if (id === "") {
      this.mudou.emit(undefined);
      return;
    }
    const item = this.opcoes().find((opcao) => opcao.id === Number(id));
    if (item) this.mudou.emit(item);
  }
}
