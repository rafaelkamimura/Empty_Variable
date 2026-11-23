import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { ROTULO_CATEGORIA } from "../../../shared/dominio/emprestimo";
import { siglaDaClasse, tomDe } from "../../../shared/dominio/visual";
import { PontosPipe } from "../../../shared/pipes/pontos.pipe";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import { CartaoComponent } from "../../../shared/ui/cartao/cartao.component";
import type { DetalheRun } from "../data/detalhe-run.modelos";
import { ROTULO_FRACAO } from "../data/runs.modelos";

export type Participacao = DetalheRun["participacoes"][number];

/** Um personagem da party: classe, função, rank, empréstimos e os pontos gerados. */
@Component({
  selector: "app-cartao-participacao",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PontosPipe, BadgeComponent, CartaoComponent],
  template: `
    @let p = participacao();
    <ui-cartao role="article" [attr.aria-label]="p.personagem.nome">
      <div class="topo">
        <span class="emblema" [style.color]="tom()" aria-hidden="true">{{ sigla() }}</span>
        <ui-badge tom="acento">Rank {{ p.rank }}</ui-badge>
      </div>
      <div>
        <strong>{{ p.personagem.nome }}</strong>
        <p class="meta">{{ p.jogador.apelido }} · {{ classe() }} ({{ p.funcao.nome }})</p>
      </div>
      @for (e of p.emprestimos; track e.id) {
        <p class="meta emprestimo">
          Empréstimo de {{ e.credor.apelido }}: {{ e.item?.nome ?? e.itemDescricao }} ·
          {{ rotuloCategoria[e.categoria] }} {{ pct(e.pctEfetivo) }} → {{ e.pontos | pontos }}
        </p>
      }
      <div class="rodape">
        <span class="valor">{{ p.pontosGerados | pontos }}</span>
        <span class="meta">{{ rotuloFracao[p.fracaoCentesimos] }}</span>
      </div>
    </ui-cartao>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .topo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--esp-2);
    }
    .emblema {
      font-size: var(--fs-xl);
      font-weight: 700;
    }
    strong {
      color: var(--texto-forte);
      overflow-wrap: anywhere;
    }
    p {
      margin: 0;
    }
    .meta {
      font-size: var(--fs-s);
      color: var(--texto-suave);
      overflow-wrap: anywhere;
    }
    .emprestimo {
      padding-top: var(--esp-1);
      border-top: 1px dashed var(--borda);
    }
    .rodape {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--esp-2);
      margin-top: auto;
    }
    .valor {
      font-weight: 700;
      color: var(--texto-forte);
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class CartaoParticipacaoComponent {
  readonly participacao = input.required<Participacao>();
  protected readonly rotuloCategoria = ROTULO_CATEGORIA;
  protected readonly rotuloFracao = ROTULO_FRACAO;
  protected readonly classe = computed(() => {
    const c = this.participacao().funcao.classe;
    return c.apelidoGrupo ?? c.nomeOficial;
  });
  protected readonly sigla = computed(() => siglaDaClasse(this.classe()));
  protected readonly tom = computed(() => tomDe(this.classe()));

  protected pct(texto: string): string {
    return `${Number(texto).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  }
}
