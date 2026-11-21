import { DatePipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, inject, type OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { firstValueFrom } from "rxjs";
import { Acao } from "../core/acao";
import { type Compra, origemCompra, ROTULO_STATUS_COMPRA, type StatusCompra } from "../core/loja";
import { TabelaDirective } from "../shared/ui/tabela/tabela.directive";
import { ComoFuncionaComponent } from "../shared/ui/como-funciona/como-funciona.component";

const DIA_MS = 86_400_000;

/** US-12 (T-33): fila de entregas. Pendentes das mais antigas para as mais novas (D19, D25, D28). */
@Component({
  selector: "app-admin-compras",
  imports: [
    ComoFuncionaComponent,
    TabelaDirective,
    FormsModule,
    DatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="pagina">
      <div class="cabecalho">
        <div>
          <h1>Compras da loja</h1>
          <p>Entregas pendentes primeiro, das mais antigas para as mais novas.</p>
        </div>
      </div>
      <ui-como-funciona>
        <p>
          Entregue o item no jogo e depois marque "Entregue". Só então os vendedores consignados recebem os
          pontos. Cancelar uma compra pendente devolve os pontos ao comprador e as unidades ao estoque.
        </p>
      </ui-como-funciona>
      <div class="chips" role="group" aria-label="Situação das compras">
        <button
          type="button"
          class="chip"
          [attr.aria-pressed]="status === 'PENDENTE_ENTREGA'"
          (click)="filtrar('PENDENTE_ENTREGA')"
        >
          Aguardando entrega
        </button>
        <button
          type="button"
          class="chip"
          [attr.aria-pressed]="status === 'ENTREGUE'"
          (click)="filtrar('ENTREGUE')"
        >
          Entregues
        </button>
        <button
          type="button"
          class="chip"
          [attr.aria-pressed]="status === 'CANCELADA'"
          (click)="filtrar('CANCELADA')"
        >
          Canceladas
        </button>
        <button type="button" class="chip" [attr.aria-pressed]="status === ''" (click)="filtrar('')">
          Todas
        </button>
      </div>

      @if (compras().length === 0) {
        <p class="texto-secundario">Nenhuma compra nesta situação.</p>
      } @else {
        <div class="rolagem-horizontal">
          <table uiTabela class="tabela" data-testid="fila-compras">
            <thead>
              <tr>
                <th scope="col">Quando</th>
                <th scope="col">Comprador</th>
                <th scope="col">Item</th>
                <th scope="col">Qtd.</th>
                <th scope="col">Total</th>
                <th scope="col">Vendido por</th>
                <th scope="col">Situação</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              @for (c of compras(); track c.id) {
                <tr>
                  <td>
                    {{ c.criadaEm | date: "dd/MM/yyyy HH:mm" }}
                    @if (c.status === "PENDENTE_ENTREGA" && dias(c) >= 2) {
                      <div class="atrasada">há {{ dias(c) }} dias</div>
                    }
                  </td>
                  <td>{{ c.comprador.apelido }}</td>
                  <td>{{ c.item.nome }}</td>
                  <td>{{ c.quantidade }}</td>
                  <td>{{ c.total }} pts</td>
                  <td>{{ origem(c) }}</td>
                  <td>
                    {{ rotulo(c) }}
                    @if (c.entreguePor) {
                      <div class="texto-secundario">por {{ c.entreguePor.discordUsername }}</div>
                    }
                    @if (c.motivoCancelamento) {
                      <div class="texto-secundario">{{ c.motivoCancelamento }}</div>
                    }
                  </td>
                  <td class="acoes">
                    @if (c.status === "PENDENTE_ENTREGA") {
                      <button mat-flat-button type="button" (click)="entregar(c)">Entregue</button>
                      <button mat-button type="button" (click)="cancelar(c)">Cancelar</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: `
    .filtro {
      max-width: 260px;
    }
    .tabela {
      width: 100%;
      border-collapse: collapse;
    }
    .tabela th,
    .tabela td {
      text-align: left;
      padding: 8px;
      border-bottom: 1px solid var(--borda);
      vertical-align: top;
    }
    .acoes {
      white-space: nowrap;
    }
    .atrasada {
      font-size: 12px;
      font-weight: 600;
      color: var(--mat-sys-error, #b3261e);
    }
  `,
})
export class AdminComprasComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly acao = inject(Acao);
  readonly compras = signal<Compra[]>([]);
  status: StatusCompra | "" = "PENDENTE_ENTREGA";

  async ngOnInit(): Promise<void> {
    await this.recarregar();
  }

  rotulo(c: Compra): string {
    return ROTULO_STATUS_COMPRA[c.status];
  }
  origem(c: Compra): string {
    return origemCompra(c);
  }
  dias(c: Compra): number {
    return Math.floor((Date.now() - new Date(c.criadaEm).getTime()) / DIA_MS);
  }

  async filtrar(v: string): Promise<void> {
    this.status = v as typeof this.status;
    await this.recarregar();
  }

  async recarregar(): Promise<void> {
    const params: Record<string, string> = this.status === "" ? {} : { status: this.status };
    try {
      this.compras.set(await firstValueFrom(this.http.get<Compra[]>("/api/compras", { params })));
    } catch {
      this.acao.avisar("Não foi possível carregar as compras.");
    }
  }

  async entregar(c: Compra): Promise<void> {
    if (
      !window.confirm(
        `Confirmar que ${c.quantidade}× ${c.item.nome} foi entregue a ${c.comprador.apelido} no jogo?`,
      )
    ) {
      return;
    }
    await this.acao.executar(
      () => firstValueFrom(this.http.post(`/api/compras/${c.id}/entregar`, {})),
      "Entrega registrada.",
    );
    await this.recarregar();
  }

  async cancelar(c: Compra): Promise<void> {
    const motivo = window.prompt(`Motivo do cancelamento da compra de ${c.comprador.apelido}:`)?.trim();
    if (!motivo) return;
    await this.acao.executar(
      () => firstValueFrom(this.http.post(`/api/compras/${c.id}/cancelar`, { motivo })),
      "Compra cancelada; os pontos voltaram ao comprador.",
    );
    await this.recarregar();
  }
}
