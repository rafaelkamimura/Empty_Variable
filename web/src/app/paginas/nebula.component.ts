import { HttpClient } from "@angular/common/http";
import { Component, computed, inject, type OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { firstValueFrom } from "rxjs";
import { Acao } from "../core/acao";
import { mensagemDeErro } from "../core/modelos";
import {
  bloqueioSolicitar,
  disponivelDe,
  faltasDe,
  precoDe,
  type ReceitaAberta,
  temPeca,
  type VitrineNebula,
} from "../core/nebula";
import { SaldoService } from "../core/saldo.service";
import { tomDe } from "../shared/dominio/visual";
import { ImagemItemComponent } from "../shared/dominio/imagem-item.component";

/**
 * US-17 / US-18 (T-45): as Nebulosas abertas, no layout de cartões da loja. Ao escolher uma, o painel
 * mostra o que o grupo tem de cada material, a escolha da peça Astral (D31), o preço (D32) e o saldo.
 */
@Component({
  selector: "app-nebula",
  imports: [ImagemItemComponent, FormsModule, MatButtonModule, MatSlideToggleModule, MatSnackBarModule],
  template: `
    <div class="nebula">
      <div class="cabecalho-pagina">
        <h1>Nebula</h1>
        <p>
          O grupo entrega os materiais e você fabrica a Nebulosa nas máquinas do Oscar (é preciso ter vencido
          o Betelgeuse). A peça Astral você traz, ou ela sai do estoque do grupo.
        </p>
      </div>

      @if (erro(); as e) {
        <p class="erro" role="alert">{{ e }}</p>
      }

      @if (selecionada(); as r) {
        <section class="painel" aria-labelledby="titulo-nebula" data-testid="painel-nebula">
          <h2 id="titulo-nebula">{{ r.nome }}</h2>
          @if (peca(r)) {
            <mat-slide-toggle [ngModel]="trazPeca()" (ngModelChange)="trazPeca.set($event)" name="trazPeca">
              Trago minha {{ nomePeca(r) }}
            </mat-slide-toggle>
          }
          <ul class="materiais" data-testid="materiais">
            @for (f of faltas(r); track f.itemId) {
              <li>
                <span class="mat-nome">{{ f.item }}</span>
                <span class="barra" [attr.aria-label]="f.tenho + ' de ' + f.preciso">
                  <span
                    class="barra-cheia"
                    [class.barra-falta]="f.falta > 0"
                    [style.width.%]="pct(f.tenho, f.preciso)"
                  ></span>
                </span>
                <span class="mat-qtd" [class.alerta]="f.falta > 0">{{ f.tenho }}/{{ f.preciso }}</span>
              </li>
            }
          </ul>
          <div class="resumo">
            <span
              >Preço: <strong>{{ preco(r) }} pts</strong></span
            >
            <span [class.alerta]="saldoApos(r) < 0">Saldo depois: {{ saldoApos(r) }} pts</span>
            @if (r.limitePorMembro !== null) {
              <span
                >Limite: {{ r.limiteRestante }} de {{ r.limitePorMembro }} a cada
                {{ r.limitePeriodoDias }} dias</span
              >
            }
          </div>
          @if (bloqueio(r); as b) {
            <p class="alerta">{{ b }}</p>
          }
          <div class="linha-acoes">
            <button
              mat-flat-button
              type="button"
              (click)="solicitar(r)"
              [disabled]="bloqueio(r) !== null || enviando()"
            >
              Solicitar
            </button>
            <button mat-button type="button" (click)="selecionada.set(null)">Fechar</button>
          </div>
        </section>
      }

      <div class="grade-cartoes" data-testid="nebulosas">
        @for (r of receitas(); track r.id) {
          <div class="tile">
            <button
              type="button"
              class="cartao-b"
              [class.cartao-destaque]="selecionada()?.id === r.id"
              (click)="escolher(r)"
              [attr.aria-label]="'Ver ' + r.nome"
              [attr.aria-describedby]="'dica-' + r.id"
            >
              <span class="cartao-arte" [style.color]="tom(r.nome)">
                <app-imagem-item
                  [idJogo]="r.itemProduzido.idJogo"
                  [nome]="r.nome"
                  [tamanho]="72"
                  [ilustracao]="true"
                />
                <span [class]="'cartao-selo ' + selo(r).classe">{{ selo(r).texto }}</span>
              </span>
              <span class="cartao-nome">{{ r.nome }}</span>
              <span class="cartao-rodape">
                <span class="cartao-valor">{{ r.precoVigente?.precoTrazendoPeca }} pts</span>
                <span class="cartao-meta">{{ r.disponibilidade.trazendoPeca }} disp.</span>
              </span>
            </button>
            <div class="dica" role="tooltip" [id]="'dica-' + r.id">
              <strong>{{ r.nome }}</strong>
              <dl>
                <dt>Trazendo a peça</dt>
                <dd>
                  {{ r.precoVigente?.precoTrazendoPeca }} pts ·
                  {{ r.disponibilidade.trazendoPeca }} disponível(is)
                </dd>
                @if (peca(r)) {
                  <dt>Peça do estoque</dt>
                  <dd>
                    {{ r.precoVigente?.precoComPeca }} pts ·
                    {{ r.disponibilidade.comPecaDoEstoque }} disponível(is)
                  </dd>
                }
                <dt>Materiais</dt>
                <dd>
                  @for (c of r.componentes; track c.id) {
                    <div>{{ c.quantidade }}× {{ c.item.nome }}</div>
                  }
                </dd>
              </dl>
            </div>
          </div>
        } @empty {
          <p class="texto-secundario">Nenhuma Nebulosa aberta para solicitação ainda.</p>
        }
      </div>
    </div>
  `,
  styles: `
    .nebula {
      overflow-x: clip;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .painel {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      border: 1px solid var(--acento);
      border-radius: 14px;
      background: var(--cartao);
    }
    .painel h2 {
      margin: 0;
      font-size: 18px;
    }
    .materiais {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .materiais li {
      display: grid;
      grid-template-columns: minmax(120px, 220px) minmax(80px, 1fr) 72px;
      align-items: center;
      gap: 12px;
      font-size: 14px;
    }
    .barra {
      height: 8px;
      border-radius: 999px;
      background: var(--elevado);
      overflow: hidden;
    }
    .barra-cheia {
      display: block;
      height: 100%;
      background: var(--acento);
    }
    .barra-falta {
      background: var(--alerta);
    }
    .mat-qtd {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .resumo {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 20px;
    }
    .alerta {
      color: var(--alerta);
      margin: 0;
    }
    .tile {
      position: relative;
      display: flex;
    }
    .dica {
      position: absolute;
      left: 0;
      right: 0;
      bottom: calc(100% + 10px);
      z-index: 10;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 12px 14px;
      border-radius: 12px;
      background: var(--elevado);
      border: 1px solid var(--acento);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
      transform: translateY(6px);
      opacity: 0;
      pointer-events: none;
      transition:
        opacity 0.15s,
        transform 0.15s;
    }
    .tile:hover .dica,
    .tile:has(:focus-visible) .dica {
      opacity: 1;
      transform: translateY(0);
    }
    .dica dl {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 0 10px;
      margin: 0;
      font-size: 13px;
    }
    .dica dt {
      color: var(--texto-suave);
    }
    .dica dd {
      margin: 0 0 6px;
    }
    .erro {
      color: var(--mat-sys-error);
    }
    @media (max-width: 600px) {
      .materiais li {
        grid-template-columns: minmax(0, 1fr) 64px;
      }
      .barra {
        display: none;
      }
    }
  `,
})
export class NebulaComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly acao = inject(Acao);
  private readonly saldoBarra = inject(SaldoService);

  readonly vitrine = signal<VitrineNebula | null>(null);
  readonly selecionada = signal<ReceitaAberta | null>(null);
  readonly trazPeca = signal(false);
  readonly enviando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly receitas = computed(() => this.vitrine()?.receitas ?? []);

  async ngOnInit(): Promise<void> {
    await this.recarregar();
  }

  async recarregar(): Promise<void> {
    try {
      const v = await firstValueFrom(this.http.get<VitrineNebula>("/api/nebula"));
      this.vitrine.set(v);
      this.saldoBarra.definir(v.saldo);
      const sel = this.selecionada();
      if (sel !== null) this.selecionada.set(v.receitas.find((r) => r.id === sel.id) ?? null);
      this.erro.set(null);
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
    }
  }

  escolher(r: ReceitaAberta): void {
    this.selecionada.set(r);
    // Começa pela modalidade que dá para fazer agora (a do estoque, se houver).
    this.trazPeca.set(
      temPeca(r) && r.disponibilidade.comPecaDoEstoque === 0 && r.disponibilidade.trazendoPeca > 0,
    );
  }

  peca(r: ReceitaAberta): boolean {
    return temPeca(r);
  }
  nomePeca(r: ReceitaAberta): string {
    return r.componentes.find((c) => c.pecaBase)?.item.nome ?? "peça";
  }
  faltas(r: ReceitaAberta) {
    return faltasDe(r, this.trazPeca());
  }
  preco(r: ReceitaAberta): number {
    return precoDe(r, this.trazPeca());
  }
  saldoApos(r: ReceitaAberta): number {
    return (this.vitrine()?.saldo ?? 0) - this.preco(r);
  }
  bloqueio(r: ReceitaAberta): string | null {
    return bloqueioSolicitar(r, this.trazPeca(), this.vitrine()?.saldo ?? 0);
  }
  pct(tenho: number, preciso: number): number {
    return preciso === 0 ? 100 : Math.min(100, Math.round((tenho / preciso) * 100));
  }
  tom(nome: string): string {
    return tomDe(nome);
  }
  selo(r: ReceitaAberta): { texto: string; classe: string } {
    if (r.limiteRestante === 0) return { texto: "Limite atingido", classe: "selo-alerta" };
    if (disponivelDe(r, true) > 0 || disponivelDe(r, false) > 0)
      return { texto: "Pode solicitar", classe: "selo-acento" };
    return { texto: "Faltam materiais", classe: "selo-alerta" };
  }

  async solicitar(r: ReceitaAberta): Promise<void> {
    if (this.bloqueio(r) !== null) return;
    this.enviando.set(true);
    try {
      await firstValueFrom(
        this.http.post("/api/nebula/solicitacoes", { receitaId: r.id, trazPeca: this.trazPeca() }),
      );
      this.acao.avisar("Solicitação registrada. O guardião do grupo vai entregar os materiais no jogo.");
      this.selecionada.set(null);
    } catch (e) {
      this.acao.avisar(mensagemDeErro(e));
    } finally {
      this.enviando.set(false);
      await this.recarregar();
    }
  }
}
