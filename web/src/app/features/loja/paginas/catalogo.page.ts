import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../../core/auth.service";
import { mensagemDeErro } from "../../../core/modelos";
import { SaldoService } from "../../../core/saldo.service";
import { telaLiberada } from "../../../core/telas-liberadas";
import { type Carregavel, carregando, comErro, pronto } from "../../../shared/utils/carregavel";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { EstadoComponent, EstadoProntoDirective } from "../../../shared/ui/estado/estado.component";
import { PaginaComponent } from "../../../shared/ui/pagina/pagina.component";
import { PainelLateralComponent } from "../../../shared/ui/painel-lateral/painel-lateral.component";
import { CartaoItemLojaComponent } from "../componentes/cartao-item-loja.component";
import { FormularioCompraComponent } from "../componentes/formulario-compra.component";
import { LojaApi } from "../data/loja.api";
import { filtrarPorNome, type ItemCatalogoLoja, type ItemVitrine } from "../data/loja.modelos";

/** Catálogo da loja (/loja): itens em estoque, busca e a compra num painel lateral. */
@Component({
  selector: "app-catalogo-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    BotaoComponent,
    CampoComponent,
    CampoControleDirective,
    EstadoComponent,
    EstadoProntoDirective,
    PaginaComponent,
    PainelLateralComponent,
    CartaoItemLojaComponent,
    FormularioCompraComponent,
  ],
  template: `
    <ui-pagina titulo="Loja de Pontos" subtitulo="Troque seus pontos por itens do estoque do grupo.">
      @if (linksLiberados) {
        <span slot="acao" class="links">
          <a uiBotao routerLink="/loja/compras">Minhas compras</a>
          <a uiBotao routerLink="/loja/ofertas">Minhas ofertas</a>
        </span>
      }
      <ui-campo rotulo="Buscar item" class="busca">
        <input uiCampo type="search" [value]="busca()" (input)="busca.set(texto($event))" />
      </ui-campo>
      <ui-estado
        [valor]="estado()"
        formatoCarregando="cartoes"
        [quantidadeCarregando]="6"
        mensagemVazio="Nenhum item em estoque."
        (tentarNovamente)="carregar()"
      >
        <ng-template uiEstadoPronto [tipo]="estado()">
          <div class="grade" data-testid="catalogo-loja">
            @for (item of visiveis(); track item.itemId) {
              <app-cartao-item-loja [item]="item" (abrir)="abrir(item)" />
            } @empty {
              <p class="nada">Nenhum item encontrado.</p>
            }
          </div>
        </ng-template>
      </ui-estado>
      <ui-painel-lateral titulo="Solicitar compra" [aberto]="selecionado() !== null" (fechar)="fechar()">
        @if (selecionado(); as item) {
          <app-formulario-compra
            [item]="item"
            [cotacao]="cotacao()"
            [saldo]="saldo.saldo()"
            [vinculado]="vinculado()"
            [consultando]="consultando()"
            [enviando]="enviando()"
            [sucesso]="sucesso()"
            [erro]="erroCompra()"
            (confirmar)="comprar($event)"
          />
        }
      </ui-painel-lateral>
    </ui-pagina>
  `,
  styles: `
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-2);
    }
    .busca {
      max-width: 320px;
    }
    .grade {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 160px), 1fr));
      gap: var(--esp-3);
    }
    .nada {
      grid-column: 1 / -1;
      margin: 0;
      color: var(--texto-suave);
    }
  `,
})
export class CatalogoPage {
  private readonly api = inject(LojaApi);
  private readonly auth = inject(AuthService);
  protected readonly saldo = inject(SaldoService);
  /** Compras e ofertas aparecem só quando as telas forem liberadas. */
  protected readonly linksLiberados = telaLiberada("/loja/compras") && telaLiberada("/loja/ofertas");

  protected readonly estado = signal<Carregavel<ItemCatalogoLoja[]>>(carregando());
  protected readonly busca = signal("");
  protected readonly visiveis = computed(() => {
    const e = this.estado();
    return e.estado === "pronto" ? filtrarPorNome(e.dados, this.busca()) : [];
  });

  protected readonly selecionado = signal<ItemCatalogoLoja | null>(null);
  protected readonly cotacao = signal<ItemVitrine | null>(null);
  protected readonly consultando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly sucesso = signal(false);
  protected readonly erroCompra = signal<string | null>(null);
  protected readonly vinculado = computed(() => !!this.auth.usuario()?.jogador);

  constructor() {
    void this.carregar();
  }

  /** Carrega o catálogo. Depois da primeira vez, mantém a lista na tela enquanto atualiza. */
  async carregar(): Promise<void> {
    if (this.estado().estado !== "pronto") this.estado.set(carregando());
    try {
      this.estado.set(pronto(await this.api.catalogo()));
    } catch (erro) {
      this.estado.set(comErro(mensagemDeErro(erro)));
    }
  }

  protected texto(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected async abrir(item: ItemCatalogoLoja): Promise<void> {
    this.selecionado.set(item);
    this.cotacao.set(null);
    this.erroCompra.set(null);
    this.sucesso.set(false);
    this.consultando.set(false);
    if (item.preco === null || !this.vinculado()) return;
    this.consultando.set(true);
    try {
      const vitrine = await this.api.vitrine();
      if (this.selecionado() !== item) return;
      this.saldo.definir(vitrine.saldo);
      const cotacao = vitrine.itens.find((atual) => atual.itemId === item.itemId) ?? null;
      this.cotacao.set(cotacao);
      if (!cotacao) this.erroCompra.set("O item não está à venda no momento.");
    } catch (erro) {
      if (this.selecionado() === item) this.erroCompra.set(mensagemDeErro(erro));
    } finally {
      if (this.selecionado() === item) this.consultando.set(false);
    }
  }

  protected fechar(): void {
    if (!this.enviando()) this.selecionado.set(null);
  }

  protected async comprar(quantidade: number): Promise<void> {
    const cotacao = this.cotacao();
    if (!cotacao || this.enviando()) return;
    this.enviando.set(true);
    this.erroCompra.set(null);
    try {
      await this.api.comprar({ itemId: cotacao.itemId, quantidade, precoEsperado: cotacao.preco });
      this.sucesso.set(true);
      await Promise.all([this.saldo.atualizar(), this.carregar()]);
    } catch (erro) {
      this.erroCompra.set(mensagemDeErro(erro));
      void this.saldo.atualizar();
    } finally {
      this.enviando.set(false);
    }
  }
}
