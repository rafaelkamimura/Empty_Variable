import { HttpClient } from "@angular/common/http";
import { Component, inject, type OnInit, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { IconeComponent } from "../shared/dominio/icone.component";
import { mensagemDeErro } from "../core/modelos";
import { atrasada, esperaDe, type ResumoGestao } from "../core/painel";

/** Início da Gestão (paineis §4): o que pede atenção do gestor, com atalho para cada fila. */
@Component({
  selector: "app-gestao-inicio",
  imports: [RouterLink, IconeComponent],
  template: `
    <div class="pagina">
      <div class="cabecalho">
        <div>
          <h1>Gestão</h1>
          <p>Pontos, runs, jogadores e o que cada Nebula precisa.</p>
        </div>
        <div class="cabecalho-acoes">
          <a class="botao-acao" routerLink="/gestao/runs/nova">
            <app-icone nome="espadas" [tamanho]="18" /> Registrar run
          </a>
        </div>
      </div>

      @if (erro(); as e) {
        <p role="alert">{{ e }}</p>
      }

      @if (resumo(); as r) {
        <div class="grade-resumo" data-testid="resumo-gestao">
          <a
            class="resumo"
            [class.resumo-alerta]="atrasada(r.vinculosPendentes)"
            routerLink="/gestao/jogadores"
          >
            <span class="resumo-numero">{{ r.vinculosPendentes.quantidade }}</span>
            <span class="resumo-rotulo">Vínculos a aprovar</span>
            <span class="resumo-meta">{{ espera(r.vinculosPendentes) }}</span>
          </a>
          <a class="resumo" [class.resumo-alerta]="r.receitasAValidar > 0" routerLink="/gestao/receitas">
            <span class="resumo-numero">{{ r.receitasAValidar }}</span>
            <span class="resumo-rotulo">Receitas a validar</span>
            <span class="resumo-meta">Conferir no jogo, precificar e ativar</span>
          </a>
          <a class="resumo" routerLink="/gestao/runs">
            <span class="resumo-numero">{{ r.runsNaSemana }}</span>
            <span class="resumo-rotulo">Runs nos últimos 7 dias</span>
            <span class="resumo-meta">Ver todas as runs</span>
          </a>
        </div>

        <section class="saldos">
          <h2>Maiores saldos</h2>
          @if (r.maioresSaldos.length === 0) {
            <p class="texto-secundario">Ninguém tem pontos ainda.</p>
          } @else {
            <ol data-testid="maiores-saldos">
              @for (s of r.maioresSaldos; track s.jogadorId) {
                <li>
                  <span>{{ s.apelido }}</span><strong>{{ s.saldo }} pts</strong>
                </li>
              }
            </ol>
            <a routerLink="/gestao/saldos">Ver todos os saldos</a>
          }
        </section>
      }
    </div>
  `,
  styles: `
    .saldos h2 {
      margin: 8px 0 10px;
      font-size: 18px;
    }
    ol {
      margin: 0 0 8px;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 6px;
      max-width: 420px;
    }
    li {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      border: 1px solid var(--borda);
      border-radius: 10px;
      background: var(--cartao);
    }
    li strong {
      color: var(--acento);
    }
    a:not(.resumo):not(.botao-acao) {
      color: var(--acento-forte);
    }
  `,
})
export class GestaoInicioComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly resumo = signal<ResumoGestao | null>(null);
  readonly erro = signal<string | null>(null);
  readonly espera = esperaDe;
  readonly atrasada = atrasada;

  async ngOnInit(): Promise<void> {
    try {
      this.resumo.set(await firstValueFrom(this.http.get<ResumoGestao>("/api/painel/gestao")));
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
    }
  }
}
