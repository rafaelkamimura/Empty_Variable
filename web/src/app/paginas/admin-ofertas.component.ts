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
import { type Oferta, ROTULO_STATUS_OFERTA, type StatusOferta } from "../features/loja/data/loja.modelos";
import { TabelaDirective } from "../shared/ui/tabela/tabela.directive";
import { ComoFuncionaComponent } from "../shared/ui/como-funciona/como-funciona.component";

/** T-36: fila de ofertas — aprovar ao receber o item, rejeitar com motivo e concluir retiradas. */
@Component({
  selector: "app-admin-ofertas",
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
          <h1>Ofertas de jogadores</h1>
          <p>Itens que os jogadores querem vender pela loja.</p>
        </div>
      </div>
      <ui-como-funciona>
        <p>
          Aprove só depois de receber o item no jogo: ele entra à venda pelo preço do catálogo, como lote do
          vendedor. Em "Retirada pedida", devolva no jogo o que sobrou e conclua a retirada.
        </p>
      </ui-como-funciona>
      <div class="chips" role="group" aria-label="Situação das ofertas">
        <button
          type="button"
          class="chip"
          [attr.aria-pressed]="status === 'PENDENTE'"
          (click)="filtrar('PENDENTE')"
        >
          Aguardando o guardião
        </button>
        <button
          type="button"
          class="chip"
          [attr.aria-pressed]="status === 'RETIRADA_SOLICITADA'"
          (click)="filtrar('RETIRADA_SOLICITADA')"
        >
          Retirada pedida
        </button>
        <button
          type="button"
          class="chip"
          [attr.aria-pressed]="status === 'APROVADA'"
          (click)="filtrar('APROVADA')"
        >
          À venda
        </button>
        <button
          type="button"
          class="chip"
          [attr.aria-pressed]="status === 'ESGOTADA'"
          (click)="filtrar('ESGOTADA')"
        >
          Vendidas
        </button>
        <button type="button" class="chip" [attr.aria-pressed]="status === ''" (click)="filtrar('')">
          Todas
        </button>
      </div>

      @if (ofertas().length === 0) {
        <p class="texto-secundario">Nenhuma oferta nesta situação.</p>
      } @else {
        <div class="rolagem-horizontal">
          <table uiTabela class="tabela" data-testid="fila-ofertas">
            <thead>
              <tr>
                <th scope="col">Quando</th>
                <th scope="col">Jogador</th>
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
                  <td>{{ o.jogador.apelido }}</td>
                  <td>{{ o.item.nome }}</td>
                  <td>{{ o.quantidade }}</td>
                  <td>
                    {{ rotulo(o) }}
                    @if (o.motivo) {
                      <div class="texto-secundario">{{ o.motivo }}</div>
                    }
                  </td>
                  <td class="acoes">
                    @if (o.status === "PENDENTE") {
                      <button mat-flat-button type="button" (click)="aprovar(o)">Recebi, aprovar</button>
                      <button mat-button type="button" (click)="rejeitar(o)">Rejeitar</button>
                    }
                    @if (o.status === "RETIRADA_SOLICITADA") {
                      <button mat-flat-button type="button" (click)="concluir(o)">Devolvi, concluir</button>
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
      max-width: 280px;
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
  `,
})
export class AdminOfertasComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly acao = inject(Acao);
  readonly ofertas = signal<Oferta[]>([]);
  status: StatusOferta | "" = "PENDENTE";

  async ngOnInit(): Promise<void> {
    await this.recarregar();
  }

  rotulo(o: Oferta): string {
    return ROTULO_STATUS_OFERTA[o.status];
  }

  async filtrar(v: string): Promise<void> {
    this.status = v as typeof this.status;
    await this.recarregar();
  }

  async recarregar(): Promise<void> {
    const params: Record<string, string> = this.status === "" ? {} : { status: this.status };
    try {
      this.ofertas.set(await firstValueFrom(this.http.get<Oferta[]>("/api/ofertas", { params })));
    } catch {
      this.acao.avisar("Não foi possível carregar as ofertas.");
    }
  }

  async aprovar(o: Oferta): Promise<void> {
    if (!window.confirm(`Você recebeu ${o.quantidade}× ${o.item.nome} de ${o.jogador.apelido} no jogo?`))
      return;
    await this.acao.executar(
      () => firstValueFrom(this.http.post(`/api/ofertas/${o.id}/aprovar`, {})),
      "Oferta aprovada: o item está à venda.",
    );
    await this.recarregar();
  }

  async rejeitar(o: Oferta): Promise<void> {
    const motivo = window.prompt(`Motivo da rejeição da oferta de ${o.jogador.apelido}:`)?.trim();
    if (!motivo) return;
    await this.acao.executar(
      () => firstValueFrom(this.http.post(`/api/ofertas/${o.id}/rejeitar`, { motivo })),
      "Oferta rejeitada.",
    );
    await this.recarregar();
  }

  async concluir(o: Oferta): Promise<void> {
    if (!window.confirm(`Você devolveu a ${o.jogador.apelido} as unidades que sobraram de ${o.item.nome}?`))
      return;
    await this.acao.executar(
      () => firstValueFrom(this.http.post(`/api/ofertas/${o.id}/concluir-retirada`, {})),
      "Retirada concluída.",
    );
    await this.recarregar();
  }
}
