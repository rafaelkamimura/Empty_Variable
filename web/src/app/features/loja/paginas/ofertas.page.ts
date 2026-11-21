import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Acao } from "../../../core/acao";
import { Confirmacao } from "../../../core/confirmacao";
import { mensagemDeErro } from "../../../core/modelos";
import { type Carregavel, carregando, comErro, pronto } from "../../../shared/utils/carregavel";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { ComoFuncionaComponent } from "../../../shared/ui/como-funciona/como-funciona.component";
import { EstadoComponent, EstadoProntoDirective } from "../../../shared/ui/estado/estado.component";
import { PaginaComponent } from "../../../shared/ui/pagina/pagina.component";
import { PainelLateralComponent } from "../../../shared/ui/painel-lateral/painel-lateral.component";
import { TabelaDirective } from "../../../shared/ui/tabela/tabela.directive";
import { FormularioOfertaComponent } from "../componentes/formulario-oferta.component";
import { LojaApi } from "../data/loja.api";
import {
  type ItemOfertavel,
  type Oferta,
  podeRetirar,
  ROTULO_STATUS_OFERTA,
  TOM_STATUS_OFERTA,
} from "../data/loja.modelos";

/** Minhas ofertas (/loja/ofertas): itens do membro à venda em consignação (M9). */
@Component({
  selector: "app-ofertas-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    BadgeComponent,
    BotaoComponent,
    ComoFuncionaComponent,
    EstadoComponent,
    EstadoProntoDirective,
    PaginaComponent,
    PainelLateralComponent,
    TabelaDirective,
    FormularioOfertaComponent,
  ],
  template: `
    <ui-pagina titulo="Minhas ofertas" subtitulo="Itens seus à venda na loja do grupo.">
      <button uiBotao variante="principal" (click)="ofertando.set(true)">Nova oferta</button>
      <a uiBotao slot="acao" routerLink="/loja">Voltar à loja</a>
      <ui-como-funciona>
        <p>
          Ofereça itens seus (obtidos fora das runs do grupo). Entregue o item ao guardião no jogo; quando ele
          aprovar, o item entra à venda pelo preço do catálogo. Você recebe os pontos quando o comprador
          receber o item, e pode retirar enquanto não for vendido.
        </p>
      </ui-como-funciona>
      <ui-estado
        [valor]="estado()"
        formatoCarregando="tabela"
        mensagemVazio="Você ainda não ofereceu nenhum item."
        (tentarNovamente)="carregar()"
      >
        <ng-template uiEstadoPronto [tipo]="estado()" let-ofertas>
          <table uiTabela padrao data-testid="minhas-ofertas">
            <thead>
              <tr>
                <th scope="col">Quando</th>
                <th scope="col">Item</th>
                <th scope="col" class="numero">Qtd.</th>
                <th scope="col">Situação</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              @for (o of ofertas; track o.id) {
                <tr>
                  <td>{{ o.criadaEm | date: "dd/MM/yyyy HH:mm" }}</td>
                  <td>{{ o.item.nome }}</td>
                  <td class="numero">{{ o.quantidade }}</td>
                  <td>
                    <ui-badge [tom]="tons[o.status]">{{ rotulos[o.status] }}</ui-badge>
                    @if (o.motivo) {
                      <div class="motivo">{{ o.motivo }}</div>
                    }
                  </td>
                  <td>
                    @if (retiravel(o)) {
                      <button
                        uiBotao
                        variante="perigo"
                        tamanho="p"
                        [carregando]="retirando() === o.id"
                        (click)="retirar(o)"
                      >
                        Retirar
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </ng-template>
      </ui-estado>
      <ui-painel-lateral titulo="Nova oferta" [aberto]="ofertando()" (fechar)="ofertando.set(false)">
        <!-- Recriado a cada abertura: a nova oferta sempre começa vazia (sem repetir a anterior). -->
        @if (ofertando()) {
          <app-formulario-oferta [itens]="itens()" [enviando]="enviando()" (enviar)="ofertar($event)" />
        }
      </ui-painel-lateral>
    </ui-pagina>
  `,
  styles: `
    .motivo {
      margin-top: var(--esp-1);
      font-size: var(--fs-xs);
      color: var(--texto-suave);
    }
  `,
})
export class OfertasPage {
  private readonly api = inject(LojaApi);
  private readonly acao = inject(Acao);
  private readonly confirmacao = inject(Confirmacao);
  protected readonly estado = signal<Carregavel<Oferta[]>>(carregando());
  protected readonly itens = signal<ItemOfertavel[]>([]);
  /** paineis §5: a nova oferta abre no painel lateral. */
  protected readonly ofertando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly retirando = signal<string | null>(null);
  protected readonly rotulos = ROTULO_STATUS_OFERTA;
  protected readonly tons = TOM_STATUS_OFERTA;

  constructor() {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    if (this.estado().estado !== "pronto") this.estado.set(carregando());
    try {
      const [ofertas, itens] = await Promise.all([this.api.minhasOfertas(), this.api.itensOfertaveis()]);
      this.itens.set(itens);
      this.estado.set(pronto(ofertas));
    } catch (erro) {
      this.estado.set(comErro(mensagemDeErro(erro)));
    }
  }

  protected retiravel(o: Oferta): boolean {
    return podeRetirar(o);
  }

  protected async ofertar(pedido: { itemId: string; quantidade: number }): Promise<void> {
    this.enviando.set(true);
    const ok = await this.acao.executar(
      () => this.api.ofertar(pedido),
      "Oferta registrada. Entregue o item ao guardião do grupo para ela ser aprovada.",
    );
    this.enviando.set(false);
    if (ok) this.ofertando.set(false);
    await this.carregar();
  }

  protected async retirar(o: Oferta): Promise<void> {
    const pendente = o.status === "PENDENTE";
    const ok = await this.confirmacao.perguntar(
      pendente
        ? {
            titulo: "Retirar a oferta?",
            descricao: `${o.quantidade}× ${o.item.nome} sai da fila de aprovação do guardião.`,
            confirmar: "Retirar oferta",
          }
        : {
            titulo: `Retirar ${o.item.nome} da loja?`,
            descricao: "O item para de ser vendido agora e o guardião devolve o que sobrou no jogo.",
            confirmar: "Retirar da loja",
            perigo: true,
          },
    );
    if (!ok) return;
    this.retirando.set(o.id);
    await this.acao.executar(
      () => this.api.retirarOferta(o.id),
      pendente ? "Oferta retirada." : "Retirada pedida. O guardião vai devolver o item.",
    );
    this.retirando.set(null);
    await this.carregar();
  }
}
