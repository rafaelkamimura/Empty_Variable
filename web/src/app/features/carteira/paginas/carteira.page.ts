import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { MatTabsModule } from "@angular/material/tabs";
import { RouterLink } from "@angular/router";
import { Acao } from "../../../core/acao";
import { AuthService } from "../../../core/auth.service";
import { mensagemDeErro } from "../../../core/modelos";
import { SaldoService } from "../../../core/saldo.service";
import { PontosPipe } from "../../../shared/pipes/pontos.pipe";
import { type Carregavel, carregando, comErro, pronto } from "../../../shared/utils/carregavel";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { EstadoComponent, EstadoProntoDirective } from "../../../shared/ui/estado/estado.component";
import { PaginaComponent } from "../../../shared/ui/pagina/pagina.component";
import { PainelLateralComponent } from "../../../shared/ui/painel-lateral/painel-lateral.component";
import { TabelaDirective } from "../../../shared/ui/tabela/tabela.directive";
import { VazioComponent } from "../../../shared/ui/vazio/vazio.component";
import { LojaApi } from "../../loja/data/loja.api";
import { type Compra, ROTULO_STATUS_COMPRA, TOM_STATUS_COMPRA } from "../../loja/data/loja.modelos";
import { ExtratoComponent } from "../componentes/extrato.component";
import { FormularioTransferenciaComponent } from "../componentes/formulario-transferencia.component";
import { SaldoCarteiraComponent } from "../componentes/saldo-carteira.component";
import { CarteiraApi } from "../data/carteira.api";
import type { Destinatario, PedidoTransferencia } from "../data/carteira.modelos";
import { apenasCreditos, type Extrato } from "../data/extrato.modelos";

interface DadosCarteira {
  extrato: Extrato;
  compras: Compra[];
}

/** Carteira (/carteira): saldo, movimentos, créditos, compras e a transferência de pontos. */
@Component({
  selector: "app-carteira-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    MatTabsModule,
    RouterLink,
    PontosPipe,
    AvisoComponent,
    BadgeComponent,
    BotaoComponent,
    EstadoComponent,
    EstadoProntoDirective,
    PaginaComponent,
    PainelLateralComponent,
    TabelaDirective,
    VazioComponent,
    ExtratoComponent,
    FormularioTransferenciaComponent,
    SaldoCarteiraComponent,
  ],
  template: `
    <ui-pagina titulo="Carteira" subtitulo="Seus pontos, créditos e compras.">
      <button uiBotao variante="principal" [disabled]="!podeTransferir()" (click)="abrirTransferencia()">
        Transferir pontos
      </button>
      @if (!vinculado()) {
        <ui-aviso tom="info" titulo="Sem jogador vinculado">
          Vincule sua conta a um jogador para consultar a carteira e transferir pontos.
          <a uiBotao tamanho="p" slot="acoes" routerLink="/vinculo">Vincular conta</a>
        </ui-aviso>
      } @else {
        <ui-estado [valor]="estado()" (tentarNovamente)="carregar()">
          <ng-template uiEstadoPronto [tipo]="estado()" let-dados>
            <app-saldo-carteira [saldo]="dados.extrato.saldo" />
            <mat-tab-group animationDuration="0ms" class="abas">
              <mat-tab label="Movimentos">
                <app-extrato [extrato]="dados.extrato" [mostrarSaldo]="false" />
              </mat-tab>
              <mat-tab label="Créditos">
                <app-extrato
                  [extrato]="creditos()"
                  [mostrarSaldo]="false"
                  mensagemVazio="Nenhum crédito ainda."
                />
              </mat-tab>
              <mat-tab label="Compras">
                <div data-testid="compras-carteira">
                  @if (dados.compras.length === 0) {
                    <ui-vazio mensagem="Nenhuma compra registrada." />
                  } @else {
                    <table uiTabela padrao>
                      <thead>
                        <tr>
                          <th scope="col">Item</th>
                          <th scope="col">Quando</th>
                          <th scope="col" class="numero">Qtd.</th>
                          <th scope="col" class="numero">Total</th>
                          <th scope="col">Situação</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (c of dados.compras; track c.id) {
                          <tr>
                            <td>{{ c.item.nome }}</td>
                            <td>{{ c.criadaEm | date: "dd/MM/yyyy HH:mm" }}</td>
                            <td class="numero">{{ c.quantidade }}</td>
                            <td class="numero">{{ c.total | pontos }}</td>
                            <td>
                              <ui-badge [tom]="tonsCompra[c.status]">{{ rotulosCompra[c.status] }}</ui-badge>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  }
                </div>
              </mat-tab>
            </mat-tab-group>
          </ng-template>
        </ui-estado>
      }
      <ui-painel-lateral
        titulo="Transferir pontos"
        [aberto]="transferindo()"
        (fechar)="fecharTransferencia()"
      >
        @if (transferindo()) {
          <app-formulario-transferencia
            [saldo]="saldoAtual()"
            [destinatarios]="destinatarios()"
            [carregando]="carregandoDestinatarios()"
            [enviando]="enviando()"
            [erro]="erroTransferencia()"
            (confirmar)="transferir($event)"
          />
        }
      </ui-painel-lateral>
    </ui-pagina>
  `,
  styles: `
    .abas {
      margin-top: var(--esp-4);
    }
    app-extrato,
    [data-testid="compras-carteira"] {
      display: block;
      margin-top: var(--esp-3);
    }
  `,
})
export class CarteiraPage {
  private readonly api = inject(CarteiraApi);
  private readonly loja = inject(LojaApi);
  private readonly auth = inject(AuthService);
  private readonly saldo = inject(SaldoService);
  private readonly acao = inject(Acao);
  private abertura = 0;

  protected readonly rotulosCompra = ROTULO_STATUS_COMPRA;
  protected readonly tonsCompra = TOM_STATUS_COMPRA;
  protected readonly vinculado = computed(() => !!this.auth.usuario()?.jogador);
  protected readonly estado = signal<Carregavel<DadosCarteira>>(carregando());
  protected readonly saldoAtual = computed(() => {
    const e = this.estado();
    return e.estado === "pronto" ? e.dados.extrato.saldo : 0;
  });
  protected readonly creditos = computed(() => {
    const e = this.estado();
    return e.estado === "pronto" ? apenasCreditos(e.dados.extrato) : null;
  });
  protected readonly podeTransferir = computed(() => this.vinculado() && this.saldoAtual() > 0);

  protected readonly transferindo = signal(false);
  protected readonly destinatarios = signal<Destinatario[]>([]);
  protected readonly carregandoDestinatarios = signal(false);
  protected readonly enviando = signal(false);
  protected readonly erroTransferencia = signal<string | null>(null);

  constructor() {
    if (this.vinculado()) void this.carregar();
  }

  /** Carrega extrato e compras. Depois da primeira vez, mantém os dados na tela enquanto atualiza. */
  async carregar(): Promise<void> {
    if (this.estado().estado !== "pronto") this.estado.set(carregando());
    try {
      const [extrato, compras] = await Promise.all([this.api.meuExtrato(), this.loja.minhasCompras()]);
      this.estado.set(pronto({ extrato, compras }));
      this.saldo.definir(extrato.saldo);
    } catch (erro) {
      this.estado.set(comErro(mensagemDeErro(erro)));
    }
  }

  protected async abrirTransferencia(): Promise<void> {
    if (this.transferindo()) return;
    const abertura = ++this.abertura;
    this.erroTransferencia.set(null);
    this.destinatarios.set([]);
    this.carregandoDestinatarios.set(true);
    this.transferindo.set(true);
    try {
      const jogadores = await this.api.destinatarios();
      if (this.abertura === abertura) this.destinatarios.set(jogadores);
    } catch (erro) {
      if (this.abertura === abertura) this.erroTransferencia.set(mensagemDeErro(erro));
    } finally {
      if (this.abertura === abertura) this.carregandoDestinatarios.set(false);
    }
  }

  protected fecharTransferencia(): void {
    if (!this.enviando()) this.transferindo.set(false);
  }

  protected async transferir(pedido: PedidoTransferencia): Promise<void> {
    if (this.enviando()) return;
    this.enviando.set(true);
    this.erroTransferencia.set(null);
    try {
      await this.api.transferir(pedido);
      const apelido =
        this.destinatarios().find((d) => d.id === pedido.destinatarioId)?.apelido ?? "o jogador";
      this.transferindo.set(false);
      this.acao.avisar(`Transferência enviada para ${apelido}.`);
      await this.carregar();
    } catch (erro) {
      this.erroTransferencia.set(mensagemDeErro(erro));
    } finally {
      this.enviando.set(false);
    }
  }
}
