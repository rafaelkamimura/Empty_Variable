import { HttpClient } from "@angular/common/http";
import { Component, inject, type OnInit, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { IconeComponent } from "../shared/dominio/icone.component";
import { mensagemDeErro } from "../core/modelos";
import { atrasada, esperaDe, type ResumoAdmin } from "../core/painel";

/** Início da Administração (paineis §4): entregas, ofertas e itens a conferir. */
@Component({
  selector: "app-admin-inicio",
  imports: [RouterLink, IconeComponent],
  template: `
    <div class="pagina">
      <div class="cabecalho">
        <div>
          <h1>Administração</h1>
          <p>Estoque, loja e entregas no jogo.</p>
        </div>
        <div class="cabecalho-acoes">
          <a class="botao-acao" routerLink="/admin/estoque">
            <app-icone nome="armazem" [tamanho]="18" /> Ir para o estoque
          </a>
        </div>
      </div>

      @if (erro(); as e) {
        <p role="alert">{{ e }}</p>
      }

      @if (resumo(); as r) {
        <div class="grade-resumo" data-testid="resumo-admin">
          <a class="resumo" [class.resumo-alerta]="atrasada(r.comprasAEntregar)" routerLink="/admin/compras">
            <span class="resumo-numero">{{ r.comprasAEntregar.quantidade }}</span>
            <span class="resumo-rotulo">Compras a entregar</span>
            <span class="resumo-meta">{{ espera(r.comprasAEntregar) }}</span>
          </a>
          <a class="resumo" [class.resumo-alerta]="atrasada(r.nebulasAEntregar)" routerLink="/admin/nebula">
            <span class="resumo-numero">{{ r.nebulasAEntregar.quantidade }}</span>
            <span class="resumo-rotulo">Nebulas a entregar</span>
            <span class="resumo-meta">{{ espera(r.nebulasAEntregar) }}</span>
          </a>
          <a class="resumo" [class.resumo-alerta]="atrasada(r.ofertasAAnalisar)" routerLink="/admin/ofertas">
            <span class="resumo-numero">{{ r.ofertasAAnalisar.quantidade }}</span>
            <span class="resumo-rotulo">Ofertas a analisar</span>
            <span class="resumo-meta">{{ espera(r.ofertasAAnalisar) }}</span>
          </a>
          <a class="resumo" [class.resumo-alerta]="r.itensSemConferencia > 0" routerLink="/admin/itens">
            <span class="resumo-numero">{{ r.itensSemConferencia }}</span>
            <span class="resumo-rotulo">Itens a conferir</span>
            <span class="resumo-meta">Negociabilidade ou vínculo à conta ainda não verificados</span>
          </a>
        </div>
      }
    </div>
  `,
})
export class AdminInicioComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly resumo = signal<ResumoAdmin | null>(null);
  readonly erro = signal<string | null>(null);
  readonly espera = esperaDe;
  readonly atrasada = atrasada;

  async ngOnInit(): Promise<void> {
    try {
      this.resumo.set(await firstValueFrom(this.http.get<ResumoAdmin>("/api/painel/admin")));
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
    }
  }
}
