import { DatePipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, computed, inject, type OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatTabsModule } from "@angular/material/tabs";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTableModule } from "@angular/material/table";
import { firstValueFrom } from "rxjs";
import { Acao } from "../core/acao";
import type { ItemCatalogo } from "../core/cadastros";
import {
  descreverLote,
  type LoteEstoque,
  type MovimentoEstoque,
  origemMovimento,
  type OrigemEstoque,
  ROTULO_MOVIMENTO,
  type ResumoItemEstoque,
  type TipoMovimento,
} from "../core/estoque";
import { ComoFuncionaComponent } from "../shared/ui/como-funciona/como-funciona.component";
import { PainelLateralComponent } from "../shared/ui/painel-lateral/painel-lateral.component";
import { TabelaDirective } from "../shared/ui/tabela/tabela.directive";
import { ImagemItemComponent } from "../shared/dominio/imagem-item.component";

/**
 * US-09 / T-29: estoque do grupo. Entradas, ajustes com motivo e histórico de movimentos.
 * paineis §5: abas Resumo e Movimentos; entrada e ajuste abrem no painel lateral.
 */
@Component({
  selector: "app-admin-estoque",
  imports: [
    ImagemItemComponent,
    TabelaDirective,
    FormsModule,
    DatePipe,
    MatTabsModule,
    ComoFuncionaComponent,
    PainelLateralComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
  ],
  template: `
    <div class="pagina">
      <div class="cabecalho">
        <div>
          <h1>Estoque</h1>
          <p>Itens com o guardião do grupo e os consignados por jogadores.</p>
        </div>
        <div class="cabecalho-acoes">
          <button type="button" class="botao-acao" (click)="painel.set('entrada')">Nova entrada</button>
          <button mat-stroked-button type="button" (click)="painel.set('ajuste')">Ajuste</button>
        </div>
      </div>

      <ui-como-funciona>
        <p>Disponível na loja = grupo − reserva para a Nebula + consignado.</p>
        <p>
          Cada entrada cria um lote, e as vendas saem dos lotes por ordem de chegada. Os movimentos nunca são
          editados nem apagados: um erro se corrige com um ajuste, que exige motivo.
        </p>
      </ui-como-funciona>

      <mat-tab-group animationDuration="0ms">
        <mat-tab label="Resumo">
          <table uiTabela mat-table [dataSource]="resumo()" data-testid="resumo-estoque">
            <ng-container matColumnDef="nome">
              <th mat-header-cell *matHeaderCellDef>Item</th>
              <td mat-cell *matCellDef="let r">
                <span class="com-imagem">
                  <app-imagem-item [idJogo]="r.idJogo" [nome]="r.nome" [tamanho]="24" />
                  {{ r.nome }}
                </span>
                @if (r.motivoInelegivel) {
                  <div class="bloqueado">{{ r.motivoInelegivel }}</div>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="grupo">
              <th mat-header-cell *matHeaderCellDef>Grupo</th>
              <td mat-cell *matCellDef="let r">{{ r.grupo }}</td>
            </ng-container>
            <ng-container matColumnDef="reserva">
              <th mat-header-cell *matHeaderCellDef>Reserva</th>
              <td mat-cell *matCellDef="let r">{{ r.reservaMinima }}</td>
            </ng-container>
            <ng-container matColumnDef="consignado">
              <th mat-header-cell *matHeaderCellDef>Consignado</th>
              <td mat-cell *matCellDef="let r">{{ r.consignado }}</td>
            </ng-container>
            <ng-container matColumnDef="disponivel">
              <th mat-header-cell *matHeaderCellDef>Disponível</th>
              <td mat-cell *matCellDef="let r">
                <strong>{{ r.disponivel }}</strong>
              </td>
            </ng-container>
            <ng-container matColumnDef="precoVenda">
              <th mat-header-cell *matHeaderCellDef>Preço de venda</th>
              <td mat-cell *matCellDef="let r">
                <button mat-button type="button" (click)="abrirPreco(r)">
                  {{ r.precoVigente === null ? "Definir preço" : r.precoVigente + " pts · Editar" }}
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="colunasResumo"></tr>
            <tr mat-row *matRowDef="let row; columns: colunasResumo"></tr>
          </table>
          @if (resumo().length === 0) {
            <p class="texto-secundario">Nenhum item no estoque ainda.</p>
          }
        </mat-tab>
        <mat-tab label="Movimentos">
          <div class="linha-acoes filtros">
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>Item</mat-label>
              <mat-select
                [(ngModel)]="filtro.itemId"
                (ngModelChange)="carregarMovimentos()"
                name="filtroItem"
              >
                <mat-option [value]="''">Todos</mat-option>
                @for (r of resumo(); track r.itemId) {
                  <mat-option [value]="r.itemId">{{ r.nome }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>Tipo</mat-label>
              <mat-select [(ngModel)]="filtro.tipo" (ngModelChange)="carregarMovimentos()" name="filtroTipo">
                <mat-option [value]="''">Todos</mat-option>
                @for (t of tipos; track t) {
                  <mat-option [value]="t">{{ rotuloMovimento[t] }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
          <table uiTabela class="tabela" data-testid="movimentos">
            <thead>
              <tr>
                <th scope="col">Quando</th>
                <th scope="col">Item</th>
                <th scope="col">Lote</th>
                <th scope="col">Tipo</th>
                <th scope="col">Qtd.</th>
                <th scope="col">Valor unitário</th>
                <th scope="col">Origem / motivo</th>
                <th scope="col">Por</th>
              </tr>
            </thead>
            <tbody>
              @for (m of movimentos(); track m.id) {
                <tr>
                  <td>{{ m.criadoEm | date: "dd/MM/yyyy HH:mm" }}</td>
                  <td>{{ m.lote.item.nome }}</td>
                  <td>{{ lote(m.lote) }}</td>
                  <td>{{ rotuloMovimento[m.tipo] }}</td>
                  <td [class.negativo]="m.quantidade < 0">
                    {{ m.quantidade > 0 ? "+" : "" }}{{ m.quantidade }}
                  </td>
                  <td>{{ m.valorUnitarioPontos == null ? "—" : m.valorUnitarioPontos + " pts" }}</td>
                  <td>{{ origem(m) }}</td>
                  <td>{{ m.criadoPor.discordUsername }}</td>
                </tr>
              }
            </tbody>
          </table>
          @if (movimentos().length === 0) {
            <p class="texto-secundario">Nenhum movimento.</p>
          }
        </mat-tab>
      </mat-tab-group>

      <ui-painel-lateral titulo="Nova entrada" [aberto]="painel() === 'entrada'" (fechar)="painel.set(null)">
        @if (entrada.origem && itensDaOrigem().length === 0) {
          <p class="texto-secundario">
            Nenhum item novo disponível para esta origem. Para aumentar um lote existente, use Ajuste.
          </p>
        }
        <form class="formulario" (ngSubmit)="darEntrada()">
          <mat-form-field>
            <mat-label>Instância</mat-label>
            <mat-select
              [ngModel]="entrada.origem"
              (ngModelChange)="trocarOrigem($event)"
              name="entradaOrigem"
            >
              <mat-option value="DROP_SOLTO">Drop Solto</mat-option>
              @for (instancia of origens(); track instancia.id) {
                <mat-option [value]="instancia.id">{{ instancia.nome }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Item</mat-label>
            <mat-select
              [(ngModel)]="entrada.itemId"
              name="entradaItem"
              [disabled]="!entrada.origem || itensDaOrigem().length === 0"
            >
              @for (i of itensDaOrigem(); track i.id) {
                <mat-option [value]="i.id">
                  <span class="com-imagem">
                    <app-imagem-item [idJogo]="i.idJogo" [nome]="i.nome" [tipo]="i.tipo" [tamanho]="22" />
                    {{ i.nome }}
                  </span>
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
          @if (itemSelecionado(); as item) {
            @if (item.motivoInelegivel; as motivo) {
              <div class="conferencia-item">
                <p>{{ motivo }}</p>
                @if (item.negociavel !== false && item.vinculadoConta !== true) {
                  <button
                    mat-stroked-button
                    type="button"
                    [disabled]="conferindo()"
                    (click)="confirmarItem(item)"
                  >
                    Confirmar: item negociável e sem vínculo à conta
                  </button>
                }
              </div>
            }
          }
          <mat-form-field>
            <mat-label>Quantidade</mat-label>
            <input
              matInput
              type="number"
              min="1"
              step="1"
              [(ngModel)]="entrada.quantidade"
              name="entradaQtd"
              [disabled]="!itemLiberado()"
              max="1000000"
            />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Preço de venda por unidade (pts)</mat-label>
            <input
              matInput
              type="number"
              min="1"
              max="1000000000"
              step="1"
              [(ngModel)]="entrada.precoPontos"
              name="entradaPreco"
              [disabled]="!itemLiberado()"
            />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Observação (opcional)</mat-label>
            <input matInput [(ngModel)]="entrada.motivo" name="entradaMotivo" maxlength="300" />
          </mat-form-field>
          <button mat-flat-button type="submit" [disabled]="!entradaValida() || registrando()">
            Registrar entrada
          </button>
        </form>
      </ui-painel-lateral>

      <ui-painel-lateral titulo="Preço de venda" [aberto]="painel() === 'preco'" (fechar)="painel.set(null)">
        @if (itemPreco(); as item) {
          <form class="formulario" (ngSubmit)="salvarPreco(item.itemId)">
            <p>{{ item.nome }}</p>
            @if (item.ultimoValorUnitarioPontos != null) {
              <p>Valor unitário da última entrada: {{ item.ultimoValorUnitarioPontos }} pts</p>
            }
            <mat-form-field>
              <mat-label>Preço por unidade (pts)</mat-label>
              <input
                matInput
                type="number"
                min="1"
                max="1000000000"
                step="1"
                [(ngModel)]="precoVenda"
                name="precoVenda"
              />
            </mat-form-field>
            <button mat-flat-button type="submit" [disabled]="!precoValido() || salvandoPreco()">
              Salvar preço
            </button>
          </form>
        }
      </ui-painel-lateral>

      <ui-painel-lateral titulo="Ajuste de lote" [aberto]="painel() === 'ajuste'" (fechar)="painel.set(null)">
        <p class="texto-secundario">Adicione ou retire unidades de um lote. O motivo fica no histórico.</p>
        <form class="formulario" (ngSubmit)="ajustar()">
          <mat-form-field>
            <mat-label>Lote</mat-label>
            <mat-select [(ngModel)]="ajuste.loteId" name="ajusteLote">
              @for (l of lotesComSaldo(); track l.id) {
                <mat-option [value]="l.id"
                  >{{ l.item.nome }} · {{ lote(l) }} · {{ l.quantidade }} un.</mat-option
                >
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Operação</mat-label>
            <mat-select [(ngModel)]="ajuste.operacao" name="operacao">
              <mat-option value="adicionar">Adicionar unidades</mat-option>
              <mat-option value="retirar">Retirar unidades</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>Quantidade do ajuste</mat-label>
            <input
              matInput
              type="number"
              min="1"
              max="1000000"
              step="1"
              [(ngModel)]="ajuste.quantidade"
              name="ajusteQtd"
            />
          </mat-form-field>
          @if (loteDoAjuste(); as lote) {
            @if (saldoAposAjuste() < 0) {
              <p class="bloqueado" role="alert">
                O lote tem {{ lote.quantidade }} un. disponíveis para retirada.
              </p>
            } @else {
              <p>Saldo do lote após o ajuste: {{ saldoAposAjuste() }} un.</p>
            }
          }
          <mat-form-field>
            <mat-label>Motivo</mat-label>
            <input matInput [(ngModel)]="ajuste.motivo" name="ajusteMotivo" maxlength="300" required />
          </mat-form-field>
          <button mat-flat-button type="submit" [disabled]="!ajusteValido() || ajustando()">
            Registrar ajuste
          </button>
        </form>
      </ui-painel-lateral>
    </div>
  `,
  styles: `
    .filtros {
      padding-top: 14px;
    }
    table[data-testid="resumo-estoque"] {
      margin-top: 8px;
    }
    .formulario {
      display: flex;
      flex-direction: column;
    }
    .conferencia-item {
      margin-bottom: 16px;
      padding: 12px;
      border: 1px solid var(--borda-forte);
      border-radius: 10px;
    }
    .conferencia-item p {
      margin: 0 0 8px;
    }
    .conferencia-item button {
      white-space: normal;
      height: auto;
      min-height: 40px;
    }
    .bloqueado {
      color: var(--mat-sys-error, #b3261e);
      font-size: 12px;
    }
    .tabela {
      border-collapse: collapse;
      width: 100%;
    }
    .tabela th,
    .tabela td {
      text-align: left;
      padding: 4px 8px;
      border-bottom: 1px solid var(--borda);
    }
    .negativo {
      color: var(--mat-sys-error, #b3261e);
    }
  `,
})
export class AdminEstoqueComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly acao = inject(Acao);

  readonly resumo = signal<ResumoItemEstoque[]>([]);
  readonly origens = signal<OrigemEstoque[]>([]);
  readonly registrando = signal(false);
  readonly conferindo = signal(false);
  readonly ajustando = signal(false);
  readonly itens = signal<ItemCatalogo[]>([]);
  readonly lotes = signal<LoteEstoque[]>([]);
  readonly movimentos = signal<MovimentoEstoque[]>([]);
  readonly elegiveis = computed(() => this.itens().filter((i) => i.motivoInelegivel === null));
  readonly lotesComSaldo = computed(() => this.lotes().filter((l) => l.ativo));
  readonly colunasResumo = ["nome", "grupo", "reserva", "consignado", "disponivel", "precoVenda"];
  readonly tipos: TipoMovimento[] = ["ENTRADA", "VENDA", "DEVOLUCAO", "RETIRADA", "AJUSTE"];
  readonly rotuloMovimento = ROTULO_MOVIMENTO;

  /** Formulário aberto no painel lateral. */
  readonly painel = signal<"entrada" | "ajuste" | "preco" | null>(null);
  readonly itemPreco = signal<ResumoItemEstoque | null>(null);
  readonly salvandoPreco = signal(false);
  precoVenda: number | null = null;
  entrada = { origem: "", itemId: "", quantidade: 1, motivo: "", precoPontos: null as number | null };
  ajuste = { loteId: "", operacao: "adicionar", quantidade: 1, motivo: "" };
  filtro = { itemId: "", tipo: "" };

  async ngOnInit(): Promise<void> {
    await this.recarregar();
  }

  lote(l: Parameters<typeof descreverLote>[0]): string {
    return descreverLote(l);
  }
  origem(m: MovimentoEstoque): string {
    return origemMovimento(m);
  }

  async recarregar(): Promise<void> {
    try {
      const [resumo, itens, lotes, origens] = await Promise.all([
        firstValueFrom(this.http.get<ResumoItemEstoque[]>("/api/estoque")),
        firstValueFrom(this.http.get<ItemCatalogo[]>("/api/itens")),
        firstValueFrom(this.http.get<LoteEstoque[]>("/api/estoque/lotes")),
        firstValueFrom(this.http.get<OrigemEstoque[]>("/api/estoque/origens")),
      ]);
      this.resumo.set(resumo);
      this.itens.set(itens);
      this.lotes.set(lotes);
      this.origens.set(origens);
      await this.carregarMovimentos();
    } catch {
      this.acao.avisar("Não foi possível carregar o estoque.");
    }
  }

  async carregarMovimentos(): Promise<void> {
    const params = Object.fromEntries(Object.entries(this.filtro).filter(([, v]) => v !== ""));
    try {
      this.movimentos.set(
        await firstValueFrom(this.http.get<MovimentoEstoque[]>("/api/estoque/movimentos", { params })),
      );
    } catch {
      this.acao.avisar("Não foi possível carregar os movimentos.");
    }
  }

  itensDaOrigem(): ItemCatalogo[] {
    const estocados = new Set(this.lotesComSaldo().map((lote) => lote.item.id));
    if (this.entrada.origem === "DROP_SOLTO")
      return this.elegiveis().filter((item) => !estocados.has(item.id));
    const ids = this.origens().find((origem) => origem.id === this.entrada.origem)?.itensIds ?? [];
    return this.itens().filter((item) => item.ativo && ids.includes(item.id) && !estocados.has(item.id));
  }

  itemSelecionado(): ItemCatalogo | undefined {
    return this.itensDaOrigem().find((item) => item.id === this.entrada.itemId);
  }

  itemLiberado(): boolean {
    return this.itemSelecionado()?.motivoInelegivel === null;
  }

  async confirmarItem(item: ItemCatalogo): Promise<void> {
    if (this.conferindo() || item.negociavel === false || item.vinculadoConta === true) return;
    this.conferindo.set(true);
    try {
      await this.acao.executar(async () => {
        await firstValueFrom(
          this.http.patch(`/api/itens/${item.id}`, {
            negociavel: true,
            vinculadoConta: false,
          }),
        );
        const atualizados = await firstValueFrom(this.http.get<ItemCatalogo[]>("/api/itens"));
        this.itens.set(atualizados);
      }, "Conferência do item registrada.");
    } finally {
      this.conferindo.set(false);
    }
  }

  trocarOrigem(origem: string): void {
    this.entrada.origem = origem;
    this.entrada.itemId = "";
    this.entrada.quantidade = 1;
    this.entrada.precoPontos = null;
  }

  entradaValida(): boolean {
    const { quantidade, precoPontos } = this.entrada;
    return (
      this.itemLiberado() &&
      Number.isInteger(quantidade) &&
      quantidade >= 1 &&
      quantidade <= 1_000_000 &&
      precoPontos !== null &&
      Number.isInteger(precoPontos) &&
      precoPontos >= 1 &&
      precoPontos <= 1_000_000_000
    );
  }

  async darEntrada(): Promise<void> {
    if (!this.entradaValida() || this.registrando()) return;
    this.registrando.set(true);
    const corpo = {
      origem: this.entrada.origem,
      precoPontos: this.entrada.precoPontos,
      itemId: this.entrada.itemId,
      quantidade: this.entrada.quantidade,
      ...(this.entrada.motivo.trim() === "" ? {} : { motivo: this.entrada.motivo.trim() }),
    };
    const ok = await this.acao.executar(
      () => firstValueFrom(this.http.post("/api/estoque/entradas", corpo)),
      "Entrada registrada.",
    );
    this.registrando.set(false);
    if (ok) {
      this.entrada = {
        origem: "",
        itemId: "",
        quantidade: 1,
        motivo: "",
        precoPontos: null as number | null,
      };
      this.painel.set(null);
    }
    await this.recarregar();
  }

  abrirPreco(item: ResumoItemEstoque): void {
    this.itemPreco.set(item);
    this.precoVenda = item.precoVigente;
    this.painel.set("preco");
  }

  precoValido(): boolean {
    return (
      this.precoVenda !== null &&
      Number.isInteger(this.precoVenda) &&
      this.precoVenda >= 1 &&
      this.precoVenda <= 1_000_000_000
    );
  }

  async salvarPreco(itemId: string): Promise<void> {
    if (!this.precoValido() || this.salvandoPreco()) return;
    this.salvandoPreco.set(true);
    try {
      const ok = await this.acao.executar(
        () => firstValueFrom(this.http.post("/api/loja/precos", { itemId, precoPontos: this.precoVenda })),
        "Preço de venda salvo.",
      );
      if (ok) {
        this.painel.set(null);
        await this.recarregar();
      }
    } finally {
      this.salvandoPreco.set(false);
    }
  }

  loteDoAjuste(): LoteEstoque | undefined {
    return this.lotesComSaldo().find((lote) => lote.id === this.ajuste.loteId);
  }

  variacaoAjuste(): number {
    return this.ajuste.operacao === "retirar" ? -this.ajuste.quantidade : this.ajuste.quantidade;
  }

  saldoAposAjuste(): number {
    return (this.loteDoAjuste()?.quantidade ?? 0) + this.variacaoAjuste();
  }

  ajusteValido(): boolean {
    const { quantidade, motivo } = this.ajuste;
    return (
      !!this.loteDoAjuste() &&
      Number.isInteger(quantidade) &&
      quantidade >= 1 &&
      quantidade <= 1_000_000 &&
      this.saldoAposAjuste() >= 0 &&
      motivo.trim().length >= 3
    );
  }

  async ajustar(): Promise<void> {
    if (!this.ajusteValido() || this.ajustando()) return;
    this.ajustando.set(true);
    const ok = await this.acao.executar(
      () =>
        firstValueFrom(
          this.http.post("/api/estoque/ajustes", {
            loteId: this.ajuste.loteId,
            quantidade: this.variacaoAjuste(),
            motivo: this.ajuste.motivo.trim(),
          }),
        ),
      "Ajuste registrado.",
    );
    this.ajustando.set(false);
    if (ok) {
      this.ajuste = { loteId: "", operacao: "adicionar", quantidade: 1, motivo: "" };
      this.painel.set(null);
    }
    await this.recarregar();
  }
}
