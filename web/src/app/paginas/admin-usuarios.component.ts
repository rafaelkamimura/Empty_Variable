import { DatePipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, computed, inject, type OnInit, signal } from "@angular/core";
import { MatSelectModule } from "@angular/material/select";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { firstValueFrom } from "rxjs";
import { Acao } from "../core/acao";
import { AuthService } from "../core/auth.service";
import type { Papel } from "../core/modelos";
import { TabelaDirective } from "../shared/ui/tabela/tabela.directive";

export interface UsuarioSistema {
  id: string;
  discordUsername: string;
  globalName: string | null;
  papel: Papel;
  ativo: boolean;
  ultimoLogin: string | null;
  jogador: { id: string; apelido: string } | null;
  /** Admin definido em ADMIN_DISCORD_IDS: o papel não muda pela tela. */
  papelFixo: boolean;
}

export const ROTULO_PAPEL: Record<Papel, string> = {
  MEMBRO: "Cliente",
  GESTOR: "Gestor",
  ADMIN: "Administrador",
};

/** Por que o papel de um usuário não pode ser trocado aqui (null = pode). */
export function bloqueioPapel(u: UsuarioSistema, eu: string | undefined): string | null {
  if (u.papelFixo) return "Definido no .env (ADMIN_DISCORD_IDS)";
  if (u.id === eu) return "Você não muda o próprio papel";
  return null;
}

/** D38: o admin define quem é gestor (ou admin). Cada troca fica na auditoria. */
@Component({
  selector: "app-admin-usuarios",
  imports: [DatePipe, MatSelectModule, MatSnackBarModule, TabelaDirective],
  template: `
    <div class="pagina">
      <div class="cabecalho-pagina">
        <h1>Usuários</h1>
        <p>
          Quem já entrou com o Discord. O gestor cuida dos pontos, das runs, dos jogadores e das receitas; o
          administrador também mexe no estoque e na loja.
        </p>
      </div>

      <div class="chips" role="group" aria-label="Contagem por papel">
        @for (p of papeis; track p) {
          <span class="chip estatico">{{ rotulo[p] }}: {{ contagem()[p] }}</span>
        }
      </div>

      <table uiTabela class="tabela" data-testid="usuarios">
        <thead>
          <tr>
            <th scope="col">Usuário</th>
            <th scope="col">Jogador</th>
            <th scope="col">Último acesso</th>
            <th scope="col">Papel</th>
          </tr>
        </thead>
        <tbody>
          @for (u of usuarios(); track u.id) {
            <tr [class.inativo]="!u.ativo">
              <td>
                <strong>{{ u.globalName ?? u.discordUsername }}</strong>
                <div class="texto-secundario">
                  {{ u.discordUsername }}{{ u.ativo ? "" : " · desativado" }}
                </div>
              </td>
              <td>{{ u.jogador?.apelido ?? "sem vínculo" }}</td>
              <td>{{ u.ultimoLogin ? (u.ultimoLogin | date: "dd/MM/yyyy HH:mm") : "—" }}</td>
              <td>
                @if (bloqueio(u); as motivo) {
                  <span>{{ rotulo[u.papel] }}</span>
                  <div class="texto-secundario">{{ motivo }}</div>
                } @else {
                  <mat-select
                    class="papel"
                    [value]="u.papel"
                    (selectionChange)="mudarPapel(u, $event.value)"
                    [aria-label]="'Papel de ' + u.discordUsername"
                  >
                    @for (p of papeis; track p) {
                      <mat-option [value]="p">{{ rotulo[p] }}</mat-option>
                    }
                  </mat-select>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .tabela th,
    .tabela td {
      text-align: left;
      padding: 8px;
      border-bottom: 1px solid var(--borda);
      vertical-align: middle;
    }
    .papel {
      width: 160px;
    }
    .inativo {
      opacity: 0.55;
    }
    .estatico {
      cursor: default;
    }
  `,
})
export class AdminUsuariosComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly acao = inject(Acao);
  private readonly auth = inject(AuthService);

  readonly papeis: Papel[] = ["MEMBRO", "GESTOR", "ADMIN"];
  readonly rotulo = ROTULO_PAPEL;
  readonly usuarios = signal<UsuarioSistema[]>([]);
  readonly contagem = computed(() => {
    const c: Record<Papel, number> = { MEMBRO: 0, GESTOR: 0, ADMIN: 0 };
    for (const u of this.usuarios()) c[u.papel]++;
    return c;
  });

  async ngOnInit(): Promise<void> {
    await this.recarregar();
  }

  async recarregar(): Promise<void> {
    try {
      this.usuarios.set(await firstValueFrom(this.http.get<UsuarioSistema[]>("/api/usuarios")));
    } catch {
      this.acao.avisar("Não foi possível carregar os usuários.");
    }
  }

  bloqueio(u: UsuarioSistema): string | null {
    return bloqueioPapel(u, this.auth.usuario()?.id);
  }

  async mudarPapel(u: UsuarioSistema, papel: Papel): Promise<void> {
    if (papel === u.papel) return;
    if (papel === "ADMIN" && !window.confirm(`Dar acesso total (estoque e loja) a ${u.discordUsername}?`)) {
      await this.recarregar();
      return;
    }
    await this.acao.executar(
      () => firstValueFrom(this.http.patch(`/api/usuarios/${u.id}`, { papel })),
      `${u.discordUsername} agora é ${ROTULO_PAPEL[papel].toLowerCase()}.`,
    );
    await this.recarregar();
  }
}
