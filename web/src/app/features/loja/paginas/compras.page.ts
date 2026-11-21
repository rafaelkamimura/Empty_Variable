import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Acao } from "../../../core/acao";
import { Confirmacao } from "../../../core/confirmacao";
import { mensagemDeErro } from "../../../core/modelos";
import { SaldoService } from "../../../core/saldo.service";
import { formatarPontos, PontosPipe } from "../../../shared/pipes/pontos.pipe";
import { type Carregavel, carregando, comErro, pronto } from "../../../shared/utils/carregavel";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { EstadoComponent, EstadoProntoDirective } from "../../../shared/ui/estado/estado.component";
import { PaginaComponent } from "../../../shared/ui/pagina/pagina.component";
import { TabelaDirective } from "../../../shared/ui/tabela/tabela.directive";
import { LojaApi } from "../data/loja.api";
import { type Compra, ROTULO_STATUS_COMPRA, TOM_STATUS_COMPRA } from "../data/loja.modelos";

/** Minhas compras (/loja/compras): histórico e cancelamento enquanto a entrega não acontece. */
@Component({
  selector: "app-compras-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    PontosPipe,
    BadgeComponent,
    BotaoComponent,
    EstadoComponent,
    EstadoProntoDirective,
    PaginaComponent,
    TabelaDirective,
  ],
  template: `
    <ui-pagina
      titulo="Minhas compras"
      subtitulo="Enquanto a entrega no jogo não acontece, dá para cancelar e receber os pontos de volta."
    >
      <a uiBotao slot="acao" routerLink="/loja">Voltar à loja</a>
      <ui-estado
        [valor]="estado()"
        formatoCarregando="tabela"
        mensagemVazio="Você ainda não comprou nada."
        (tentarNovamente)="carregar()"
      >
        <a uiBotao variante="principal" slot="vazio-acao" routerLink="/loja">Ir à loja</a>
        <ng-template uiEstadoPronto [tipo]="estado()" let-compras>
          <table uiTabela data-testid="minhas-compras">
            <thead>
              <tr>
                <th scope="col">Quando</th>
                <th scope="col">Item</th>
                <th scope="col" class="numero">Qtd.</th>
                <th scope="col" class="numero">Total</th>
                <th scope="col">Situação</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              @for (c of compras; track c.id) {
                <tr>
                  <td>{{ c.criadaEm | date: "dd/MM/yyyy HH:mm" }}</td>
                  <td>{{ c.item.nome }}</td>
                  <td class="numero">{{ c.quantidade }}</td>
                  <td class="numero">{{ c.total | pontos }}</td>
                  <td>
                    <ui-badge [tom]="tons[c.status]">{{ rotulos[c.status] }}</ui-badge>
                    @if (c.motivoCancelamento) {
                      <div class="motivo">{{ c.motivoCancelamento }}</div>
                    }
                  </td>
                  <td>
                    @if (c.status === "PENDENTE_ENTREGA") {
                      <button
                        uiBotao
                        variante="perigo"
                        tamanho="p"
                        [carregando]="cancelando() === c.id"
                        (click)="cancelar(c)"
                      >
                        Cancelar
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </ng-template>
      </ui-estado>
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
export class ComprasPage {
  private readonly api = inject(LojaApi);
  private readonly acao = inject(Acao);
  private readonly confirmacao = inject(Confirmacao);
  private readonly saldo = inject(SaldoService);
  protected readonly estado = signal<Carregavel<Compra[]>>(carregando());
  protected readonly cancelando = signal<string | null>(null);
  protected readonly rotulos = ROTULO_STATUS_COMPRA;
  protected readonly tons = TOM_STATUS_COMPRA;

  constructor() {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    if (this.estado().estado !== "pronto") this.estado.set(carregando());
    try {
      this.estado.set(pronto(await this.api.minhasCompras()));
    } catch (erro) {
      this.estado.set(comErro(mensagemDeErro(erro)));
    }
  }

  protected async cancelar(c: Compra): Promise<void> {
    const ok = await this.confirmacao.perguntar({
      titulo: "Cancelar a compra?",
      descricao: `${c.quantidade}× ${c.item.nome}: os ${formatarPontos(c.total)} voltam para o seu saldo.`,
      confirmar: "Cancelar compra",
      perigo: true,
    });
    if (!ok) return;
    this.cancelando.set(c.id);
    const feito = await this.acao.executar(
      () => this.api.cancelarCompra(c.id),
      "Compra cancelada. Os pontos voltaram para o seu saldo.",
    );
    this.cancelando.set(null);
    if (feito) await Promise.all([this.carregar(), this.saldo.atualizar()]);
  }
}
