import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Acao } from "../../../core/acao";
import { mensagemDeErro } from "../../../core/modelos";
import { SaldoService } from "../../../core/saldo.service";
import { type Carregavel, carregando, comErro, pronto } from "../../../shared/utils/carregavel";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { EstadoComponent, EstadoProntoDirective } from "../../../shared/ui/estado/estado.component";
import { PaginaComponent } from "../../../shared/ui/pagina/pagina.component";
import { PainelLateralComponent } from "../../../shared/ui/painel-lateral/painel-lateral.component";
import { CartaoNebulosaComponent } from "../componentes/cartao-nebulosa.component";
import { DetalheNebulosaComponent } from "../componentes/detalhe-nebulosa.component";
import { NebulaApi } from "../data/nebula.api";
import {
  bloqueioSolicitar,
  type ReceitaAberta,
  trazPecaInicial,
  type VitrineNebula,
} from "../data/nebula.modelos";

/**
 * Nebula (/nebula, US-17 e US-18): as Nebulosas abertas em cartões; ao escolher uma, o painel
 * lateral mostra os materiais do grupo, a peça Astral (D31), o preço (D32) e o saldo.
 */
@Component({
  selector: "app-nebula-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    BotaoComponent,
    EstadoComponent,
    EstadoProntoDirective,
    PaginaComponent,
    PainelLateralComponent,
    CartaoNebulosaComponent,
    DetalheNebulosaComponent,
  ],
  template: `
    <ui-pagina
      titulo="Nebula"
      subtitulo="O grupo entrega os materiais e você fabrica a Nebulosa nas máquinas do Oscar (é preciso ter vencido o Betelgeuse). A peça Astral você traz, ou ela sai do estoque do grupo."
    >
      <a uiBotao slot="acao" routerLink="/nebula/solicitacoes">Minhas solicitações</a>
      <ui-estado
        [valor]="estado()"
        formatoCarregando="cartoes"
        [quantidadeCarregando]="4"
        mensagemVazio="Nenhuma Nebulosa aberta para solicitação ainda."
        [estaVazio]="semReceitas"
        (tentarNovamente)="carregar()"
      >
        <ng-template uiEstadoPronto [tipo]="estado()" let-v>
          <div class="grade" data-testid="nebulosas">
            @for (r of v.receitas; track r.id) {
              <app-cartao-nebulosa
                [receita]="r"
                [selecionada]="selecionadaId() === r.id"
                (abrir)="escolher(r)"
              />
            }
          </div>
        </ng-template>
      </ui-estado>
      <ui-painel-lateral
        [titulo]="selecionada()?.nome ?? 'Nebulosa'"
        [aberto]="selecionada() !== null"
        (fechar)="fechar()"
      >
        @if (selecionada(); as r) {
          <app-detalhe-nebulosa
            data-testid="painel-nebula"
            [receita]="r"
            [trazPeca]="trazPeca()"
            [saldo]="saldoAtual()"
            [enviando]="enviando()"
            (trazPecaChange)="trazPeca.set($event)"
            (solicitar)="solicitar(r)"
          />
        }
      </ui-painel-lateral>
    </ui-pagina>
  `,
  styles: `
    .grade {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
      gap: var(--esp-3);
    }
  `,
})
export class NebulaPage {
  private readonly api = inject(NebulaApi);
  private readonly acao = inject(Acao);
  private readonly saldo = inject(SaldoService);

  protected readonly estado = signal<Carregavel<VitrineNebula>>(carregando());
  protected readonly selecionadaId = signal<string | null>(null);
  protected readonly trazPeca = signal(false);
  protected readonly enviando = signal(false);
  protected readonly semReceitas = (v: VitrineNebula) => v.receitas.length === 0;

  private readonly vitrine = computed(() => {
    const e = this.estado();
    return e.estado === "pronto" ? e.dados : null;
  });
  /** A selecionada sempre na versão mais nova da vitrine (depois de cada recarga). */
  protected readonly selecionada = computed(
    () => this.vitrine()?.receitas.find((r) => r.id === this.selecionadaId()) ?? null,
  );
  protected readonly saldoAtual = computed(() => this.vitrine()?.saldo ?? 0);

  constructor() {
    void this.carregar();
  }

  /** Carrega a vitrine. Depois da primeira vez, mantém os cartões na tela enquanto atualiza. */
  async carregar(): Promise<void> {
    if (this.estado().estado !== "pronto") this.estado.set(carregando());
    try {
      const v = await this.api.vitrine();
      this.estado.set(pronto(v));
      this.saldo.definir(v.saldo);
    } catch (e) {
      this.estado.set(comErro(mensagemDeErro(e)));
    }
  }

  protected escolher(r: ReceitaAberta): void {
    this.selecionadaId.set(r.id);
    this.trazPeca.set(trazPecaInicial(r));
  }

  protected fechar(): void {
    if (!this.enviando()) this.selecionadaId.set(null);
  }

  protected async solicitar(r: ReceitaAberta): Promise<void> {
    if (this.enviando() || bloqueioSolicitar(r, this.trazPeca(), this.saldoAtual()) !== null) return;
    this.enviando.set(true);
    const ok = await this.acao.executar(
      () => this.api.solicitar(r.id, this.trazPeca()),
      "Solicitação registrada. O guardião do grupo vai entregar os materiais no jogo.",
    );
    this.enviando.set(false);
    if (ok) this.selecionadaId.set(null);
    await this.carregar();
  }
}
