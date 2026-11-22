import { HttpClient } from "@angular/common/http";
import { Component, computed, inject, type OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTableModule } from "@angular/material/table";
import { firstValueFrom } from "rxjs";
import { Acao } from "../core/acao";
import { type ItemCatalogo, TIPOS_ITEM, type TipoItem } from "../shared/dominio/cadastros";
import { ComoFuncionaComponent } from "../shared/ui/como-funciona/como-funciona.component";
import { PainelLateralComponent } from "../shared/ui/painel-lateral/painel-lateral.component";
import { TabelaDirective } from "../shared/ui/tabela/tabela.directive";
import { ImagemItemComponent } from "../shared/dominio/imagem-item.component";

/** Item ativo cuja negociabilidade ou vínculo à conta ainda não foi verificado no jogo. */
export const itemAConferir = (i: ItemCatalogo): boolean =>
  i.ativo && (i.negociavel === null || i.vinculadoConta === null);

const ROTULO_TIPO: Record<TipoItem, string> = {
  MATERIAL: "Material",
  VISUAL: "Visual",
  CARTA: "Carta",
  OUTRO: "Outro",
};

/** US-04: catálogo de itens da Torre. Negociabilidade começa desconhecida até ser verificada no jogo. */
@Component({
  selector: "app-admin-itens",
  imports: [
    ImagemItemComponent,
    TabelaDirective,
    FormsModule,
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
          <h1>Itens</h1>
          <p>Catálogo da Torre e o que vai para a loja.</p>
        </div>
        <div class="cabecalho-acoes">
          <button type="button" class="botao-acao" (click)="cadastrando.set(true)">Novo item</button>
        </div>
      </div>

      <ui-como-funciona>
        <p>Os itens das runs vêm deste catálogo e não alteram a pontuação.</p>
        <p>
          Só vai para a loja o item negociável e não vinculado à conta (D20); "Desconhecido" bloqueia até
          alguém verificar no jogo. O preço é único por item (D21) e a reserva fica sempre fora da loja (D26).
        </p>
      </ui-como-funciona>

      <div class="chips" role="group" aria-label="Visão da tabela">
        <button
          type="button"
          class="chip"
          [attr.aria-pressed]="visao() === 'catalogo'"
          (click)="visao.set('catalogo')"
        >
          Catálogo
        </button>
        <button
          type="button"
          class="chip"
          [attr.aria-pressed]="visao() === 'loja'"
          (click)="visao.set('loja')"
        >
          Loja
        </button>
        <button
          type="button"
          class="chip"
          [attr.aria-pressed]="soAConferir()"
          (click)="soAConferir.set(!soAConferir())"
        >
          A conferir: {{ aConferir() }}
        </button>
      </div>

      <div>
        <table uiTabela mat-table [dataSource]="visiveis()" data-testid="itens">
          <ng-container matColumnDef="nome">
            <th mat-header-cell *matHeaderCellDef>Nome</th>
            <td mat-cell *matCellDef="let i" [class.inativo]="!i.ativo">
              <span class="com-imagem">
                <app-imagem-item [idJogo]="i.idJogo" [nome]="i.nome" [tipo]="i.tipo" [tamanho]="24" />
                {{ i.nome }}
              </span>
            </td>
          </ng-container>
          <ng-container matColumnDef="idJogo">
            <th mat-header-cell *matHeaderCellDef>ID no jogo</th>
            <td mat-cell *matCellDef="let i">{{ i.idJogo ?? "—" }}</td>
          </ng-container>
          <ng-container matColumnDef="tipo">
            <th mat-header-cell *matHeaderCellDef>Tipo</th>
            <td mat-cell *matCellDef="let i">{{ rotulo(i) }}</td>
          </ng-container>
          <ng-container matColumnDef="negociavel">
            <th mat-header-cell *matHeaderCellDef>Negociável</th>
            <td mat-cell *matCellDef="let i">
              <mat-select
                class="tri"
                [value]="codigo(i.negociavel)"
                (selectionChange)="alterar(i, { negociavel: valor($event.value) })"
                [attr.aria-label]="'Negociável: ' + i.nome"
              >
                @for (o of opcoes; track o.codigo) {
                  <mat-option [value]="o.codigo">{{ o.rotulo }}</mat-option>
                }
              </mat-select>
            </td>
          </ng-container>
          <ng-container matColumnDef="vinculadoConta">
            <th mat-header-cell *matHeaderCellDef>Vinculado à conta</th>
            <td mat-cell *matCellDef="let i">
              <mat-select
                class="tri"
                [value]="codigo(i.vinculadoConta)"
                (selectionChange)="alterar(i, { vinculadoConta: valor($event.value) })"
                [attr.aria-label]="'Vinculado à conta: ' + i.nome"
              >
                @for (o of opcoes; track o.codigo) {
                  <mat-option [value]="o.codigo">{{ o.rotulo }}</mat-option>
                }
              </mat-select>
            </td>
          </ng-container>
          <ng-container matColumnDef="loja">
            <th mat-header-cell *matHeaderCellDef>Loja</th>
            <td mat-cell *matCellDef="let i">
              @if (i.motivoInelegivel) {
                <span class="bloqueado" [title]="i.motivoInelegivel">Bloqueado</span>
              } @else {
                <span class="elegivel">Elegível</span>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="preco">
            <th mat-header-cell *matHeaderCellDef>Preço</th>
            <td mat-cell *matCellDef="let i">
              <button
                mat-button
                type="button"
                (click)="definirPreco(i)"
                [attr.aria-label]="'Preço de ' + i.nome"
              >
                {{ i.precoVigente === null ? "definir" : i.precoVigente + " pts" }}
              </button>
            </td>
          </ng-container>
          <ng-container matColumnDef="reserva">
            <th mat-header-cell *matHeaderCellDef>Reserva</th>
            <td mat-cell *matCellDef="let i">
              <button
                mat-button
                type="button"
                (click)="definirReserva(i)"
                [attr.aria-label]="'Reserva de ' + i.nome"
              >
                {{ i.reservaMinima }}
              </button>
            </td>
          </ng-container>
          <ng-container matColumnDef="limite">
            <th mat-header-cell *matHeaderCellDef>Limite</th>
            <td mat-cell *matCellDef="let i">
              <button
                mat-button
                type="button"
                (click)="definirLimite(i)"
                [attr.aria-label]="'Limite de ' + i.nome"
              >
                {{ textoLimite(i) }}
              </button>
            </td>
          </ng-container>
          <ng-container matColumnDef="acoes">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let i">
              <button mat-button type="button" (click)="editarId(i)">ID</button>
              <button mat-button type="button" (click)="alterar(i, { ativo: !i.ativo })">
                {{ i.ativo ? "Desativar" : "Reativar" }}
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="colunas()"></tr>
          <tr mat-row *matRowDef="let row; columns: colunas()"></tr>
        </table>
      </div>

      <ui-painel-lateral titulo="Novo item" [aberto]="cadastrando()" (fechar)="cadastrando.set(false)">
        <form class="formulario" (ngSubmit)="criar()">
          <mat-form-field>
            <mat-label>Nome</mat-label>
            <input matInput [(ngModel)]="novo.nome" name="nome" maxlength="80" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Tipo</mat-label>
            <mat-select [(ngModel)]="novo.tipo" name="tipo">
              @for (t of tipos; track t) {
                <mat-option [value]="t">{{ rotuloTipo[t] }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>ID no jogo (opcional)</mat-label>
            <input
              matInput
              type="number"
              [ngModel]="novo.idJogo"
              (ngModelChange)="mudarId($event)"
              name="idJogo"
              min="1"
            />
          </mat-form-field>
          @if (previaId(); as id) {
            <div class="previa-id" data-testid="previa-id">
              <app-imagem-item
                [idJogo]="id"
                [nome]="novo.nome || 'item'"
                [tamanho]="72"
                [ilustracao]="true"
              />
              <span class="texto-secundario"
                >Imagem da Divine Pride para o ID {{ id }}. Confira se é o item certo.</span
              >
            </div>
          }
          <button mat-flat-button type="submit" [disabled]="novo.nome.trim().length < 2">Cadastrar</button>
        </form>
      </ui-painel-lateral>
    </div>
  `,
  styles: `
    .tri {
      width: 140px;
    }
    .formulario {
      display: flex;
      flex-direction: column;
    }
    .previa-id {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      padding: 10px;
      border: 1px solid var(--borda);
      border-radius: 12px;
      background: var(--arte);
    }
    .inativo {
      opacity: 0.5;
      text-decoration: line-through;
    }
    .bloqueado {
      color: var(--mat-sys-error, #b3261e);
      cursor: help;
    }
    .elegivel {
      color: var(--acento);
    }
  `,
})
export class AdminItensComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly acao = inject(Acao);

  readonly itens = signal<ItemCatalogo[]>([]);
  readonly tipos = TIPOS_ITEM;
  readonly rotuloTipo = ROTULO_TIPO;
  /** paineis §5: a tabela larga virou duas visões, uma por assunto. */
  readonly visao = signal<"catalogo" | "loja">("catalogo");
  readonly soAConferir = signal(false);
  readonly cadastrando = signal(false);
  /**
   * ID mostrado na prévia: só depois de 600 ms sem digitar. Assim "501" não busca também 5 e 50
   * na Divine Pride (eles pedem para não varrer IDs).
   */
  readonly previaId = signal<number | null>(null);
  private esperaPrevia: ReturnType<typeof setTimeout> | undefined;

  mudarId(valor: number | null): void {
    this.novo.idJogo = valor;
    clearTimeout(this.esperaPrevia);
    this.previaId.set(null);
    if (valor !== null && Number.isInteger(valor) && valor > 0) {
      this.esperaPrevia = setTimeout(() => this.previaId.set(valor), 600);
    }
  }
  readonly colunas = computed(() =>
    this.visao() === "catalogo"
      ? ["nome", "idJogo", "tipo", "negociavel", "vinculadoConta", "acoes"]
      : ["nome", "loja", "preco", "reserva", "limite"],
  );
  readonly aConferir = computed(() => this.itens().filter(itemAConferir).length);
  readonly visiveis = computed(() =>
    this.soAConferir() ? this.itens().filter(itemAConferir) : this.itens(),
  );
  readonly opcoes = [
    { codigo: "?", rotulo: "Desconhecido" },
    { codigo: "S", rotulo: "Sim" },
    { codigo: "N", rotulo: "Não" },
  ] as const;
  novo: { nome: string; tipo: TipoItem; idJogo: number | null } = {
    nome: "",
    tipo: "MATERIAL",
    idJogo: null,
  };

  async ngOnInit(): Promise<void> {
    await this.recarregar();
  }

  async recarregar(): Promise<void> {
    try {
      this.itens.set(await firstValueFrom(this.http.get<ItemCatalogo[]>("/api/itens")));
    } catch {
      this.acao.avisar("Não foi possível carregar os itens.");
    }
  }

  rotulo(i: ItemCatalogo): string {
    return i.tipo === null ? "—" : ROTULO_TIPO[i.tipo];
  }

  codigo(v: boolean | null): "?" | "S" | "N" {
    return v === null ? "?" : v ? "S" : "N";
  }
  valor(c: "?" | "S" | "N"): boolean | null {
    return c === "?" ? null : c === "S";
  }

  async criar(): Promise<void> {
    const corpo = {
      nome: this.novo.nome,
      tipo: this.novo.tipo,
      ...(this.novo.idJogo ? { idJogo: this.novo.idJogo } : {}),
    };
    const ok = await this.acao.executar(
      () => firstValueFrom(this.http.post("/api/itens", corpo)),
      "Item cadastrado.",
    );
    if (ok) {
      this.novo = { nome: "", tipo: "MATERIAL", idJogo: null };
      this.previaId.set(null);
      this.cadastrando.set(false);
    }
    await this.recarregar();
  }

  textoLimite(i: ItemCatalogo): string {
    return i.limitePorMembro === null
      ? "sem limite"
      : `${i.limitePorMembro} a cada ${i.limitePeriodoDias} dias`;
  }

  /** D21: cada mudança cria uma versão de preço; vazio tira o item da loja. */
  async definirPreco(i: ItemCatalogo): Promise<void> {
    const r = window.prompt(
      `Preço em pontos de "${i.nome}" (vazio para tirar da loja):`,
      i.precoVigente?.toString() ?? "",
    );
    if (r === null) return;
    const precoPontos = r.trim() === "" ? null : Number(r);
    await this.acao.executar(
      () => firstValueFrom(this.http.post("/api/loja/precos", { itemId: i.id, precoPontos })),
      "Preço atualizado.",
    );
    await this.recarregar();
  }

  async definirReserva(i: ItemCatalogo): Promise<void> {
    const r = window.prompt(
      `Unidades de "${i.nome}" que ficam sempre fora da loja:`,
      String(i.reservaMinima),
    );
    if (r === null) return;
    await this.alterar(i, { reservaMinima: Number(r) });
  }

  /** D24: "2/7" = no máximo 2 por membro a cada 7 dias; vazio remove o limite. */
  async definirLimite(i: ItemCatalogo): Promise<void> {
    const atual = i.limitePorMembro === null ? "" : `${i.limitePorMembro}/${i.limitePeriodoDias}`;
    const r = window.prompt(
      `Limite de "${i.nome}" no formato quantidade/dias (ex.: 2/7). Vazio remove:`,
      atual,
    );
    if (r === null) return;
    if (r.trim() === "") {
      await this.alterar(i, { limitePorMembro: null, limitePeriodoDias: null });
      return;
    }
    const [qtd, dias] = r.split("/").map((x) => Number(x.trim()));
    await this.alterar(i, { limitePorMembro: qtd ?? Number.NaN, limitePeriodoDias: dias ?? Number.NaN });
  }

  async alterar(i: ItemCatalogo, dados: Partial<ItemCatalogo>): Promise<void> {
    await this.acao.executar(
      () => firstValueFrom(this.http.patch(`/api/itens/${i.id}`, dados)),
      "Item atualizado.",
    );
    await this.recarregar();
  }

  async editarId(i: ItemCatalogo): Promise<void> {
    const r = window.prompt(`ID no jogo de "${i.nome}" (vazio para limpar):`, i.idJogo?.toString() ?? "");
    if (r === null) return;
    const idJogo = r.trim() === "" ? null : Number(r);
    await this.alterar(i, { idJogo });
  }
}
