import { HttpClient } from "@angular/common/http";
import { Component, inject, type OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { Acao } from "../core/acao";
import type { Classe } from "../shared/dominio/cadastros";
import { ComoFuncionaComponent } from "../shared/ui/como-funciona/como-funciona.component";
import { PainelLateralComponent } from "../shared/ui/painel-lateral/painel-lateral.component";
import { TabelaDirective } from "../shared/ui/tabela/tabela.directive";

/**
 * US-01: classes do jogo (globais). Desde o Épico IV (D45), as funções e os ranks de cada classe são
 * de cada instância e versionados: ficam em Gestão → Instâncias.
 */
@Component({
  selector: "app-admin-classes",
  imports: [
    ComoFuncionaComponent,
    PainelLateralComponent,
    TabelaDirective,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="pagina">
      <div class="cabecalho">
        <div>
          <h1>Classes</h1>
          <p>As classes do jogo. As funções e os ranks de cada uma ficam em cada instância.</p>
        </div>
        <div class="cabecalho-acoes">
          <button type="button" class="botao-acao" (click)="cadastrando.set(true)">Nova classe</button>
        </div>
      </div>

      <ui-como-funciona>
        <p>
          A mesma classe pode ter funções e ranks diferentes em cada instância (D45): um MTK pode ser rank 5
          na Torre e rank 3 em outra. Para mudar funções e ranks, abra a instância em
          <a routerLink="/gestao/instancias">Instâncias</a> e crie uma versão nova.
        </p>
      </ui-como-funciona>

      <table uiTabela class="tabela" data-testid="classes">
        <thead>
          <tr>
            <th scope="col">Classe</th>
            <th scope="col">Apelido no grupo</th>
            <th scope="col">Situação</th>
            <th scope="col"></th>
          </tr>
        </thead>
        <tbody>
          @for (c of classes(); track c.id) {
            <tr [class.inativa]="!c.ativa" [attr.data-classe]="c.apelidoGrupo ?? c.nomeOficial">
              <td>{{ c.nomeOficial }}</td>
              <td>{{ c.apelidoGrupo ?? "—" }}</td>
              <td>{{ c.ativa ? "Ativa" : "Inativa" }}</td>
              <td class="acoes">
                <button mat-button type="button" (click)="renomear(c)">Apelido</button>
                <button mat-button type="button" (click)="alternarAtiva(c)">
                  {{ c.ativa ? "Desativar" : "Reativar" }}
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>

      <ui-painel-lateral titulo="Nova classe" [aberto]="cadastrando()" (fechar)="cadastrando.set(false)">
        <form class="formulario" (ngSubmit)="criarClasse()">
          <mat-form-field>
            <mat-label>Nome oficial</mat-label>
            <input matInput [(ngModel)]="novaClasse.nomeOficial" name="nomeOficial" maxlength="60" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Apelido no grupo</mat-label>
            <input matInput [(ngModel)]="novaClasse.apelidoGrupo" name="apelidoGrupo" maxlength="40" />
          </mat-form-field>
          <button mat-flat-button type="submit" [disabled]="novaClasse.nomeOficial.trim().length < 2">
            Cadastrar
          </button>
        </form>
      </ui-painel-lateral>
    </div>
  `,
  styles: `
    .formulario {
      display: flex;
      flex-direction: column;
    }
    .tabela th,
    .tabela td {
      text-align: left;
      padding: 8px;
      border-bottom: 1px solid var(--borda);
    }
    .inativa {
      opacity: 0.55;
    }
    a {
      color: var(--acento-forte);
    }
  `,
})
export class AdminClassesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly acao = inject(Acao);

  readonly classes = signal<Classe[]>([]);
  readonly cadastrando = signal(false);
  novaClasse = { nomeOficial: "", apelidoGrupo: "" };

  async ngOnInit(): Promise<void> {
    await this.recarregar();
  }

  async recarregar(): Promise<void> {
    try {
      this.classes.set(await firstValueFrom(this.http.get<Classe[]>("/api/classes")));
    } catch {
      this.acao.avisar("Não foi possível carregar as classes.");
    }
  }

  async criarClasse(): Promise<void> {
    const corpo = {
      nomeOficial: this.novaClasse.nomeOficial.trim(),
      ...(this.novaClasse.apelidoGrupo.trim() === ""
        ? {}
        : { apelidoGrupo: this.novaClasse.apelidoGrupo.trim() }),
    };
    const ok = await this.acao.executar(
      () => firstValueFrom(this.http.post("/api/classes", corpo)),
      "Classe cadastrada.",
    );
    if (ok) {
      this.novaClasse = { nomeOficial: "", apelidoGrupo: "" };
      this.cadastrando.set(false);
    }
    await this.recarregar();
  }

  async renomear(c: Classe): Promise<void> {
    const apelido = window.prompt(
      `Apelido de ${c.nomeOficial} no grupo (vazio remove):`,
      c.apelidoGrupo ?? "",
    );
    if (apelido === null) return;
    await this.acao.executar(
      () =>
        firstValueFrom(
          this.http.patch(`/api/classes/${c.id}`, {
            apelidoGrupo: apelido.trim() === "" ? null : apelido.trim(),
          }),
        ),
      "Apelido atualizado.",
    );
    await this.recarregar();
  }

  async alternarAtiva(c: Classe): Promise<void> {
    await this.acao.executar(
      () => firstValueFrom(this.http.patch(`/api/classes/${c.id}`, { ativa: !c.ativa })),
      c.ativa ? "Classe desativada." : "Classe reativada.",
    );
    await this.recarregar();
  }
}
