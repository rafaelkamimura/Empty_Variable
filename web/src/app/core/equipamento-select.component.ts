import { HttpClient } from "@angular/common/http";
import { Component, computed, inject, Injectable, input, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import type { EquipamentoFicha, ItemEquipamento } from "./modelos";
import { ImagemItemComponent } from "./imagem-item.component";

interface CatalogoEquipamentos {
  slots: Record<string, ItemEquipamento[]>;
}

const normalizar = (nome: string) =>
  nome
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");

/** Catálogo de equipamentos do RO LATAM por slot (equipamentos-latam.json), carregado uma vez. */
@Injectable({ providedIn: "root" })
export class EquipamentosLatam {
  private readonly http = inject(HttpClient);
  readonly slots = signal<CatalogoEquipamentos["slots"] | null>(null);
  readonly erro = signal(false);
  private carregando = false;

  async carregar(): Promise<void> {
    if (this.slots() || this.carregando) return;
    this.erro.set(false);
    this.carregando = true;
    try {
      const dados = await firstValueFrom(this.http.get<CatalogoEquipamentos>("/equipamentos-latam.json"));
      this.slots.set(dados.slots);
    } catch {
      this.erro.set(true);
    } finally {
      this.carregando = false;
    }
  }

  /** Nome do equipamento com esse ID no slot, ou null se o catálogo não o tiver (ou não tiver carregado). */
  nomeDoItem(slot: string, id: number): string | null {
    return this.slots()?.[slot]?.find((item) => item.id === id)?.nome ?? null;
  }
}

@Component({
  selector: "app-equipamento-select",
  imports: [FormsModule, ImagemItemComponent],
  template: `
    <div class="slot">
      <strong>{{ rotulo() }}</strong>
      <input
        type="search"
        #campo
        placeholder="Buscar equipamento"
        [attr.aria-label]="'Buscar ' + rotulo()"
        (input)="busca.set(campo.value)"
      />
      <select
        [attr.aria-label]="rotulo()"
        [ngModel]="chave()"
        [ngModelOptions]="{ standalone: true }"
        (ngModelChange)="escolher($event)"
        [disabled]="!catalogo.slots()"
      >
        <option value="">Sem equipamento</option>
        @if (legado(); as nome) {
          <option value="legado">{{ nome }} (cadastro anterior)</option>
        }
        @for (item of opcoes(); track item.id) {
          <option [value]="item.id">{{ item.nome }}</option>
        }
      </select>
      @if (selecionado(); as item) {
        <div class="escolha">
          <app-imagem-item [idJogo]="item.id" [nome]="item.nome" [tamanho]="22" />
          <span>{{ item.nome }}</span>
        </div>
      }
      @if (catalogo.erro()) {
        <button type="button" (click)="catalogo.carregar()">Tentar carregar novamente</button>
      } @else if (catalogo.slots() && busca().trim() && resultados().length === 0) {
        <small>Nenhum equipamento encontrado.</small>
      } @else if (resultados().length > 35) {
        <small>Digite mais do nome para refinar a busca.</small>
      }
    </div>
  `,
  styles: `
    .slot {
      display: grid;
      gap: 6px;
      min-width: 0;
    }
    :is(input, select) {
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      padding: 8px;
      border-radius: 8px;
      border: 1px solid var(--borda-forte);
      background: var(--fundo);
      color: var(--texto);
      font: inherit;
    }
    .escolha {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-wrap: anywhere;
      font-size: 13px;
    }
    small {
      color: var(--texto-suave);
    }
  `,
})
export class EquipamentoSelectComponent {
  readonly catalogo = inject(EquipamentosLatam);
  readonly slot = input.required<string>();
  readonly rotulo = input.required<string>();
  readonly valor = input<EquipamentoFicha>();
  readonly mudou = output<ItemEquipamento | undefined>();
  readonly busca = signal("");

  readonly selecionado = computed(() => {
    const valor = this.valor();
    return typeof valor === "object" ? valor : null;
  });
  readonly legado = computed(() => {
    const valor = this.valor();
    return typeof valor === "string" ? valor : null;
  });
  readonly chave = computed(() => this.selecionado()?.id.toString() ?? (this.legado() ? "legado" : ""));
  readonly resultados = computed(() => {
    const termo = normalizar(this.busca().trim());
    const itens = this.catalogo.slots()?.[this.slot()] ?? [];
    return termo ? itens.filter((item) => normalizar(item.nome).includes(termo)) : itens;
  });
  readonly opcoes = computed(() => {
    const primeiros = this.resultados().slice(0, 35);
    const atual = this.selecionado();
    return atual && !primeiros.some((item) => item.id === atual.id) ? [atual, ...primeiros] : primeiros;
  });

  constructor() {
    void this.catalogo.carregar();
  }

  escolher(id: string): void {
    if (id === "legado") return;
    if (id === "") {
      this.mudou.emit(undefined);
      return;
    }
    const item = this.opcoes().find((opcao) => opcao.id === Number(id));
    if (item) this.mudou.emit(item);
  }
}
