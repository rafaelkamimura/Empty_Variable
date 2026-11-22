import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { CONFIG_V1, pesoDoRank } from "@betel/scoring";
import { mensagemDeErro } from "../../../core/modelos";
import { siglaDaClasse, tomDe } from "../../../shared/dominio/visual";
import { type Carregavel, carregando, comErro, pronto } from "../../../shared/utils/carregavel";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import { CartaoComponent } from "../../../shared/ui/cartao/cartao.component";
import { ComoFuncionaComponent } from "../../../shared/ui/como-funciona/como-funciona.component";
import { EstadoComponent, EstadoProntoDirective } from "../../../shared/ui/estado/estado.component";
import { PaginaComponent } from "../../../shared/ui/pagina/pagina.component";
import { TabelaDirective } from "../../../shared/ui/tabela/tabela.directive";
import { VinculoApi } from "../../vinculo/data/vinculo.api";
import type { SituacaoVinculo } from "../../vinculo/data/vinculo.modelos";
import { ExtratoComponent } from "../componentes/extrato.component";
import { CarteiraApi } from "../data/carteira.api";
import type { Extrato } from "../data/extrato.modelos";

interface DadosMinhaArea {
  situacao: SituacaoVinculo;
  extrato: Extrato;
}

/**
 * Minha área (/me, T-22): o próprio saldo e o histórico (D14), os personagens e, recolhida, a
 * tabela de pontos por rank (paineis §5), calculada pelo mesmo motor da API.
 */
@Component({
  selector: "app-minha-area-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    CartaoComponent,
    ComoFuncionaComponent,
    EstadoComponent,
    EstadoProntoDirective,
    PaginaComponent,
    TabelaDirective,
    ExtratoComponent,
  ],
  template: `
    <ui-estado [valor]="estado()" (tentarNovamente)="carregar()">
      <ng-template uiEstadoPronto [tipo]="estado()" let-dados>
        <ui-pagina
          [titulo]="dados.situacao.jogador?.apelido ?? 'Minha área'"
          subtitulo="Seu saldo, de onde vieram os pontos e os seus personagens."
        >
          <app-extrato [extrato]="dados.extrato" />
          <section aria-labelledby="titulo-personagens">
            <h2 id="titulo-personagens">Meus personagens</h2>
            <div class="grade" data-testid="carteira-personagens">
              @for (p of dados.situacao.jogador?.personagens ?? []; track p.id) {
                <ui-cartao role="article" class="personagem" [class.inativo]="!p.ativo">
                  <span class="emblema" [style.color]="tom(p.nome)" aria-hidden="true">{{
                    sigla(p.nome)
                  }}</span>
                  <strong>{{ p.nome }}</strong>
                  @if (!p.ativo) {
                    <ui-badge>Inativo</ui-badge>
                  }
                </ui-cartao>
              }
            </div>
          </section>
          <ui-como-funciona titulo="Quantos pontos vale cada rank">
            <p>
              Pontos base de uma participação completa num encontro ×1 (como o Naght), com a run concluída:
            </p>
            <table uiTabela padrao aria-label="Pontos por rank" data-testid="carteira-pontos-por-rank">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col" class="numero">Pontos</th>
                </tr>
              </thead>
              <tbody>
                @for (linha of pontosPorRank; track linha.rank) {
                  <tr>
                    <td>{{ linha.rank }}</td>
                    <td class="numero">{{ linha.pontos }}</td>
                  </tr>
                }
              </tbody>
            </table>
            <p>
              Cada instância tem os próprios encontros (o Betelgeuse vale mais) e as próprias funções e ranks;
              falha ou abandono valem menos. Empréstimos dividem os pontos com quem emprestou.
            </p>
          </ui-como-funciona>
        </ui-pagina>
      </ng-template>
    </ui-estado>
  `,
  styles: `
    section {
      display: grid;
      gap: var(--esp-3);
    }
    h2 {
      margin: 0;
      font-size: var(--fs-l);
      font-weight: 600;
      color: var(--texto-forte);
    }
    .grade {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 160px), 1fr));
      gap: var(--esp-3);
    }
    .personagem {
      align-items: center;
      text-align: center;
    }
    .personagem.inativo {
      opacity: 0.7;
    }
    .personagem strong {
      color: var(--texto-forte);
      overflow-wrap: anywhere;
    }
    .emblema {
      font-size: var(--fs-xl);
      font-weight: 700;
    }
  `,
})
export class MinhaAreaPage {
  private readonly carteira = inject(CarteiraApi);
  private readonly vinculo = inject(VinculoApi);

  protected readonly estado = signal<Carregavel<DadosMinhaArea>>(carregando());

  /** B × W(r), calculado pelo mesmo motor usado pela API. */
  protected readonly pontosPorRank = [5, 4, 3, 2, 1].map((rank) => ({
    rank,
    pontos: (CONFIG_V1.base * pesoDoRank(rank, CONFIG_V1.alphaCentesimos)) / 100,
  }));

  constructor() {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    this.estado.set(carregando());
    try {
      const [situacao, extrato] = await Promise.all([this.vinculo.situacao(), this.carteira.meuExtrato()]);
      this.estado.set(pronto({ situacao, extrato }));
    } catch (e) {
      this.estado.set(comErro(mensagemDeErro(e)));
    }
  }

  protected tom(nome: string): string {
    return tomDe(nome);
  }
  /** Iniciais do personagem no emblema ("Ana-MTK" → "AM"). */
  protected sigla(nome: string): string {
    return siglaDaClasse(nome.replace(/[-_]/g, " "));
  }
}
