import { DatePipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, inject, type OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTableModule } from "@angular/material/table";
import { MatTabsModule } from "@angular/material/tabs";
import { firstValueFrom } from "rxjs";
import { AuthService } from "../core/auth.service";
import { type Jogador, mensagemDeErro, type Solicitacao } from "../core/modelos";
import { PainelLateralComponent } from "../shared/ui/painel-lateral/painel-lateral.component";
import { TabelaDirective } from "../shared/ui/tabela/tabela.directive";

/** Admin: fila de solicitações de vínculo (D12) e cadastro de jogadores/personagens. */
@Component({
  selector: "app-admin-jogadores",
  imports: [
    TabelaDirective,
    FormsModule,
    DatePipe,
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    PainelLateralComponent,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="pagina">
      <div class="cabecalho">
        <div>
          <h1>Jogadores</h1>
          <p>Quem joga com qual personagem, e os pedidos de vínculo com o Discord.</p>
        </div>
        <div class="cabecalho-acoes">
          <button type="button" class="botao-acao" (click)="cadastrando.set(true)">Novo jogador</button>
        </div>
      </div>

      <mat-tab-group animationDuration="0ms">
        <mat-tab [label]="'Solicitações pendentes (' + pendentes().length + ')'">
          @if (pendentes().length === 0) {
            <p class="texto-secundario vazio">Nenhuma solicitação pendente.</p>
          } @else {
            <table uiTabela mat-table [dataSource]="pendentes()" data-testid="fila">
              <ng-container matColumnDef="usuario">
                <th mat-header-cell *matHeaderCellDef>Discord</th>
                <td mat-cell *matCellDef="let s">{{ s.usuario.globalName ?? s.usuario.discordUsername }}</td>
              </ng-container>
              <ng-container matColumnDef="jogador">
                <th mat-header-cell *matHeaderCellDef>Jogador</th>
                <td mat-cell *matCellDef="let s">
                  @if (s.jogador) {
                    {{ s.jogador.apelido }}
                    <span class="texto-secundario">(existente: {{ nomes(s.jogador.personagens) }})</span>
                  } @else {
                    {{ s.apelidoProposto }} <span class="texto-secundario">(novo)</span>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="novos">
                <th mat-header-cell *matHeaderCellDef>Personagens novos</th>
                <td mat-cell *matCellDef="let s">{{ s.personagensNovos.join(", ") || "—" }}</td>
              </ng-container>
              <ng-container matColumnDef="data">
                <th mat-header-cell *matHeaderCellDef>Enviada</th>
                <td mat-cell *matCellDef="let s">{{ s.criadaEm | date: "dd/MM HH:mm" }}</td>
              </ng-container>
              <ng-container matColumnDef="acoes">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let s">
                  @if (rejeitando() === s.id) {
                    <div class="linha-acoes">
                      <mat-form-field subscriptSizing="dynamic">
                        <mat-label>Motivo</mat-label>
                        <input matInput [(ngModel)]="motivo" name="motivo" maxlength="500" />
                      </mat-form-field>
                      <button
                        mat-flat-button
                        type="button"
                        (click)="rejeitar(s)"
                        [disabled]="motivo.trim().length < 3"
                      >
                        Confirmar rejeição
                      </button>
                      <button mat-button type="button" (click)="rejeitando.set(null)">Cancelar</button>
                    </div>
                  } @else {
                    <div class="linha-acoes">
                      <button mat-flat-button type="button" (click)="aprovar(s)">Aprovar</button>
                      <button mat-button type="button" (click)="iniciarRejeicao(s)">Rejeitar</button>
                    </div>
                  }
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="colunasFila"></tr>
              <tr mat-row *matRowDef="let row; columns: colunasFila"></tr>
            </table>
          }
        </mat-tab>

        <mat-tab [label]="'Jogadores (' + jogadores().length + ')'">
          <table uiTabela mat-table [dataSource]="jogadores()" data-testid="jogadores">
            <ng-container matColumnDef="apelido">
              <th mat-header-cell *matHeaderCellDef>Apelido</th>
              <td mat-cell *matCellDef="let j">{{ j.apelido }}</td>
            </ng-container>
            <ng-container matColumnDef="discord">
              <th mat-header-cell *matHeaderCellDef>Discord</th>
              <td mat-cell *matCellDef="let j">
                {{ j.usuario ? (j.usuario.globalName ?? j.usuario.discordUsername) : "sem vínculo" }}
              </td>
            </ng-container>
            <ng-container matColumnDef="personagens">
              <th mat-header-cell *matHeaderCellDef>Personagens</th>
              <td mat-cell *matCellDef="let j">
                @for (p of j.personagens; track p.id) {
                  <span class="personagem" [class.inativo]="!p.ativo">
                    {{ p.nome }}
                    <button mat-button type="button" (click)="alternarAtivo(p)">
                      {{ p.ativo ? "desativar" : "reativar" }}
                    </button>
                  </span>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="adicionar">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let j">
                <button mat-stroked-button type="button" (click)="adicionarPersonagem(j)">
                  + personagem
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="colunasJogadores"></tr>
            <tr mat-row *matRowDef="let row; columns: colunasJogadores"></tr>
          </table>
        </mat-tab>
      </mat-tab-group>

      <ui-painel-lateral titulo="Novo jogador" [aberto]="cadastrando()" (fechar)="cadastrando.set(false)">
        <form class="formulario" (ngSubmit)="criarJogador()">
          <mat-form-field>
            <mat-label>Apelido</mat-label>
            <input matInput [(ngModel)]="novoApelido" name="novoApelido" maxlength="32" />
          </mat-form-field>
          <mat-form-field class="personagens">
            <mat-label>Personagens (separados por vírgula)</mat-label>
            <input matInput [(ngModel)]="novosPersonagens" name="novosPersonagens" />
          </mat-form-field>
          <button mat-flat-button type="submit" [disabled]="novoApelido.trim().length < 2">Cadastrar</button>
        </form>
      </ui-painel-lateral>
    </div>
  `,
  styles: `
    .formulario {
      display: flex;
      flex-direction: column;
    }
    .vazio {
      padding: 16px 0;
    }
    .bloco {
      margin: 16px 0;
    }
    .personagens {
      min-width: 320px;
    }
    .personagem {
      display: inline-flex;
      align-items: center;
      margin-right: 8px;
    }
    .inativo {
      opacity: 0.5;
      text-decoration: line-through;
    }
  `,
})
export class AdminJogadoresComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);

  readonly pendentes = signal<Solicitacao[]>([]);
  readonly jogadores = signal<Jogador[]>([]);
  readonly rejeitando = signal<string | null>(null);
  readonly colunasFila = ["usuario", "jogador", "novos", "data", "acoes"];
  readonly colunasJogadores = ["apelido", "discord", "personagens", "adicionar"];

  motivo = "";
  novoApelido = "";
  novosPersonagens = "";

  /** paineis §5: o cadastro abre no painel lateral. */
  readonly cadastrando = signal(false);

  async ngOnInit(): Promise<void> {
    await this.recarregar();
  }

  private avisar(msg: string): void {
    this.snack.open(msg, "OK", { duration: 4000 });
  }

  private async executar(op: () => Promise<unknown>, sucesso: string): Promise<boolean> {
    try {
      await op();
      this.avisar(sucesso);
      await this.recarregar();
      return true;
    } catch (e) {
      this.avisar(mensagemDeErro(e));
      return false;
    }
  }

  async recarregar(): Promise<void> {
    try {
      const [pendentes, jogadores] = await Promise.all([
        firstValueFrom(
          this.http.get<Solicitacao[]>("/api/vinculo/solicitacoes", { params: { status: "PENDENTE" } }),
        ),
        firstValueFrom(this.http.get<Jogador[]>("/api/jogadores")),
      ]);
      this.pendentes.set(pendentes);
      this.jogadores.set(jogadores);
    } catch (e) {
      this.avisar(mensagemDeErro(e));
    }
  }

  nomes(personagens: { nome: string }[]): string {
    return personagens.map((p) => p.nome).join(", ") || "sem personagens";
  }

  async aprovar(s: Solicitacao): Promise<void> {
    await this.executar(
      () => firstValueFrom(this.http.post(`/api/vinculo/solicitacoes/${s.id}/aprovar`, {})),
      "Vínculo aprovado.",
    );
    // O próprio admin pode ter aprovado o seu vínculo.
    if (s.usuario.id === this.auth.usuario()?.id) await this.auth.carregar(true);
  }

  iniciarRejeicao(s: Solicitacao): void {
    this.motivo = "";
    this.rejeitando.set(s.id);
  }

  async rejeitar(s: Solicitacao): Promise<void> {
    const ok = await this.executar(
      () =>
        firstValueFrom(this.http.post(`/api/vinculo/solicitacoes/${s.id}/rejeitar`, { motivo: this.motivo })),
      "Solicitação rejeitada.",
    );
    if (ok) this.rejeitando.set(null);
  }

  async criarJogador(): Promise<void> {
    const personagens = this.novosPersonagens
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p !== "");
    const ok = await this.executar(
      () => firstValueFrom(this.http.post("/api/jogadores", { apelido: this.novoApelido, personagens })),
      "Jogador cadastrado.",
    );
    if (ok) {
      this.novoApelido = "";
      this.novosPersonagens = "";
      this.cadastrando.set(false);
    }
  }

  async adicionarPersonagem(j: Jogador): Promise<void> {
    const nome = window.prompt(`Nome do novo personagem de ${j.apelido}:`)?.trim();
    if (!nome) return;
    await this.executar(
      () => firstValueFrom(this.http.post(`/api/jogadores/${j.id}/personagens`, { nome })),
      "Personagem adicionado.",
    );
  }

  async alternarAtivo(p: { id: string; ativo: boolean }): Promise<void> {
    await this.executar(
      () => firstValueFrom(this.http.patch(`/api/personagens/${p.id}`, { ativo: !p.ativo })),
      p.ativo ? "Personagem desativado." : "Personagem reativado.",
    );
  }
}
