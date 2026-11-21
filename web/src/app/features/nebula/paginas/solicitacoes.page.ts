import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { Acao } from "../../../core/acao";
import { Confirmacao } from "../../../core/confirmacao";
import { mensagemDeErro } from "../../../core/modelos";
import { SaldoService } from "../../../core/saldo.service";
import { formatarPontos } from "../../../shared/pipes/pontos.pipe";
import { type Carregavel, carregando, comErro, pronto } from "../../../shared/utils/carregavel";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { ChipsFiltroComponent } from "../../../shared/ui/chips-filtro/chips-filtro.component";
import { EstadoComponent, EstadoProntoDirective } from "../../../shared/ui/estado/estado.component";
import { PaginaComponent } from "../../../shared/ui/pagina/pagina.component";
import { CartaoSolicitacaoComponent } from "../componentes/cartao-solicitacao.component";
import { NebulaApi } from "../data/nebula.api";
import { FILTROS_FILA, type FiltroFila, type SolicitacaoNebula } from "../data/nebula.modelos";

/**
 * Solicitações de Nebula (US-19, US-20). Dois modos, pela rota:
 * - membro (/nebula/solicitacoes): as próprias e o cancelamento enquanto pendente;
 * - admin (/admin/nebula, `data.admin`): a fila, das mais antigas, com os lotes, entregar e rejeitar.
 * O modo vem só do `data` da rota, e não de um input: com o `withComponentInputBinding`, um input
 * também receberia `?admin=true` da URL.
 */
@Component({
  selector: "app-solicitacoes-nebula-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    BotaoComponent,
    ChipsFiltroComponent,
    EstadoComponent,
    EstadoProntoDirective,
    PaginaComponent,
    CartaoSolicitacaoComponent,
  ],
  template: `
    <ui-pagina [titulo]="admin() ? 'Fila da Nebula' : 'Minhas solicitações'" [subtitulo]="subtitulo">
      @if (!admin()) {
        <a uiBotao slot="acao" routerLink="/nebula">Ver as Nebulosas</a>
      } @else {
        <ui-chips-filtro
          rotulo="Filtrar por situação"
          [opcoes]="filtros"
          [selecionado]="filtro()"
          (selecionadoChange)="filtrar($event)"
        />
      }
      <ui-estado
        [valor]="estado()"
        mensagemVazio="Nenhuma solicitação {{ admin() ? 'nesta situação' : 'ainda' }}."
        (tentarNovamente)="carregar()"
      >
        <ng-template uiEstadoPronto [tipo]="estado()" let-lista>
          <div class="lista" data-testid="solicitacoes">
            @for (s of lista; track s.id) {
              <app-cartao-solicitacao
                [solicitacao]="s"
                [admin]="admin()"
                [enviando]="emAndamento().has(s.id)"
                (entregar)="entregar(s)"
                (rejeitar)="rejeitar(s, $event)"
                (cancelar)="cancelar(s)"
              />
            }
          </div>
        </ng-template>
      </ui-estado>
    </ui-pagina>
  `,
  styles: `
    .lista {
      display: grid;
      gap: var(--esp-3);
    }
  `,
})
export class SolicitacoesNebulaPage {
  private readonly api = inject(NebulaApi);
  private readonly acao = inject(Acao);
  private readonly confirmacao = inject(Confirmacao);
  private readonly saldo = inject(SaldoService);

  /** Fila do admin: vem do `data` da rota. */
  protected readonly admin = signal(inject(ActivatedRoute).snapshot.data["admin"] === true).asReadonly();
  protected readonly filtros = FILTROS_FILA;
  protected readonly filtro = signal<FiltroFila>("PENDENTE");
  protected readonly estado = signal<Carregavel<SolicitacaoNebula[]>>(carregando());
  /** Solicitações com uma ação em andamento (o botão de cada uma fica em carregando). */
  protected readonly emAndamento = signal<ReadonlySet<string>>(new Set());
  protected readonly subtitulo = this.admin()
    ? "Entregue os materiais no jogo e marque a entrega. A rejeição devolve os pontos e os materiais ao estoque."
    : "Você fabrica nas máquinas do Oscar depois de receber os materiais (é preciso ter vencido o Betelgeuse). Enquanto pendente, você pode cancelar e recebe os pontos de volta.";

  constructor() {
    void this.carregar();
  }

  private versao = 0;

  /**
   * Carrega a lista. Depois da primeira vez, mantém os cartões na tela enquanto atualiza. Só a
   * resposta do pedido mais recente vale: numa troca rápida de filtro, a anterior é descartada.
   */
  async carregar(): Promise<void> {
    const minha = ++this.versao;
    if (this.estado().estado !== "pronto") this.estado.set(carregando());
    try {
      const lista = this.admin() ? await this.api.fila(this.filtro()) : await this.api.minhas();
      if (minha === this.versao) this.estado.set(pronto(lista));
    } catch (e) {
      if (minha === this.versao) this.estado.set(comErro(mensagemDeErro(e)));
    }
  }

  protected async filtrar(f: string): Promise<void> {
    this.filtro.set(f as FiltroFila);
    this.estado.set(carregando());
    await this.carregar();
  }

  /** Uma ação por solicitação de cada vez; ações em linhas diferentes correm juntas. */
  private async agir(s: SolicitacaoNebula, op: () => Promise<unknown>, sucesso: string): Promise<boolean> {
    if (this.emAndamento().has(s.id)) return false;
    this.emAndamento.update((ids) => new Set([...ids, s.id]));
    const ok = await this.acao.executar(op, sucesso);
    this.emAndamento.update((ids) => new Set([...ids].filter((id) => id !== s.id)));
    await this.carregar();
    return ok;
  }

  protected async entregar(s: SolicitacaoNebula): Promise<void> {
    await this.agir(s, () => this.api.entregar(s.id), "Entrega registrada.");
  }

  protected async rejeitar(s: SolicitacaoNebula, motivo: string): Promise<void> {
    await this.agir(
      s,
      () => this.api.rejeitar(s.id, motivo),
      "Solicitação rejeitada. Pontos e materiais devolvidos.",
    );
  }

  protected async cancelar(s: SolicitacaoNebula): Promise<void> {
    const sim = await this.confirmacao.perguntar({
      titulo: `Cancelar a solicitação de ${s.receita.nome}?`,
      descricao: `Os ${formatarPontos(s.preco)} voltam para o seu saldo e os materiais voltam ao estoque do grupo.`,
      confirmar: "Cancelar solicitação",
    });
    if (!sim) return;
    // Os pontos voltam: o saldo do topo acompanha.
    if (await this.agir(s, () => this.api.cancelar(s.id), "Solicitação cancelada. Os pontos voltaram.")) {
      await this.saldo.atualizar();
    }
  }
}
