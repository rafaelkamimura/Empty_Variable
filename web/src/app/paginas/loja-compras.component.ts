import { DatePipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, inject, type OnInit, signal } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { Acao } from "../core/acao";
import { type Compra, ROTULO_STATUS_COMPRA } from "../core/loja";
import { TabelaDirective } from "../shared/ui/tabela/tabela.directive";

/** US-13: compras do próprio membro, com cancelamento antes da entrega (D25). */
@Component({
  selector: "app-loja-compras",
  imports: [TabelaDirective, DatePipe, RouterLink, MatButtonModule, MatSnackBarModule],
  template: `
    <div class="pagina">
      <div class="cabecalho">
        <div>
          <h1>Minhas compras</h1>
          <p>Enquanto a entrega no jogo não acontece, dá para cancelar e receber os pontos de volta.</p>
        </div>
        <div class="cabecalho-acoes">
          <a mat-stroked-button routerLink="/loja">Voltar à loja</a>
        </div>
      </div>
      @if (compras().length === 0) {
        <p class="texto-secundario">Você ainda não comprou nada.</p>
      } @else {
        <div class="rolagem-horizontal">
          <table uiTabela class="tabela" data-testid="minhas-compras">
            <thead>
              <tr>
                <th scope="col">Quando</th>
                <th scope="col">Item</th>
                <th scope="col">Qtd.</th>
                <th scope="col">Total</th>
                <th scope="col">Situação</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              @for (c of compras(); track c.id) {
                <tr>
                  <td>{{ c.criadaEm | date: "dd/MM/yyyy HH:mm" }}</td>
                  <td>{{ c.item.nome }}</td>
                  <td>{{ c.quantidade }}</td>
                  <td>{{ c.total }} pts</td>
                  <td>
                    <span class="status" [class]="'status status-' + c.status">{{ status(c) }}</span>
                    @if (c.motivoCancelamento) {
                      <div class="texto-secundario">{{ c.motivoCancelamento }}</div>
                    }
                  </td>
                  <td>
                    @if (c.status === "PENDENTE_ENTREGA") {
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
    .titulo {
      margin: 0;
      flex: 1;
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
    }
    .status {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      background: var(--elevado);
      color: var(--texto);
    }
    .status-ENTREGUE {
      background: var(--acento-fundo);
      color: #c9ece4;
    }
    .status-CANCELADA {
      background: transparent;
      border: 1px solid var(--borda-forte);
      color: var(--texto-suave);
    }
  `,
})
export class LojaComprasComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly acao = inject(Acao);
  readonly compras = signal<Compra[]>([]);

  async ngOnInit(): Promise<void> {
    await this.recarregar();
  }

  status(c: Compra): string {
    return ROTULO_STATUS_COMPRA[c.status];
  }

  async recarregar(): Promise<void> {
    try {
      this.compras.set(await firstValueFrom(this.http.get<Compra[]>("/api/loja/compras")));
    } catch {
      this.acao.avisar("Não foi possível carregar suas compras.");
    }
  }

  async cancelar(c: Compra): Promise<void> {
    if (
      !window.confirm(
        `Cancelar a compra de ${c.quantidade}× ${c.item.nome}? Os ${c.total} pts voltam para você.`,
      )
    ) {
      return;
    }
    await this.acao.executar(
      () => firstValueFrom(this.http.post(`/api/loja/compras/${c.id}/cancelar`, {})),
      "Compra cancelada. Os pontos voltaram para o seu saldo.",
    );
    await this.recarregar();
  }
}
