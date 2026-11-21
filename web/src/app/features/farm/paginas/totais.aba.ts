import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from "@angular/core";
import { formatarZeny, formatarZenyCompleto, type ModoPeriodo, periodo } from "@betel/farm";
import { Acao } from "../../../core/acao";
import { Confirmacao } from "../../../core/confirmacao";
import { mensagemDeErro } from "../../../core/modelos";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { ChipsFiltroComponent, type OpcaoChip } from "../../../shared/ui/chips-filtro/chips-filtro.component";
import { ResumoComponent } from "../../../shared/ui/resumo/resumo.component";
import { VazioComponent } from "../../../shared/ui/vazio/vazio.component";
import { type TabelasTotais, TabelasTotaisComponent } from "../componentes/tabelas-totais.component";
import {
  type CheckinFarm,
  nomesDosCheckins,
  quandoDoCheckin,
  textoDosDrops,
  totaisDosCheckins,
} from "../data/farm.modelos";
import { FarmStore } from "../data/farm.store";

const MODOS: OpcaoChip[] = [
  { valor: "dia", rotulo: "Dia" },
  { valor: "semana", rotulo: "Semana" },
  { valor: "mes", rotulo: "Mês" },
];

/** Aba "Totais" (D51): por dia, semana (segunda a domingo) ou mês, da conta ou de um personagem. */
@Component({
  selector: "app-farm-totais",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BotaoComponent,
    CampoComponent,
    CampoControleDirective,
    ChipsFiltroComponent,
    ResumoComponent,
    VazioComponent,
    TabelasTotaisComponent,
  ],
  template: `
    <div class="controles">
      <ui-chips-filtro
        rotulo="Período"
        [opcoes]="modos"
        [selecionado]="modo()"
        (selecionadoChange)="mudarModo($event)"
      />
      <div class="navegar">
        <button
          uiBotao
          variante="fantasma"
          tamanho="p"
          (click)="deslocamento.set(deslocamento() - 1)"
          aria-label="Período anterior"
        >
          ‹
        </button>
        <strong class="periodo" data-testid="periodo-totais" aria-live="polite">{{
          intervalo().rotulo
        }}</strong>
        <button
          uiBotao
          variante="fantasma"
          tamanho="p"
          (click)="deslocamento.set(deslocamento() + 1)"
          [disabled]="deslocamento() >= 0"
          aria-label="Próximo período"
        >
          ›
        </button>
        @if (deslocamento() !== 0) {
          <button uiBotao variante="fantasma" tamanho="p" (click)="deslocamento.set(0)">Atual</button>
        }
      </div>
      <ui-campo class="personagem" rotulo="Personagem">
        <select uiCampo (change)="personagem.set(valor($event))">
          <option value="todos" [selected]="personagem() === 'todos'">Conta inteira</option>
          @for (p of farm.estado()?.personagens ?? []; track p.id) {
            <option [value]="p.id" [selected]="personagem() === p.id">{{ p.nome }}</option>
          }
        </select>
      </ui-campo>
      @if (carregando()) {
        <span class="dica" role="status">Carregando…</span>
      }
    </div>

    <div class="resumos">
      <ui-resumo
        rotulo="Zeny estimado"
        data-testid="total-zeny"
        [valor]="curto(totais().valor)"
        [meta]="completo(totais().valor) + ' z'"
      />
      <ui-resumo
        rotulo="Itens farmados"
        data-testid="total-itens"
        [valor]="completo(totais().itens)"
        [meta]="metaItens()"
      />
      <ui-resumo
        rotulo="Check-ins"
        [valor]="'' + totais().checkins"
        [meta]="totais().porInstancia.length + ' instâncias diferentes'"
      />
    </div>

    @if (filtrados().length === 0) {
      <ui-vazio
        [mensagem]="carregando() ? 'Carregando os check-ins do período…' : 'Nenhum check-in neste período.'"
      />
    } @else {
      <app-tabelas-totais [tabelas]="tabelas()" (remover)="remover($event)" />
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-4);
    }
    .controles {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--esp-2) var(--esp-4);
    }
    .navegar {
      display: inline-flex;
      align-items: center;
      gap: var(--esp-1);
    }
    .periodo {
      min-width: 140px;
      text-align: center;
      font-variant-numeric: tabular-nums;
      color: var(--texto-forte);
    }
    .personagem {
      min-width: 180px;
    }
    .dica {
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
    .resumos {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
      gap: var(--esp-3);
    }
  `,
})
export class TotaisAbaComponent {
  protected readonly farm = inject(FarmStore);
  private readonly acao = inject(Acao);
  private readonly confirmacao = inject(Confirmacao);

  protected readonly modos = MODOS;
  protected readonly modo = signal<ModoPeriodo>("semana");
  protected readonly deslocamento = signal(0);
  protected readonly personagem = signal("todos");
  protected readonly checkins = signal<CheckinFarm[]>([]);
  protected readonly carregando = signal(false);

  protected readonly intervalo = computed(() => periodo(this.modo(), this.farm.hoje(), this.deslocamento()));
  protected readonly filtrados = computed(() =>
    this.personagem() === "todos"
      ? this.checkins()
      : this.checkins().filter((c) => c.personagemId === this.personagem()),
  );
  protected readonly totais = computed(() => totaisDosCheckins(this.filtrados(), this.farm.precoDe));
  protected readonly metaItens = computed(() => {
    const sem = this.totais().itensSemPreco;
    return sem > 0 ? `${this.completo(sem)} sem preço, fora do valor` : "todos com preço";
  });

  /** As linhas das tabelas, já com os nomes e os valores formatados. */
  protected readonly tabelas = computed<TabelasTotais>(() => {
    const t = this.totais();
    const nomes = nomesDosCheckins(this.checkins());
    const itens = this.farm.itemPorId();
    const personagens = this.farm.personagemPorId();
    const instancias = new Map((this.farm.estado()?.instancias ?? []).map((i) => [i.id, i.nome]));
    const nomePersonagem = (id: string) => personagens.get(id)?.nome ?? "Personagem inativo";
    const nomeInstancia = (id: string) => instancias.get(id) ?? nomes.instancias.get(id) ?? "Instância";
    return {
      itens: t.porItem.map((l) => ({
        id: l.itemId,
        nome: itens.get(l.itemId)?.nome ?? nomes.itens.get(l.itemId) ?? "Item",
        idJogo: itens.get(l.itemId)?.idJogo ?? null,
        quantidade: this.completo(l.quantidade),
        preco: l.precoUnitario === null ? "sem preço" : this.curto(l.precoUnitario),
        subtotal: l.subtotal === null ? null : this.curto(l.subtotal),
      })),
      totalItens: this.completo(t.itens),
      totalValor: this.curto(t.valor),
      porInstancia: t.porInstancia.map((g) => ({
        id: g.id,
        nome: nomeInstancia(g.id),
        checkins: g.checkins,
        itens: this.completo(g.itens),
        valor: this.curto(g.valor),
      })),
      porPersonagem:
        this.personagem() === "todos" && t.porPersonagem.length > 1
          ? t.porPersonagem.map((g) => ({
              id: g.id,
              nome: nomePersonagem(g.id),
              checkins: g.checkins,
              itens: this.completo(g.itens),
              valor: this.curto(g.valor),
            }))
          : [],
      checkins: this.filtrados().map((c) => ({
        id: c.id,
        quando: quandoDoCheckin(c.feitoEm),
        personagem: nomePersonagem(c.personagemId),
        instancia: c.nomeInstancia,
        drops: textoDosDrops(c),
        valor: this.curto(this.farm.valorDe(c.drops)),
      })),
    };
  });

  constructor() {
    // Recarrega quando o período muda ou quando o estado muda (um check-in novo, por exemplo).
    effect(() => {
      const { inicioMs, fimMs } = this.intervalo();
      this.farm.estado();
      void this.carregar(inicioMs, fimMs);
    });
  }

  private versao = 0;
  private async carregar(de: number, ate: number): Promise<void> {
    const minha = ++this.versao;
    this.carregando.set(true);
    try {
      const lista = await this.farm.checkins(de, ate);
      if (minha === this.versao) this.checkins.set(lista);
    } catch (e) {
      if (minha === this.versao) this.acao.avisar(mensagemDeErro(e));
    } finally {
      if (minha === this.versao) this.carregando.set(false);
    }
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLSelectElement).value;
  }
  protected curto(v: number): string {
    return formatarZeny(v);
  }
  protected completo(v: number): string {
    return formatarZenyCompleto(v);
  }

  protected mudarModo(m: string): void {
    this.modo.set(m as ModoPeriodo);
    this.deslocamento.set(0);
  }

  protected async remover(id: string): Promise<void> {
    const c = this.checkins().find((x) => x.id === id);
    if (!c) return;
    const sim = await this.confirmacao.perguntar({
      titulo: `Remover o check-in de ${c.nomeInstancia}?`,
      descricao: `Feito ${quandoDoCheckin(c.feitoEm)}. Os drops dessa run saem dos totais e, se for o mais recente, a instância volta a ficar disponível.`,
      confirmar: "Remover check-in",
      perigo: true,
    });
    if (sim) await this.acao.executar(() => this.farm.desfazer(c.id), "Check-in removido.");
  }
}
