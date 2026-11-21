import { DatePipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, inject, type OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { Acao } from "../core/acao";
import { type ItemOfertavel, type Oferta, podeRetirar, ROTULO_STATUS_OFERTA } from "../core/loja";
import { TabelaDirective } from "../shared/ui/tabela/tabela.directive";
import { ComoFuncionaComponent } from "../shared/ui/como-funciona/como-funciona.component";
import { PainelLateralComponent } from "../shared/ui/painel-lateral/painel-lateral.component";

/** US-14 (T-36): o membro oferece itens em consignação e acompanha/retira as ofertas (D22, D25, C12, C13). */
@Component({
  selector: "app-loja-ofertas",
  imports: [
    ComoFuncionaComponent,
    PainelLateralComponent,
    TabelaDirective,
    FormsModule,
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="pagina">
      <div class="cabecalho">
        <div>
          <h1>Minhas ofertas</h1>
          <p>Itens seus à venda na loja do grupo.</p>
        </div>
        <div class="cabecalho-acoes">
          <button type="button" class="botao-acao" (click)="ofertando.set(true)">Nova oferta</button>
          <a mat-stroked-button routerLink="/loja">Voltar à loja</a>
        </div>
      </div>
      <ui-como-funciona>
        <p>
          Ofereça itens seus (obtidos fora das runs do grupo). Entregue o item ao guardião no jogo; quando ele
          aprovar, o item entra à venda pelo preço do catálogo. Você recebe os pontos quando o comprador
          receber o item, e pode retirar enquanto não for vendido.
        </p>
      </ui-como-funciona>

      @if (ofertas().length === 0) {
        <p class="texto-secundario">Você ainda não ofereceu nenhum item.</p>
      } @else {
        <div class="rolagem-horizontal">
          <table uiTabela class="tabela" data-testid="minhas-ofertas">
            <thead>
              <tr>
                <th scope="col">Quando</th>
                <th scope="col">Item</th>
                <th scope="col">Qtd.</th>
                <th scope="col">Situação</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              @for (o of ofertas(); track o.id) {
                <tr>
                  <td>{{ o.criadaEm | date: "dd/MM/yyyy HH:mm" }}</td>
                  <td>{{ o.item.nome }}</td>
                  <td>{{ o.quantidade }}</td>
                  <td>
                    <span class="status" [class]="'status status-' + o.status">{{ rotulo(o) }}</span>
                    @if (o.motivo) {
                      <div class="texto-secundario">{{ o.motivo }}</div>
                    }
                  </td>
                  <td>
                    @if (retiravel(o)) {
                      <button mat-button type="button" (click)="retirar(o)">Retirar</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <ui-painel-lateral titulo="Nova oferta" [aberto]="ofertando()" (fechar)="ofertando.set(false)">
        @if (itens().length === 0) {
          <p class="texto-secundario">Nenhum item pode ser oferecido no momento.</p>
        } @else {
          <form class="linha-acoes" (ngSubmit)="ofertar()">
            <mat-form-field>
              <mat-label>Item</mat-label>
              <mat-select [(ngModel)]="nova.itemId" name="item">
                @for (i of itens(); track i.id) {
                  <mat-option [value]="i.id">
                    {{ i.nome }} ·
                    {{ i.precoVigente === null ? "sem preço ainda" : i.precoVigente + " pts" }}
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field class="estreito">
              <mat-label>Quantidade</mat-label>
              <input
                matInput
                type="number"
                min="1"
                step="1"
                [(ngModel)]="nova.quantidade"
                name="quantidade"
              />
            </mat-form-field>
            <button mat-flat-button type="submit" [disabled]="!nova.itemId || !(nova.quantidade >= 1)">
              Oferecer
            </button>
          </form>
        }
      </ui-painel-lateral>
    </div>
  `,
  styles: `
    .titulo {
      margin: 0;
      flex: 1;
    }
    .estreito {
      width: 140px;
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
      border: 1px solid var(--borda-forte);
      color: var(--texto);
    }
    .status-APROVADA,
    .status-ESGOTADA {
      border-color: var(--acento);
      color: var(--acento-forte);
    }
    .status-REJEITADA,
    .status-RETIRADA_SOLICITADA {
      border-color: var(--alerta);
      color: var(--alerta);
    }
  `,
})
export class LojaOfertasComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly acao = inject(Acao);
  readonly ofertas = signal<Oferta[]>([]);
  readonly itens = signal<ItemOfertavel[]>([]);
  /** paineis §5: a nova oferta abre no painel lateral. */
  readonly ofertando = signal(false);
  nova = { itemId: "", quantidade: 1 };

  async ngOnInit(): Promise<void> {
    await this.recarregar();
  }

  rotulo(o: Oferta): string {
    return ROTULO_STATUS_OFERTA[o.status];
  }
  retiravel(o: Oferta): boolean {
    return podeRetirar(o);
  }

  async recarregar(): Promise<void> {
    try {
      const [ofertas, itens] = await Promise.all([
        firstValueFrom(this.http.get<Oferta[]>("/api/loja/ofertas")),
        firstValueFrom(this.http.get<ItemOfertavel[]>("/api/loja/ofertas/itens")),
      ]);
      this.ofertas.set(ofertas);
      this.itens.set(itens);
    } catch {
      this.acao.avisar("Não foi possível carregar suas ofertas.");
    }
  }

  async ofertar(): Promise<void> {
    const ok = await this.acao.executar(
      () =>
        firstValueFrom(
          this.http.post("/api/loja/ofertas", { itemId: this.nova.itemId, quantidade: this.nova.quantidade }),
        ),
      "Oferta registrada. Entregue o item ao guardião do grupo para ela ser aprovada.",
    );
    if (ok) {
      this.nova = { itemId: "", quantidade: 1 };
      this.ofertando.set(false);
    }
    await this.recarregar();
  }

  async retirar(o: Oferta): Promise<void> {
    const texto =
      o.status === "PENDENTE"
        ? `Retirar a oferta de ${o.quantidade}× ${o.item.nome}?`
        : `Retirar ${o.item.nome} da loja? O item para de ser vendido agora e o guardião devolve o que sobrou no jogo.`;
    if (!window.confirm(texto)) return;
    await this.acao.executar(
      () => firstValueFrom(this.http.post(`/api/loja/ofertas/${o.id}/retirar`, {})),
      o.status === "PENDENTE" ? "Oferta retirada." : "Retirada pedida. O guardião vai devolver o item.",
    );
    await this.recarregar();
  }
}
