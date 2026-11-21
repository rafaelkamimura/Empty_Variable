import { Component, computed, effect, inject, signal } from "@angular/core";
import {
  type ModoPeriodo,
  DIAS_SEMANA,
  dataDoDia,
  diaDoJogo,
  diaMes,
  formatarZeny,
  formatarZenyCompleto,
  horaDoServidor,
  periodo,
  totalizar,
} from "@betel/farm";
import { Acao } from "../core/acao";
import { type CheckinFarm, FarmStore } from "../core/farm";
import { ImagemItemComponent } from "../shared/dominio/imagem-item.component";
import { mensagemDeErro } from "../core/modelos";

/** Totais do farm por dia, semana (segunda a domingo) ou mês, da conta inteira ou de um personagem. */
@Component({
  selector: "app-farm-totais",
  imports: [ImagemItemComponent],
  template: `
    <div class="controles">
      <div class="chips" role="group" aria-label="Período">
        @for (m of modos; track m.id) {
          <button type="button" class="chip" [attr.aria-pressed]="modo() === m.id" (click)="mudarModo(m.id)">
            {{ m.rotulo }}
          </button>
        }
      </div>
      <div class="navegar">
        <button
          type="button"
          class="botao pequeno"
          (click)="deslocamento.set(deslocamento() - 1)"
          aria-label="Período anterior"
        >
          ‹
        </button>
        <strong class="periodo" data-testid="periodo-totais">{{ intervalo().rotulo }}</strong>
        <button
          type="button"
          class="botao pequeno"
          (click)="deslocamento.set(deslocamento() + 1)"
          [disabled]="deslocamento() >= 0"
          aria-label="Próximo período"
        >
          ›
        </button>
        @if (deslocamento() !== 0) {
          <button type="button" class="botao pequeno fantasma" (click)="deslocamento.set(0)">Atual</button>
        }
      </div>
      <select aria-label="Personagem" (change)="personagem.set($any($event.target).value)">
        <option value="todos" [selected]="personagem() === 'todos'">Conta inteira</option>
        @for (p of farm.estado()?.personagens ?? []; track p.id) {
          <option [value]="p.id" [selected]="personagem() === p.id">{{ p.nome }}</option>
        }
      </select>
      @if (carregando()) {
        <span class="dica">Carregando…</span>
      }
    </div>

    <div class="grade-resumo">
      <div class="resumo">
        <span class="resumo-rotulo">Zeny estimado</span>
        <span class="resumo-numero z" data-testid="total-zeny" [title]="completo(totais().valor) + ' z'">{{
          curto(totais().valor)
        }}</span>
        <span class="resumo-meta">{{ completo(totais().valor) }} z</span>
      </div>
      <div class="resumo">
        <span class="resumo-rotulo">Itens farmados</span>
        <span class="resumo-numero" data-testid="total-itens">{{ completo(totais().itens) }}</span>
        <span class="resumo-meta">
          {{
            totais().itensSemPreco > 0
              ? completo(totais().itensSemPreco) + " sem preço, fora do valor"
              : "todos com preço"
          }}
        </span>
      </div>
      <div class="resumo">
        <span class="resumo-rotulo">Check-ins</span>
        <span class="resumo-numero">{{ totais().checkins }}</span>
        <span class="resumo-meta">{{ totais().porInstancia.length }} instâncias diferentes</span>
      </div>
    </div>

    @if (filtrados().length === 0) {
      <p class="dica">Nenhum check-in neste período.</p>
    } @else {
      <section class="secao">
        <h2>Itens</h2>
        <div class="tabela-farm">
          <table>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col" class="dir">Qtd</th>
                <th scope="col" class="dir">Preço un.</th>
                <th scope="col" class="dir">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              @for (l of totais().porItem; track l.itemId) {
                <tr>
                  <td class="quebra">
                    <span class="item-nome">
                      <app-imagem-item
                        [idJogo]="idJogo(l.itemId)"
                        [nome]="nomeItem(l.itemId)"
                        [tamanho]="20"
                      />
                      {{ nomeItem(l.itemId) }}
                    </span>
                  </td>
                  <td class="dir">{{ completo(l.quantidade) }}</td>
                  <td class="dir dica">
                    {{ l.precoUnitario === null ? "sem preço" : curto(l.precoUnitario) }}
                  </td>
                  <td class="dir" [class.z]="l.subtotal !== null">
                    {{ l.subtotal === null ? "—" : curto(l.subtotal) }}
                  </td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td class="dir">{{ completo(totais().itens) }}</td>
                <td></td>
                <td class="dir z">{{ curto(totais().valor) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section class="secao">
        <h2>Por instância</h2>
        <div class="tabela-farm">
          <table>
            <thead>
              <tr>
                <th scope="col">Instância</th>
                <th scope="col" class="dir">Check-ins</th>
                <th scope="col" class="dir">Itens</th>
                <th scope="col" class="dir">Valor</th>
              </tr>
            </thead>
            <tbody>
              @for (g of totais().porInstancia; track g.id) {
                <tr>
                  <td class="quebra">{{ nomeInstancia(g.id) }}</td>
                  <td class="dir">{{ g.checkins }}</td>
                  <td class="dir">{{ completo(g.itens) }}</td>
                  <td class="dir z">{{ curto(g.valor) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      @if (personagem() === "todos" && totais().porPersonagem.length > 1) {
        <section class="secao">
          <h2>Por personagem</h2>
          <div class="tabela-farm">
            <table>
              <thead>
                <tr>
                  <th scope="col">Personagem</th>
                  <th scope="col" class="dir">Check-ins</th>
                  <th scope="col" class="dir">Valor</th>
                </tr>
              </thead>
              <tbody>
                @for (g of totais().porPersonagem; track g.id) {
                  <tr>
                    <td class="quebra">{{ nomePersonagem(g.id) }}</td>
                    <td class="dir">{{ g.checkins }}</td>
                    <td class="dir z">{{ curto(g.valor) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      <section class="secao">
        <h2>Check-ins do período</h2>
        <div class="tabela-farm">
          <table>
            <thead>
              <tr>
                <th scope="col">Quando</th>
                <th scope="col">Personagem</th>
                <th scope="col">Instância</th>
                <th scope="col">Drops</th>
                <th scope="col" class="dir">Valor</th>
                <th scope="col"><span class="sr">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              @for (c of filtrados(); track c.id) {
                <tr>
                  <td>{{ quando(c.feitoEm) }}</td>
                  <td>{{ nomePersonagem(c.personagemId) }}</td>
                  <td>{{ c.nomeInstancia }}</td>
                  <td class="quebra dica">{{ textoDrops(c) }}</td>
                  <td class="dir z">{{ curto(farm.valorDe(c.drops)) }}</td>
                  <td class="dir">
                    <button
                      type="button"
                      class="botao pequeno perigo"
                      [class.armado]="armado() === c.id"
                      (click)="remover(c)"
                    >
                      {{ armado() === c.id ? "Confirmar" : "Remover" }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .controles {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px 16px;
    }
    .controles select {
      width: auto;
    }
    .navegar {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .periodo {
      min-width: 140px;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
    h2 {
      margin: 0;
      font-size: 18px;
    }
    .sr {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
  `,
})
export class FarmTotaisComponent {
  readonly farm = inject(FarmStore);
  private readonly acao = inject(Acao);

  readonly modos: { id: ModoPeriodo; rotulo: string }[] = [
    { id: "dia", rotulo: "Dia" },
    { id: "semana", rotulo: "Semana" },
    { id: "mes", rotulo: "Mês" },
  ];
  readonly modo = signal<ModoPeriodo>("semana");
  readonly deslocamento = signal(0);
  readonly personagem = signal("todos");
  readonly checkins = signal<CheckinFarm[]>([]);
  readonly carregando = signal(false);
  readonly armado = signal<string | null>(null);

  readonly intervalo = computed(() => periodo(this.modo(), this.farm.hoje(), this.deslocamento()));
  readonly filtrados = computed(() =>
    this.personagem() === "todos"
      ? this.checkins()
      : this.checkins().filter((c) => c.personagemId === this.personagem()),
  );
  readonly totais = computed(() =>
    totalizar(
      this.filtrados().map((c) => ({
        personagemId: c.personagemId,
        instanciaId: c.farmInstanciaId,
        drops: c.drops.map((d) => ({ itemId: d.farmItemId, quantidade: d.quantidade })),
      })),
      this.farm.precoDe,
    ),
  );
  /** Nomes que aparecem nos check-ins (itens e instâncias excluídos ou desativados continuam com nome). */
  private readonly nomes = computed(() => {
    const itens = new Map<string, string>();
    const instancias = new Map<string, string>();
    for (const c of this.checkins()) {
      instancias.set(c.farmInstanciaId, c.nomeInstancia);
      for (const d of c.drops) itens.set(d.farmItemId, d.nome);
    }
    return { itens, instancias };
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

  mudarModo(m: ModoPeriodo): void {
    this.modo.set(m);
    this.deslocamento.set(0);
  }

  curto(v: number): string {
    return formatarZeny(v);
  }
  completo(v: number): string {
    return formatarZenyCompleto(v);
  }
  quando(iso: string): string {
    const ms = Date.parse(iso);
    const d = diaDoJogo(ms);
    return `${DIAS_SEMANA[dataDoDia(d).diaSemana]} ${diaMes(d)} ${horaDoServidor(ms)}`;
  }
  idJogo(itemId: string): number | null {
    return this.farm.itemPorId().get(itemId)?.idJogo ?? null;
  }
  nomeItem(itemId: string): string {
    return this.farm.itemPorId().get(itemId)?.nome ?? this.nomes().itens.get(itemId) ?? "Item";
  }
  nomeInstancia(id: string): string {
    return (
      this.farm.estado()?.instancias.find((i) => i.id === id)?.nome ??
      this.nomes().instancias.get(id) ??
      "Instância"
    );
  }
  nomePersonagem(id: string): string {
    return this.farm.personagemPorId().get(id)?.nome ?? "Personagem inativo";
  }
  textoDrops(c: CheckinFarm): string {
    return c.drops.length > 0 ? c.drops.map((d) => `${d.nome} ×${d.quantidade}`).join(" · ") : "Sem drops";
  }

  async remover(c: CheckinFarm): Promise<void> {
    if (this.armado() !== c.id) {
      this.armado.set(c.id);
      return;
    }
    this.armado.set(null);
    await this.acao.executar(() => this.farm.desfazer(c.id), "Check-in removido.");
  }
}
