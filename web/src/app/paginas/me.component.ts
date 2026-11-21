import { HttpClient } from "@angular/common/http";
import { Component, inject, type OnInit, signal } from "@angular/core";
import { CONFIG_V1, pesoDoRank } from "@betel/scoring";
import { firstValueFrom } from "rxjs";
import { ComoFuncionaComponent } from "../shared/ui/como-funciona/como-funciona.component";
import { mensagemDeErro, type SituacaoVinculo } from "../core/modelos";
import type { Extrato } from "../core/runs";
import { siglaDaClasse, tomDe } from "../shared/dominio/visual";
import { ExtratoComponent } from "./extrato.component";

/**
 * T-22: área do membro. Só o próprio saldo e histórico (D14), e os personagens.
 * paineis §5: a tabela de pontos por rank é consulta e fica recolhida.
 */
@Component({
  selector: "app-me",
  imports: [ComoFuncionaComponent, ExtratoComponent],
  template: `
    <div class="pagina">
      @if (erro(); as e) {
        <p role="alert">{{ e }}</p>
      }
      @if (situacao()?.jogador; as j) {
        <div class="cabecalho">
          <div>
            <h1>{{ j.apelido }}</h1>
            <p>Seu saldo, de onde vieram os pontos e os seus personagens.</p>
          </div>
        </div>
        <app-extrato [extrato]="extrato()" />
        <section>
          <h2 class="subtitulo">Meus personagens</h2>
          <div class="grade-cartoes" data-testid="personagens">
            @for (p of j.personagens; track p.id) {
              <article class="cartao-b" [class.cartao-apagado]="!p.ativo">
                <div class="cartao-arte" [style.color]="tom(p.nome)">
                  <span class="emblema">{{ sigla(p.nome) }}</span>
                  @if (!p.ativo) {
                    <span class="cartao-selo">Inativo</span>
                  }
                </div>
                <div class="cartao-nome">{{ p.nome }}</div>
              </article>
            }
          </div>
        </section>
      }
      <ui-como-funciona titulo="Quantos pontos vale cada rank">
        <p>Pontos base de uma participação completa num encontro ×1 (como o Naght), com a run concluída:</p>
        <table class="tabela-ranks">
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Pontos</th>
            </tr>
          </thead>
          <tbody>
            @for (linha of pontosPorRank; track linha.rank) {
              <tr>
                <td>{{ linha.rank }}</td>
                <td>{{ linha.pontos }}</td>
              </tr>
            }
          </tbody>
        </table>
        <p>
          Cada instância tem os próprios encontros (o Betelgeuse vale mais) e as próprias funções e ranks;
          falha ou abandono valem menos. Empréstimos dividem os pontos com quem emprestou.
        </p>
      </ui-como-funciona>
    </div>
  `,
  styles: `
    .subtitulo {
      margin: 0 0 12px;
      font-size: 18px;
    }
    .tabela-ranks td,
    .tabela-ranks th {
      padding: 4px 16px;
      text-align: left;
    }
  `,
})
export class MeComponent implements OnInit {
  private readonly http = inject(HttpClient);
  readonly situacao = signal<SituacaoVinculo | null>(null);
  readonly extrato = signal<Extrato | null>(null);
  readonly erro = signal<string | null>(null);

  tom(nome: string): string {
    return tomDe(nome);
  }
  /** Iniciais do personagem no emblema ("Ana-MTK" → "AM"). */
  sigla(nome: string): string {
    return siglaDaClasse(nome.replace(/[-_]/g, " "));
  }

  /** B × W(r), calculado pelo mesmo motor usado pela API. */
  readonly pontosPorRank = [5, 4, 3, 2, 1].map((rank) => ({
    rank,
    pontos: (CONFIG_V1.base * pesoDoRank(rank, CONFIG_V1.alphaCentesimos)) / 100,
  }));

  async ngOnInit(): Promise<void> {
    try {
      const [situacao, extrato] = await Promise.all([
        firstValueFrom(this.http.get<SituacaoVinculo>("/api/vinculo")),
        firstValueFrom(this.http.get<Extrato>("/api/extrato/me")),
      ]);
      this.situacao.set(situacao);
      this.extrato.set(extrato);
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
    }
  }
}
