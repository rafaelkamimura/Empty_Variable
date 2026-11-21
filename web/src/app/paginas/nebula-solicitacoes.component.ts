import { DatePipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, computed, inject, input, type OnInit, signal } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { firstValueFrom } from "rxjs";
import { Acao } from "../core/acao";
import { IconeComponent } from "../shared/dominio/icone.component";
import { mensagemDeErro } from "../core/modelos";
import { ROTULO_STATUS_NEBULA, type SolicitacaoNebula, type StatusSolicitacaoNebula } from "../core/nebula";
import { tomDe } from "../shared/dominio/visual";

type Filtro = StatusSolicitacaoNebula | "TODAS";

const FILTROS: { id: Filtro; nome: string }[] = [
  { id: "PENDENTE", nome: "Pendentes" },
  { id: "ENTREGUE", nome: "Entregues" },
  { id: "REJEITADA", nome: "Rejeitadas" },
  { id: "CANCELADA", nome: "Canceladas" },
  { id: "TODAS", nome: "Todas" },
];

/**
 * US-19 / US-20 (T-45). Dois modos:
 * - membro (`/nebula/solicitacoes`): as próprias solicitações e o cancelamento enquanto pendente;
 * - admin (`/admin/nebula`): a fila, das mais antigas, com os materiais por lote, entregar e rejeitar.
 */
@Component({
  selector: "app-nebula-solicitacoes",
  imports: [DatePipe, IconeComponent, MatButtonModule, MatSnackBarModule],
  template: `
    <div class="pagina">
      <div class="cabecalho-pagina">
        <h1>{{ admin() ? "Fila da Nebula" : "Minhas solicitações" }}</h1>
        <p>
          @if (admin()) {
            Entregue os materiais no jogo e marque a entrega. A rejeição devolve os pontos e os materiais ao
            estoque.
          } @else {
            Você fabrica nas máquinas do Oscar depois de receber os materiais (é preciso ter vencido o
            Betelgeuse). Enquanto pendente, você pode cancelar e recebe os pontos de volta.
          }
        </p>
      </div>

      @if (admin()) {
        <div class="chips" role="group" aria-label="Filtrar por situação">
          @for (f of filtros; track f.id) {
            <button
              type="button"
              class="chip"
              [attr.aria-pressed]="f.id === filtro()"
              (click)="filtrar(f.id)"
            >
              {{ f.nome }}
            </button>
          }
        </div>
      }

      @if (erro(); as e) {
        <p role="alert">{{ e }}</p>
      }

      <div class="lista" data-testid="solicitacoes">
        @for (s of lista(); track s.id) {
          <article class="cartao-b solicitacao" [class.cartao-destaque]="s.status === 'PENDENTE'">
            <div class="cartao-arte arte" [style.color]="tom(s.receita.nome)">
              <app-icone nome="armadura" [tamanho]="36" [traco]="1.4" />
            </div>
            <div class="corpo">
              <div class="topo">
                <strong class="cartao-nome">{{ s.receita.nome }}</strong>
                <span [class]="'cartao-selo estatico ' + classeStatus(s.status)">{{ rotulo[s.status] }}</span>
              </div>
              <div class="cartao-meta">
                @if (admin()) {
                  <strong>{{ s.jogador.apelido }}</strong> ·
                }
                {{ s.criadaEm | date: "dd/MM/yyyy HH:mm" }} ·
                {{
                  s.trazPeca
                    ? "traz a peça"
                    : s.pecaDoEstoque === "PRONTA"
                      ? "peça pronta do estoque"
                      : "materiais da peça do estoque"
                }}
                · <span class="cartao-valor">{{ s.preco }} pts</span> (preço v{{ s.precoReceita.versao }})
              </div>
              <div class="materiais">
                @if (admin() && s.status === "PENDENTE") {
                  @for (l of s.lotes; track $index) {
                    <span class="mat"
                      >{{ l.quantidade }}× {{ l.item }} <small>(lote #{{ l.lote }})</small></span
                    >
                  }
                } @else {
                  @for (m of s.materiais; track m.itemId) {
                    <span class="mat">{{ m.quantidade }}× {{ m.item }}</span>
                  }
                }
              </div>
              @if (s.motivo) {
                <div class="cartao-meta">Motivo: {{ s.motivo }}</div>
              }
              @if (s.status === "PENDENTE") {
                <div class="linha-acoes">
                  @if (admin()) {
                    <button mat-flat-button type="button" (click)="entregar(s)">
                      Entreguei os materiais
                    </button>
                    <button mat-button type="button" (click)="rejeitar(s)">Rejeitar</button>
                  } @else {
                    <button mat-button type="button" (click)="cancelar(s)">Cancelar</button>
                  }
                </div>
              }
            </div>
          </article>
        } @empty {
          <p class="texto-secundario">Nenhuma solicitação {{ admin() ? "nesta situação" : "ainda" }}.</p>
        }
      </div>
    </div>
  `,
  styles: `
    .lista {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .solicitacao {
      flex-direction: row;
      align-items: stretch;
      gap: 14px;
    }
    .arte {
      flex: 0 0 84px;
      height: auto;
      min-height: 84px;
    }
    .corpo {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .topo {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }
    .topo .cartao-nome {
      min-height: 0;
    }
    .estatico {
      position: static;
    }
    .materiais {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .mat {
      padding: 2px 10px;
      border-radius: 999px;
      background: var(--elevado);
      font-size: 13px;
    }
    .mat small {
      color: var(--texto-suave);
    }
    @media (max-width: 600px) {
      .arte {
        display: none;
      }
    }
  `,
})
export class NebulaSolicitacoesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly acao = inject(Acao);

  /** Vem da rota: true na fila do admin. */
  readonly admin = input(false);
  readonly filtros = FILTROS;
  readonly rotulo = ROTULO_STATUS_NEBULA;
  readonly filtro = signal<Filtro>("PENDENTE");
  readonly lista = signal<SolicitacaoNebula[]>([]);
  readonly erro = signal<string | null>(null);
  readonly pendentes = computed(() => this.lista().filter((s) => s.status === "PENDENTE").length);

  async ngOnInit(): Promise<void> {
    await this.recarregar();
  }

  async recarregar(): Promise<void> {
    try {
      const url = this.admin() ? `/api/nebula/fila?status=${this.filtro()}` : "/api/nebula/solicitacoes";
      this.lista.set(await firstValueFrom(this.http.get<SolicitacaoNebula[]>(url)));
      this.erro.set(null);
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
    }
  }

  async filtrar(f: Filtro): Promise<void> {
    this.filtro.set(f);
    await this.recarregar();
  }

  tom(nome: string): string {
    return tomDe(nome);
  }
  classeStatus(s: StatusSolicitacaoNebula): string {
    if (s === "ENTREGUE") return "selo-acento";
    return s === "PENDENTE" ? "selo-alerta" : "";
  }

  async entregar(s: SolicitacaoNebula): Promise<void> {
    await this.acao.executar(
      () => firstValueFrom(this.http.post(`/api/nebula/solicitacoes/${s.id}/entregar`, {})),
      "Entrega registrada.",
    );
    await this.recarregar();
  }

  async rejeitar(s: SolicitacaoNebula): Promise<void> {
    const motivo = window.prompt(`Motivo da rejeição de ${s.receita.nome} (${s.jogador.apelido}):`);
    if (motivo === null) return;
    await this.acao.executar(
      () => firstValueFrom(this.http.post(`/api/nebula/solicitacoes/${s.id}/rejeitar`, { motivo })),
      "Solicitação rejeitada. Pontos e materiais devolvidos.",
    );
    await this.recarregar();
  }

  async cancelar(s: SolicitacaoNebula): Promise<void> {
    if (!window.confirm(`Cancelar a solicitação de ${s.receita.nome}? Os pontos voltam para você.`)) return;
    await this.acao.executar(
      () => firstValueFrom(this.http.post(`/api/nebula/solicitacoes/${s.id}/cancelar`, {})),
      "Solicitação cancelada. Os pontos voltaram.",
    );
    await this.recarregar();
  }
}
