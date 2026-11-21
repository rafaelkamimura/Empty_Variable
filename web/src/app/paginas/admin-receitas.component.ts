import { HttpClient } from "@angular/common/http";
import { Component, computed, inject, type OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { firstValueFrom } from "rxjs";
import { Acao } from "../core/acao";
import type { ItemCatalogo } from "../core/cadastros";
import type { Receita } from "../features/nebula/data/nebula.modelos";
import {
  type ComponenteEditavel,
  pendenciasComponentes,
  situacaoReceita,
} from "../features/nebula/data/receitas.modelos";
import { ComoFuncionaComponent } from "../shared/ui/como-funciona/como-funciona.component";
import { TabelaDirective } from "../shared/ui/tabela/tabela.directive";

/**
 * US-16 (T-42): receitas da Nebula. As da fonte entram "a validar": o admin confere com o jogo,
 * ajusta os componentes se preciso, define os dois preços (D32) e ativa. Limite opcional (D35).
 */
@Component({
  selector: "app-admin-receitas",
  imports: [
    ComoFuncionaComponent,
    TabelaDirective,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="pagina">
      <div class="cabecalho">
        <div>
          <h1>Receitas da Nebula</h1>
          <p>O que cada Nebulosa precisa, quanto custa em pontos e se está aberta aos membros.</p>
        </div>
      </div>

      <ui-como-funciona>
        <p>
          As receitas vieram da browiki e entram "a validar". Confira cada uma no jogo, ajuste se preciso,
          defina os dois preços (com a peça Astral do estoque e trazendo a própria) e ative.
        </p>
        <p>
          Só as Nebulosas ativas e com preço aparecem para os membros. A disponibilidade considera só o
          estoque do grupo, incluindo a reserva.
        </p>
      </ui-como-funciona>

      <div class="chips" role="group" aria-label="Tipo de receita">
        <button
          type="button"
          class="chip"
          [attr.aria-pressed]="aba() === 'nebulosas'"
          (click)="aba.set('nebulosas')"
        >
          Nebulosas ({{ contagem().nebulosas }})
        </button>
        <button type="button" class="chip" [attr.aria-pressed]="aba() === 'pecas'" (click)="aba.set('pecas')">
          Peças Astrais ({{ contagem().pecas }})
        </button>
        <button
          type="button"
          class="chip"
          [attr.aria-pressed]="soAValidar()"
          (click)="soAValidar.set(!soAValidar())"
        >
          Só a validar
        </button>
      </div>

      @for (r of visiveis(); track r.id) {
        <mat-card class="receita" [attr.data-receita]="r.nome">
          <mat-card-header>
            <mat-card-title>
              {{ r.nome }}
              <span class="selo" [class]="'selo selo-' + situacao(r).tipo">{{ situacao(r).texto }}</span>
              @if (!r.solicitavel) {
                <span class="selo">Peça-base (não solicitável)</span>
              }
            </mat-card-title>
            @if (r.fonte) {
              <mat-card-subtitle>Fonte: {{ r.fonte }}</mat-card-subtitle>
            }
          </mat-card-header>
          <mat-card-content>
            @if (editando() === r.id) {
              <div class="editor" data-testid="editor-componentes">
                @for (c of rascunho; track $index; let i = $index) {
                  <div class="linha-acoes">
                    <mat-form-field subscriptSizing="dynamic">
                      <mat-label>Item</mat-label>
                      <mat-select [(ngModel)]="c.itemId" [name]="'item' + i">
                        @for (it of itens(); track it.id) {
                          <mat-option [value]="it.id">{{ it.nome }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field subscriptSizing="dynamic" class="estreito">
                      <mat-label>Quantidade</mat-label>
                      <input
                        matInput
                        type="number"
                        min="1"
                        step="1"
                        [(ngModel)]="c.quantidade"
                        [name]="'qtd' + i"
                      />
                    </mat-form-field>
                    <mat-checkbox [(ngModel)]="c.pecaBase" [name]="'peca' + i">Peça-base</mat-checkbox>
                    <button mat-button type="button" (click)="rascunho.splice(i, 1)">Remover</button>
                  </div>
                }
                <button
                  mat-stroked-button
                  type="button"
                  (click)="rascunho.push({ itemId: '', quantidade: 1, pecaBase: false })"
                >
                  Adicionar componente
                </button>
                @if (temPeca()) {
                  <mat-form-field subscriptSizing="dynamic" class="campo-largo">
                    <mat-label
                      >Receita da peça-base (para usar os materiais quando não houver a peça
                      pronta)</mat-label
                    >
                    <mat-select [(ngModel)]="receitaPecaId" name="receitaPeca">
                      <mat-option [value]="null">— nenhuma —</mat-option>
                      @for (rp of receitasDaPeca(); track rp.id) {
                        <mat-option [value]="rp.id">{{ rp.nome }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                }
                @for (p of pendencias(); track p) {
                  <p class="pendencia">{{ p }}</p>
                }
                <div class="linha-acoes">
                  <button
                    mat-flat-button
                    type="button"
                    (click)="salvarComponentes(r)"
                    [disabled]="pendencias().length > 0"
                  >
                    Salvar componentes
                  </button>
                  <button mat-button type="button" (click)="editando.set(null)">Cancelar</button>
                </div>
              </div>
            } @else {
              <table uiTabela class="tabela">
                <thead>
                  <tr>
                    <th scope="col">Componente</th>
                    <th scope="col">Qtd.</th>
                    <th scope="col">No estoque do grupo</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of r.componentes; track c.id) {
                    <tr>
                      <td>
                        {{ c.item.nome }}
                        @if (c.pecaBase) {
                          <span class="texto-secundario"
                            >(peça-base{{ r.receitaPeca ? ", receita: " + r.receitaPeca.nome : "" }})</span
                          >
                        }
                      </td>
                      <td>{{ c.quantidade }}</td>
                      <td>{{ tenho(r, c.item.id) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }

            @if (r.solicitavel) {
              <p class="disponivel" data-testid="disponibilidade">
                Disponível agora: <strong>{{ r.disponibilidade.trazendoPeca }}</strong> trazendo a peça ·
                <strong>{{ r.disponibilidade.comPecaDoEstoque }}</strong> com a peça do estoque
              </p>
              <div class="linha-acoes">
                <span>
                  Preço:
                  @if (r.precoVigente; as p) {
                    <strong>{{ p.precoComPeca }}</strong> pts com a peça do estoque ·
                    <strong>{{ p.precoTrazendoPeca }}</strong> pts trazendo (v{{ p.versao }})
                  } @else {
                    <span class="alerta">sem preço</span>
                  }
                </span>
              </div>
              <form class="linha-acoes" (ngSubmit)="definirPreco(r)">
                <mat-form-field subscriptSizing="dynamic" class="estreito">
                  <mat-label>Com a peça</mat-label>
                  <input
                    matInput
                    type="number"
                    min="1"
                    step="1"
                    [(ngModel)]="precos[r.id + ':com']"
                    [name]="'com' + r.id"
                  />
                </mat-form-field>
                <mat-form-field subscriptSizing="dynamic" class="estreito">
                  <mat-label>Trazendo a peça</mat-label>
                  <input
                    matInput
                    type="number"
                    min="1"
                    step="1"
                    [(ngModel)]="precos[r.id + ':traz']"
                    [name]="'traz' + r.id"
                  />
                </mat-form-field>
                <button
                  mat-stroked-button
                  type="submit"
                  [disabled]="!precos[r.id + ':com'] || !precos[r.id + ':traz']"
                >
                  Nova versão de preço
                </button>
              </form>
              <p class="texto-secundario">
                Limite:
                {{
                  r.limitePorMembro === null
                    ? "sem limite"
                    : r.limitePorMembro + " a cada " + r.limitePeriodoDias + " dias"
                }}
                @if (r.solicitacoesPendentes > 0) {
                  · {{ r.solicitacoesPendentes }} solicitação(ões) pendente(s)
                }
              </p>
            }

            @if (editando() !== r.id) {
              <div class="linha-acoes">
                @if (r.solicitavel) {
                  <button mat-flat-button type="button" (click)="alternarAtiva(r)">
                    {{ r.ativa ? "Desativar" : "Validei, ativar" }}
                  </button>
                  <button mat-button type="button" (click)="definirLimite(r)">Limite</button>
                }
                <button mat-button type="button" (click)="editar(r)" [disabled]="r.solicitacoesPendentes > 0">
                  Editar componentes
                </button>
              </div>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: `
    .receita mat-card-title {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .selo {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      border: 1px solid var(--borda-forte);
      font-size: 12px;
      font-weight: 600;
      color: var(--texto-suave);
    }
    .selo-ativa {
      border-color: var(--acento);
      color: var(--acento-forte);
    }
    .selo-validar,
    .selo-sem-preco {
      border-color: var(--alerta);
      color: var(--alerta);
    }
    .tabela {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
    }
    .tabela th,
    .tabela td {
      text-align: left;
      padding: 6px 8px;
      border-bottom: 1px solid var(--borda);
    }
    .estreito {
      width: 160px;
    }
    .editor {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 8px 0;
    }
    .disponivel {
      margin: 8px 0 4px;
    }
    .alerta {
      color: var(--alerta);
    }
    .pendencia {
      margin: 0;
      font-size: 13px;
      color: var(--alerta);
    }
  `,
})
export class AdminReceitasComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly acao = inject(Acao);

  readonly receitas = signal<Receita[]>([]);
  /** paineis §5: as Nebulosas (solicitáveis) e as peças Astrais (só ingrediente) em visões separadas. */
  readonly aba = signal<"nebulosas" | "pecas">("nebulosas");
  readonly soAValidar = signal(false);
  readonly contagem = computed(() => ({
    nebulosas: this.receitas().filter((r) => r.solicitavel).length,
    pecas: this.receitas().filter((r) => !r.solicitavel).length,
  }));
  readonly visiveis = computed(() =>
    this.receitas().filter(
      (r) => r.solicitavel === (this.aba() === "nebulosas") && (!this.soAValidar() || !r.ativa),
    ),
  );
  readonly itens = signal<ItemCatalogo[]>([]);
  readonly editando = signal<string | null>(null);
  rascunho: ComponenteEditavel[] = [];
  receitaPecaId: string | null = null;
  precos: Record<string, number | null> = {};

  /** Recalculado a cada detecção de mudanças: o rascunho é editado via ngModel, fora dos sinais. */
  pendencias(): string[] {
    return pendenciasComponentes(this.rascunho);
  }

  async ngOnInit(): Promise<void> {
    await this.recarregar();
  }

  async recarregar(): Promise<void> {
    try {
      const [receitas, itens] = await Promise.all([
        firstValueFrom(this.http.get<Receita[]>("/api/receitas")),
        firstValueFrom(this.http.get<ItemCatalogo[]>("/api/itens")),
      ]);
      this.receitas.set(receitas);
      this.itens.set(itens);
    } catch {
      this.acao.avisar("Não foi possível carregar as receitas.");
    }
  }

  situacao(r: Receita) {
    return situacaoReceita(r);
  }

  tenho(r: Receita, itemId: string): number {
    return (
      [...r.disponibilidade.faltasComPeca, ...r.disponibilidade.faltasTrazendo].find(
        (f) => f.itemId === itemId,
      )?.tenho ?? 0
    );
  }

  temPeca(): boolean {
    return this.rascunho.some((c) => c.pecaBase);
  }

  /** Receitas que produzem o item marcado como peça-base. */
  receitasDaPeca(): Receita[] {
    const peca = this.rascunho.find((c) => c.pecaBase)?.itemId;
    return this.receitas().filter((r) => r.itemProduzido.id === peca);
  }

  editar(r: Receita): void {
    this.rascunho = r.componentes.map((c) => ({
      itemId: c.item.id,
      quantidade: c.quantidade,
      pecaBase: c.pecaBase,
    }));
    this.receitaPecaId = r.receitaPeca?.id ?? null;
    this.editando.set(r.id);
  }

  async salvarComponentes(r: Receita): Promise<void> {
    if (this.pendencias().length > 0) return;
    const ok = await this.acao.executar(
      () =>
        firstValueFrom(
          this.http.put(`/api/receitas/${r.id}/componentes`, {
            componentes: this.rascunho,
            receitaPecaId: this.temPeca() ? this.receitaPecaId : null,
          }),
        ),
      "Componentes atualizados.",
    );
    if (ok) this.editando.set(null);
    await this.recarregar();
  }

  async definirPreco(r: Receita): Promise<void> {
    const com = this.precos[r.id + ":com"];
    const traz = this.precos[r.id + ":traz"];
    const ok = await this.acao.executar(
      () =>
        firstValueFrom(
          this.http.post(`/api/receitas/${r.id}/precos`, { precoComPeca: com, precoTrazendoPeca: traz }),
        ),
      "Nova versão de preço criada.",
    );
    if (ok) {
      this.precos[r.id + ":com"] = null;
      this.precos[r.id + ":traz"] = null;
    }
    await this.recarregar();
  }

  async alternarAtiva(r: Receita): Promise<void> {
    if (!r.ativa && !window.confirm(`Confirma que a receita de ${r.nome} foi conferida no jogo?`)) return;
    await this.acao.executar(
      () => firstValueFrom(this.http.patch(`/api/receitas/${r.id}`, { ativa: !r.ativa })),
      r.ativa ? "Receita desativada." : "Receita ativada.",
    );
    await this.recarregar();
  }

  /** D35: "1/30" = no máximo 1 por membro a cada 30 dias; vazio remove. */
  async definirLimite(r: Receita): Promise<void> {
    const atual = r.limitePorMembro === null ? "" : `${r.limitePorMembro}/${r.limitePeriodoDias}`;
    const v = window.prompt(
      `Limite de ${r.nome} no formato quantidade/dias (ex.: 1/30). Vazio remove:`,
      atual,
    );
    if (v === null) return;
    const corpo =
      v.trim() === ""
        ? { limitePorMembro: null, limitePeriodoDias: null }
        : (() => {
            const [q, d] = v.split("/").map((x) => Number(x.trim()));
            return { limitePorMembro: q ?? Number.NaN, limitePeriodoDias: d ?? Number.NaN };
          })();
    await this.acao.executar(
      () => firstValueFrom(this.http.patch(`/api/receitas/${r.id}`, corpo)),
      "Limite atualizado.",
    );
    await this.recarregar();
  }
}
