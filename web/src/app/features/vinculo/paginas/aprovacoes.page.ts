import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { Acao } from "../../../core/acao";
import { AuthService } from "../../../core/auth.service";
import { mensagemDeErro } from "../../../core/modelos";
import { type Carregavel, carregando, comErro, pronto } from "../../../shared/utils/carregavel";
import { EstadoComponent, EstadoProntoDirective } from "../../../shared/ui/estado/estado.component";
import { PaginaComponent } from "../../../shared/ui/pagina/pagina.component";
import { CartaoPedidoVinculoComponent } from "../componentes/cartao-pedido-vinculo.component";
import { VinculoApi } from "../data/vinculo.api";
import type { ClasseFicha, Solicitacao } from "../data/vinculo.modelos";

interface DadosFila {
  pendentes: Solicitacao[];
  classes: ClasseFicha[];
}

/** Solicitações de vínculo (/vinculo/aprovacoes, D12): o admin aprova ou rejeita, com motivo. */
@Component({
  selector: "app-aprovacoes-vinculo-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EstadoComponent, EstadoProntoDirective, PaginaComponent, CartaoPedidoVinculoComponent],
  template: `
    <ui-pagina
      titulo="Solicitações de vínculo"
      subtitulo="Confira o jogador e os personagens antes de aprovar. Quem pede não aprova o próprio vínculo."
    >
      <ui-estado
        [valor]="estado()"
        mensagemVazio="Nenhuma solicitação pendente."
        [estaVazio]="semPendentes"
        (tentarNovamente)="carregar()"
      >
        <ng-template uiEstadoPronto [tipo]="estado()" let-dados>
          <div class="lista" aria-label="Solicitações pendentes" role="region">
            @for (pedido of dados.pendentes; track pedido.id) {
              <app-cartao-pedido-vinculo
                [pedido]="pedido"
                [nomeDaClasse]="nomeDaClasse"
                [proprio]="pedido.usuario.id === auth.usuario()?.id"
                [enviando]="emAndamento().has(pedido.id)"
                (aprovar)="aprovar(pedido)"
                (rejeitar)="rejeitar(pedido, $event)"
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
export class AprovacoesVinculoPage {
  private readonly api = inject(VinculoApi);
  private readonly acao = inject(Acao);
  protected readonly auth = inject(AuthService);

  protected readonly estado = signal<Carregavel<DadosFila>>(carregando());
  protected readonly emAndamento = signal<ReadonlySet<string>>(new Set());
  protected readonly semPendentes = (d: DadosFila) => d.pendentes.length === 0;
  private readonly classes = computed(() => {
    const e = this.estado();
    return new Map(e.estado === "pronto" ? e.dados.classes.map((c) => [c.id, c.nomeOficial]) : []);
  });
  protected readonly nomeDaClasse = (id: string): string => this.classes().get(id) ?? "Classe indisponível";

  constructor() {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    if (this.estado().estado !== "pronto") this.estado.set(carregando());
    try {
      const [pendentes, classes] = await Promise.all([this.api.pendentes(), this.api.classes()]);
      this.estado.set(pronto({ pendentes, classes }));
    } catch (e) {
      this.estado.set(comErro(mensagemDeErro(e)));
    }
  }

  private async agir(pedido: Solicitacao, op: () => Promise<unknown>, sucesso: string): Promise<void> {
    if (this.emAndamento().has(pedido.id)) return;
    this.emAndamento.update((ids) => new Set([...ids, pedido.id]));
    const ok = await this.acao.executar(op, sucesso);
    this.emAndamento.update((ids) => new Set([...ids].filter((id) => id !== pedido.id)));
    // A aprovação pode mudar o papel ou o vínculo de quem está logado (o menu depende disso). Se essa
    // consulta falhar, avisa, e a fila recarrega do mesmo jeito.
    if (ok) {
      try {
        await this.auth.carregar(true);
      } catch (e) {
        this.acao.avisar(mensagemDeErro(e));
      }
    }
    await this.carregar();
  }

  protected aprovar(pedido: Solicitacao): Promise<void> {
    return this.agir(pedido, () => this.api.aprovar(pedido.id), "Vínculo aprovado.");
  }

  protected rejeitar(pedido: Solicitacao, motivo: string): Promise<void> {
    return this.agir(pedido, () => this.api.rejeitar(pedido.id, motivo), "Solicitação rejeitada.");
  }
}
