import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  type OnInit,
  signal,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { Acao } from "../../../core/acao";
import { Confirmacao } from "../../../core/confirmacao";
import { mensagemDeErro } from "../../../core/modelos";
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
    <ui-pagina [titulo]="admin() ? 'Fila da Nebula' : 'Minhas solicitações'" [subtitulo]="subtitulo()">
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
                [enviando]="emAndamento() === s.id"
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
export class SolicitacoesNebulaPage implements OnInit {
  private readonly api = inject(NebulaApi);
  private readonly acao = inject(Acao);
  private readonly confirmacao = inject(Confirmacao);

  /** Vem da rota: true na fila do admin. */
  readonly admin = input(false);
  protected readonly filtros = FILTROS_FILA;
  protected readonly filtro = signal<FiltroFila>("PENDENTE");
  protected readonly estado = signal<Carregavel<SolicitacaoNebula[]>>(carregando());
  /** Solicitação com uma ação em andamento (o botão dela fica em carregando). */
  protected readonly emAndamento = signal<string | null>(null);
  protected readonly subtitulo = computed(() =>
    this.admin()
      ? "Entregue os materiais no jogo e marque a entrega. A rejeição devolve os pontos e os materiais ao estoque."
      : "Você fabrica nas máquinas do Oscar depois de receber os materiais (é preciso ter vencido o Betelgeuse). Enquanto pendente, você pode cancelar e recebe os pontos de volta.",
  );

  // No ngOnInit (e não no construtor): o modo vem da rota como input e só chega depois de criar.
  ngOnInit(): void {
    void this.carregar();
  }

  /** Carrega a lista. Depois da primeira vez, mantém os cartões na tela enquanto atualiza. */
  async carregar(): Promise<void> {
    if (this.estado().estado !== "pronto") this.estado.set(carregando());
    try {
      const lista = this.admin() ? await this.api.fila(this.filtro()) : await this.api.minhas();
      this.estado.set(pronto(lista));
    } catch (e) {
      this.estado.set(comErro(mensagemDeErro(e)));
    }
  }

  protected async filtrar(f: string): Promise<void> {
    this.filtro.set(f as FiltroFila);
    this.estado.set(carregando());
    await this.carregar();
  }

  private async agir(s: SolicitacaoNebula, op: () => Promise<unknown>, sucesso: string): Promise<void> {
    if (this.emAndamento()) return;
    this.emAndamento.set(s.id);
    await this.acao.executar(op, sucesso);
    this.emAndamento.set(null);
    await this.carregar();
  }

  protected entregar(s: SolicitacaoNebula): Promise<void> {
    return this.agir(s, () => this.api.entregar(s.id), "Entrega registrada.");
  }

  protected rejeitar(s: SolicitacaoNebula, motivo: string): Promise<void> {
    return this.agir(
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
    if (sim) await this.agir(s, () => this.api.cancelar(s.id), "Solicitação cancelada. Os pontos voltaram.");
  }
}
