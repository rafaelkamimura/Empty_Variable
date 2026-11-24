import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  Directive,
  input,
  signal,
  TemplateRef,
} from "@angular/core";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { ChipsFiltroComponent, type OpcaoChip } from "../../../shared/ui/chips-filtro/chips-filtro.component";
import { VazioComponent } from "../../../shared/ui/vazio/vazio.component";
import {
  type FiltroLista,
  filtrarLista,
  fraseDaContagem,
  opcoesDoFiltro,
  TAMANHO_DA_PAGINA,
  TODOS,
} from "../data/filtro";

/** Contexto do template da linha: `let-item` recebe a linha. */
export interface ContextoLinha<T> {
  $implicit: T;
}

/**
 * Marca o template de cada linha da `app-lista-filtrada` e tipa o `let-`:
 * `<ng-template appLinhaDaLista [tipo]="itens()" let-item>…</ng-template>`.
 */
@Directive({ selector: "ng-template[appLinhaDaLista]" })
export class LinhaDaListaDirective<T> {
  /** Só para inferir o tipo da linha: passe a mesma lista da `app-lista-filtrada`. */
  readonly tipo = input<readonly T[]>();

  static ngTemplateContextGuard<T>(_d: LinhaDaListaDirective<T>, _ctx: unknown): _ctx is ContextoLinha<T> {
    return true;
  }
}

interface GrupoDeChips {
  readonly chave: string;
  readonly rotulo: string;
  readonly opcoes: readonly OpcaoChip[];
  readonly selecionado: string;
}

/**
 * Lista do relatório com busca, chips com contagem e "Mostrar mais". Só as primeiras linhas vão
 * para o DOM (60 por vez), e a contagem do que foi encontrado é anunciada a cada filtro (§7).
 * A linha é o `<ng-template appLinhaDaLista>` projetado.
 */
@Component({
  selector: "app-lista-filtrada",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    BotaoComponent,
    CampoComponent,
    CampoControleDirective,
    ChipsFiltroComponent,
    VazioComponent,
  ],
  template: `
    <div class="controles">
      <ui-campo class="busca" [rotulo]="rotuloBusca()">
        <input
          uiCampo
          type="search"
          autocomplete="off"
          spellcheck="false"
          [value]="termo()"
          (input)="buscar($event)"
          data-testid="datamine-busca"
        />
      </ui-campo>
      @for (g of grupos(); track g.chave) {
        <ui-chips-filtro
          [rotulo]="g.rotulo"
          [opcoes]="g.opcoes"
          [selecionado]="g.selecionado"
          (selecionadoChange)="escolher(g.chave, $event)"
          [attr.data-testid]="'datamine-chips-' + g.chave"
        />
      }
    </div>
    <p class="contagem" role="status" data-testid="datamine-contagem">{{ frase() }}</p>
    @if (encontrados().length === 0) {
      <ui-vazio
        [mensagem]="
          itens().length === 0 ? mensagemVazio() : 'Nada encontrado. Tente outra busca ou outro filtro.'
        "
      />
    } @else {
      <ul class="linhas" data-testid="datamine-linhas">
        @for (item of visiveis(); track item) {
          <li class="linha">
            <ng-container *ngTemplateOutlet="linha() ?? null; context: { $implicit: item }" />
          </li>
        }
      </ul>
      @if (restantes() > 0) {
        <button uiBotao class="mais" (click)="mostrarMais()" data-testid="datamine-mostrar-mais">
          Mostrar mais {{ proximas() }} ({{ restantes() }} restantes)
        </button>
      }
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
      min-width: 0;
    }
    .controles {
      display: grid;
      gap: var(--esp-3);
    }
    .busca {
      max-width: 480px;
    }
    .contagem {
      margin: 0;
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
    .linhas {
      margin: 0;
      padding: 0;
      list-style: none;
      border: 1px solid var(--borda);
      border-radius: var(--raio-g);
      background: var(--cartao);
    }
    .linha + .linha {
      border-block-start: 1px solid var(--borda);
    }
    .mais {
      justify-self: start;
    }
  `,
})
export class ListaFiltradaComponent<T> {
  /** Todas as linhas da lista (objetos estáveis: a identidade é a chave de cada linha). */
  readonly itens = input.required<readonly T[]>();
  /** Texto já normalizado em que a busca procura (ver `normalizarBusca`). */
  readonly textoDe = input.required<(item: T) => string>();
  /** Rótulo visível do campo de busca (ex.: "Buscar por nome, ID ou descrição"). */
  readonly rotuloBusca = input.required<string>();
  /** Grupos de chips. Um grupo só aparece quando a lista tem mais de um valor nele. */
  readonly filtros = input<readonly FiltroLista<T>[]>([]);
  /** Frase do estado vazio, quando a lista não tem linha nenhuma. */
  readonly mensagemVazio = input("Nada por aqui neste patch.");

  protected readonly linha = contentChild(LinhaDaListaDirective, { read: TemplateRef<ContextoLinha<T>> });

  protected readonly termo = signal("");
  private readonly escolhas = signal<Readonly<Record<string, string>>>({});
  private readonly limite = signal(TAMANHO_DA_PAGINA);

  protected readonly grupos = computed<GrupoDeChips[]>(() =>
    this.filtros()
      .map((f) => ({
        chave: f.chave,
        rotulo: f.rotulo,
        opcoes: opcoesDoFiltro(this.itens(), f),
        selecionado: this.escolhas()[f.chave] ?? TODOS,
      }))
      .filter((g) => g.opcoes.length > 2),
  );
  protected readonly encontrados = computed(() =>
    filtrarLista(this.itens(), {
      termo: this.termo(),
      textoDe: this.textoDe(),
      filtros: this.filtros(),
      escolhas: this.escolhas(),
    }),
  );
  protected readonly visiveis = computed(() => this.encontrados().slice(0, this.limite()));
  protected readonly restantes = computed(() => this.encontrados().length - this.visiveis().length);
  protected readonly proximas = computed(() => Math.min(TAMANHO_DA_PAGINA, this.restantes()));
  protected readonly frase = computed(() =>
    fraseDaContagem(this.visiveis().length, this.encontrados().length, this.itens().length),
  );

  protected buscar(evento: Event): void {
    this.termo.set((evento.target as HTMLInputElement).value);
    this.limite.set(TAMANHO_DA_PAGINA);
  }

  protected escolher(chave: string, valor: string): void {
    this.escolhas.update((atual) => ({ ...atual, [chave]: valor }));
    this.limite.set(TAMANHO_DA_PAGINA);
  }

  protected mostrarMais(): void {
    this.limite.update((n) => n + TAMANHO_DA_PAGINA);
  }
}
