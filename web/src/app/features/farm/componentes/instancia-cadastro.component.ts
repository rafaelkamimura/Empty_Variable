import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from "@angular/core";
import {
  ehRecarga,
  formatarZenyCompleto,
  lerZeny,
  RECARGAS,
  type Recarga,
  ROTULO_RECARGA,
} from "@betel/farm";
import { ImagemItemComponent } from "../../../shared/dominio/imagem-item.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { CartaoComponent } from "../../../shared/ui/cartao/cartao.component";
import { TabelaDirective } from "../../../shared/ui/tabela/tabela.directive";
import { ChipsFiltroComponent, type OpcaoChip } from "../../../shared/ui/chips-filtro/chips-filtro.component";
import { lerNome } from "../data/cadastro.modelos";
import type { InstanciaFarm, ItemFarm, PersonagemFarm } from "../data/farm.modelos";
import { type BuscarItens, FarmBuscaItemComponent, type ItemEscolhido } from "./busca-item.component";
import { CampoSalvoComponent, type SalvarCampo } from "./campo-salvo.component";

/** Salva uma mudança da instância ou de um item; devolve se deu certo. */
export type SalvarInstancia = (mudanca: {
  nome?: string;
  recarga?: Recarga;
  personagemIds?: string[];
}) => Promise<boolean>;
export type SalvarPreco = (item: ItemFarm, precoZeny: number | null) => Promise<boolean>;

/**
 * Uma instância no cadastro (D49, D50): fechada, só o resumo; aberta, o nome, a recarga, quem faz,
 * os drops com o preço e a busca de item. O loot do catálogo entra pelo conteúdo projetado.
 */
@Component({
  selector: "app-instancia-cadastro",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BotaoComponent,
    CampoComponent,
    CampoControleDirective,
    CartaoComponent,
    ChipsFiltroComponent,
    ImagemItemComponent,
    FarmBuscaItemComponent,
    CampoSalvoComponent,
    TabelaDirective,
  ],
  template: `
    <ui-cartao [destaque]="aberta()" [attr.data-testid]="'cadastro-' + instancia().nome">
      <div class="topo">
        <div class="titulo">
          <h3>{{ instancia().nome }}</h3>
          <p class="dica">{{ resumo() }}</p>
        </div>
        <button uiBotao tamanho="p" (click)="alternar.emit()" [attr.aria-expanded]="aberta()">
          {{ aberta() ? "Fechar" : "Editar" }}
        </button>
      </div>

      @if (aberta()) {
        <div class="linha">
          <app-campo-salvo
            class="nome"
            rotuloVisivel
            rotulo="Nome da instância"
            [valor]="instancia().nome"
            [maximo]="80"
            [ler]="lerNome"
            [salvar]="salvarNome"
          />
          <ui-campo class="recarga" rotulo="Recarga">
            <select uiCampo (change)="mudarRecarga($event)">
              @for (r of recargas; track r) {
                <option [value]="r" [selected]="instancia().recarga === r">{{ rotuloRecarga[r] }}</option>
              }
            </select>
          </ui-campo>
        </div>

        <h4>Quem faz</h4>
        <ui-chips-filtro
          rotulo="Quem faz"
          multipla
          [opcoes]="opcoesPersonagens()"
          [selecionados]="marcados()"
          (selecionadosChange)="mudarPersonagens($event)"
        />

        <h4>Drops</h4>
        <p class="dica">
          Liste o que costuma dropar. A quantidade de cada run vai no check-in, onde também dá para incluir
          itens que não estão aqui. Busque pelo nome ou pelo ID do item na Divine Pride.
        </p>
        @if (linhas().length > 0) {
          <table uiTabela padrao class="drops">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Preço de venda</th>
                <th scope="col" aria-label="Ações"></th>
              </tr>
            </thead>
            <tbody>
              @for (l of linhas(); track l.item.id) {
                @let item = l.item;
                <tr>
                  <td>
                    <span class="nome-item">
                      <app-imagem-item [idJogo]="item.idJogo" [nome]="item.nome" [tamanho]="24" />
                      {{ item.nome }}
                    </span>
                  </td>
                  <td>
                    <app-campo-salvo
                      [rotulo]="'Preço de ' + item.nome"
                      placeholder="Sem preço"
                      modoTeclado="decimal"
                      [valor]="preco(item)"
                      [ler]="lerPreco"
                      [salvar]="l.salvarPreco"
                      (invalido)="precoInvalido.emit()"
                    />
                  </td>
                  <td class="acoes">
                    <button
                      uiBotao
                      variante="fantasma"
                      tamanho="p"
                      (click)="tirar.emit(item)"
                      [attr.aria-label]="'Tirar ' + item.nome + ' dos drops'"
                    >
                      Tirar
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
        <app-farm-busca-item
          [buscar]="buscar()"
          [idCampo]="'drop-' + instancia().id"
          rotulo="Adicionar item aos drops"
          (escolher)="adicionar.emit($event)"
        />

        <ng-content />

        <div class="rodape">
          <button uiBotao variante="perigo" tamanho="p" (click)="excluir.emit()">Excluir instância</button>
        </div>
      }
    </ui-cartao>
  `,
  styles: `
    :host {
      display: block;
    }
    .topo {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--esp-2);
    }
    .titulo {
      min-width: 0;
    }
    h3 {
      margin: 0;
      font-size: var(--fs-m);
      font-weight: 600;
      color: var(--texto-forte);
      overflow-wrap: anywhere;
    }
    h4 {
      margin: var(--esp-2) 0 0;
      font-size: var(--fs-s);
      font-weight: 600;
      color: var(--texto-suave);
    }
    p {
      margin: 0;
    }
    .dica {
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
    .linha {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--esp-2);
    }
    .linha .nome {
      flex: 1 1 200px;
    }
    .linha .recarga {
      flex: 0 1 180px;
    }
    .nome-item {
      display: inline-flex;
      align-items: center;
      gap: var(--esp-2);
      min-width: 0;
      overflow-wrap: anywhere;
    }
    @container conteudo (min-width: 761px) {
      .acoes {
        width: 1%;
        text-align: right;
      }
    }
    .rodape {
      display: flex;
      justify-content: flex-end;
      padding-top: var(--esp-2);
    }
  `,
})
export class InstanciaCadastroComponent {
  readonly instancia = input.required<InstanciaFarm>();
  readonly personagens = input.required<readonly PersonagemFarm[]>();
  /** Itens dos drops, na ordem do cadastro. */
  readonly drops = input.required<readonly ItemFarm[]>();
  readonly aberta = input(false);
  readonly buscar = input.required<BuscarItens>();
  readonly salvar = input.required<SalvarInstancia>();
  readonly salvarPreco = input.required<SalvarPreco>();

  readonly alternar = output();
  readonly tirar = output<ItemFarm>();
  readonly adicionar = output<ItemEscolhido>();
  readonly excluir = output();
  readonly precoInvalido = output();

  protected readonly recargas = RECARGAS;
  protected readonly rotuloRecarga = ROTULO_RECARGA;
  protected readonly lerNome = lerNome;
  protected readonly lerPreco = lerZeny;
  protected readonly salvarNome: SalvarCampo<string> = (nome) => this.salvar()({ nome });

  protected readonly resumo = computed(() => {
    const i = this.instancia();
    return `${ROTULO_RECARGA[i.recarga]} · ${i.personagemIds.length} personagem(ns) · ${i.drops.length} item(ns)`;
  });
  protected readonly opcoesPersonagens = computed<OpcaoChip[]>(() =>
    this.personagens().map((p) => ({ valor: p.id, rotulo: p.nome })),
  );

  protected preco(item: ItemFarm): string {
    return item.precoZeny === null ? "" : formatarZenyCompleto(item.precoZeny);
  }

  /** Os drops com uma função de salvar o preço cada, estável entre as renderizações. */
  protected readonly linhas = computed(() =>
    this.drops().map((item) => ({
      item,
      salvarPreco: ((valor) => this.salvarPreco()(item, valor)) as SalvarCampo<number | null>,
    })),
  );

  /**
   * O que a tela mostra em "Quem faz". Segue o servidor (a cada recarga do estado) e muda na hora do
   * clique; se a gravação falha, volta ao que o servidor tem. Sem isso, o chip ficaria marcado e o
   * próximo clique gravaria a lista local, com o personagem que deu erro.
   */
  protected readonly marcados = linkedSignal<readonly string[]>(() => this.instancia().personagemIds);

  protected async mudarPersonagens(ids: readonly string[]): Promise<void> {
    this.marcados.set(ids);
    if (!(await this.salvar()({ personagemIds: [...ids] })))
      this.marcados.set([...this.instancia().personagemIds]);
  }

  protected async mudarRecarga(evento: Event): Promise<void> {
    const select = evento.target as HTMLSelectElement;
    const valor = select.value;
    if (!ehRecarga(valor)) return;
    // Na falha, o select volta ao valor do servidor. O binding não basta: o valor ligado não mudou.
    if (!(await this.salvar()({ recarga: valor }))) select.value = this.instancia().recarga;
  }
}
