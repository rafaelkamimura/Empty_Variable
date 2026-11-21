import { DatePipe, DecimalPipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, computed, type ElementRef, inject, signal, viewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatTabsModule } from "@angular/material/tabs";
import { firstValueFrom } from "rxjs";
import { AuthService } from "../core/auth.service";
import { ROTULO_STATUS_COMPRA, type Compra } from "../features/loja/data/loja.modelos";
import { mensagemDeErro } from "../core/modelos";
import type { Extrato } from "../core/runs";
import { SaldoService } from "../core/saldo.service";
import { ExtratoComponent } from "./extrato.component";

interface Destinatario {
  id: string;
  apelido: string;
}
interface Revisao {
  id: string;
  destinatario: Destinatario;
  pontos: number;
}

function idTransferencia(): string {
  // getRandomValues também funciona quando a aplicação está em HTTP na rede local.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 15) | 64;
  bytes[8] = ((bytes[8] ?? 0) & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

@Component({
  selector: "app-carteira",
  imports: [DatePipe, DecimalPipe, FormsModule, MatTabsModule, ExtratoComponent],
  template: `
    <section class="pagina">
      <header class="carteira-topo">
        <div>
          <h1>Carteira</h1>
          @if (extrato(); as dados) {
            <small>Saldo disponível</small>
            <strong data-testid="saldo-carteira">{{ dados.saldo | number }} pts</strong>
          }
        </div>
        <button
          type="button"
          class="botao-acao"
          [disabled]="!extrato() || (extrato()?.saldo ?? 0) <= 0"
          (click)="abrirTransferencia()"
        >
          Transferir pontos
        </button>
      </header>

      @if (!auth.usuario()?.jogador) {
        <p>Vincule sua conta a um jogador para consultar a carteira e transferir pontos.</p>
      } @else if (erro()) {
        <p role="alert">{{ erro() }}</p>
        <button type="button" class="botao-acao" (click)="carregar()">Tentar novamente</button>
      } @else if (!extrato()) {
        <p role="status">Carregando carteira…</p>
      } @else {
        @if (confirmacao(); as mensagem) {
          <p role="status">{{ mensagem }}</p>
        }
        <mat-tab-group animationDuration="0ms">
          <mat-tab label="Movimentos">
            <app-extrato [extrato]="extrato()" [mostrarSaldo]="false" />
          </mat-tab>
          <mat-tab label="Créditos">
            <app-extrato [extrato]="creditos()" [mostrarSaldo]="false" />
          </mat-tab>
          <mat-tab label="Compras">
            <div class="compras" data-testid="compras-carteira">
              @for (compra of compras(); track compra.id) {
                <article>
                  <div>
                    <strong>{{ compra.item.nome }}</strong>
                    <small
                      >{{ compra.criadaEm | date: "dd/MM/yyyy HH:mm" }} · {{ compra.quantidade }} un.</small
                    >
                  </div>
                  <div>
                    <strong>{{ compra.total | number }} pts</strong>
                    <small>{{ statusCompra[compra.status] }}</small>
                  </div>
                </article>
              } @empty {
                <p>Nenhuma compra registrada.</p>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      }
    </section>

    <dialog #modalTransferencia aria-labelledby="titulo-transferencia" (cancel)="cancelarModal($event)">
      <header class="modal-topo">
        <h2 id="titulo-transferencia">Transferir pontos</h2>
        <button
          type="button"
          class="fechar-modal"
          aria-label="Fechar transfer&ecirc;ncia"
          [disabled]="enviando()"
          (click)="fechar()"
        >
          &#215;
        </button>
      </header>
      <p class="saldo-modal">
        Saldo dispon&iacute;vel <strong>{{ extrato()?.saldo ?? 0 | number }} pts</strong>
      </p>
      @if (erroTransferencia()) {
        <p role="alert">{{ erroTransferencia() }}</p>
      }
      @if (revisao(); as dados) {
        <p>
          Enviar <strong>{{ dados.pontos | number }} pts</strong> para
          <strong>{{ dados.destinatario.apelido }}</strong>?
        </p>
        <p>Saldo após o envio: {{ (extrato()?.saldo ?? 0) - dados.pontos | number }} pts.</p>
        <div class="acoes">
          <button type="button" class="botao-acao" [disabled]="enviando()" (click)="transferir()">
            Confirmar transferência
          </button>
          <button type="button" class="botao-secundario" [disabled]="enviando()" (click)="revisao.set(null)">
            Voltar
          </button>
        </div>
      } @else if (carregandoDestinatarios()) {
        <p role="status">Buscando jogadores…</p>
      } @else if (destinatarios().length === 0) {
        <p>Nenhum outro jogador com vínculo ativo disponível.</p>
      } @else {
        <form class="formulario" (ngSubmit)="revisar()">
          <label
            >Destinatário
            <select name="destinatario" [(ngModel)]="destinatarioId">
              <option value="">Selecione um jogador</option>
              @for (jogador of destinatarios(); track jogador.id) {
                <option [value]="jogador.id">{{ jogador.apelido }}</option>
              }
            </select>
          </label>
          <label
            >Pontos
            <input
              type="number"
              name="pontos"
              min="1"
              [max]="extrato()?.saldo ?? 0"
              step="1"
              [(ngModel)]="pontos"
            />
          </label>
          <button type="submit" class="botao-acao" [disabled]="!envioValido()">Revisar transferência</button>
        </form>
      }
    </dialog>
  `,
  styles: `
    .carteira-topo {
      display: flex;
      align-items: end;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      padding: 20px;
      border: 1px solid var(--borda-forte);
      border-radius: 14px;
      background: linear-gradient(110deg, var(--acento-fundo), var(--superficie));
      margin-bottom: 16px;
    }
    h1 {
      margin: 0 0 8px;
    }
    .carteira-topo small,
    .carteira-topo strong,
    .compras small {
      display: block;
    }
    .carteira-topo small,
    .compras small {
      color: var(--texto-suave);
    }
    .carteira-topo strong {
      color: var(--acento-forte);
      font-size: clamp(1.6rem, 4vw, 2.4rem);
      overflow-wrap: anywhere;
    }
    app-extrato {
      margin-top: 12px;
    }
    .compras {
      margin-top: 12px;
      display: grid;
      gap: 8px;
    }
    .compras article {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      padding: 12px;
      border: 1px solid var(--borda);
      border-radius: 10px;
      background: var(--cartao);
    }
    dialog {
      box-sizing: border-box;
      width: min(100% - 24px, 440px);
      max-height: calc(100dvh - 24px);
      padding: clamp(16px, 5vw, 24px);
      border: 1px solid var(--borda-forte);
      border-radius: 16px;
      background: var(--superficie);
      color: var(--texto);
    }
    dialog::backdrop {
      background: #080d15b8;
    }
    .modal-topo,
    .saldo-modal {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .modal-topo h2 {
      margin: 0;
      font-size: 1.25rem;
    }
    .saldo-modal {
      flex-wrap: wrap;
      padding: 12px;
      background: var(--cartao);
      border: 1px solid var(--borda);
      border-radius: 8px;
      color: var(--texto-suave);
    }
    .saldo-modal strong {
      color: var(--acento-forte);
    }
    .fechar-modal,
    .botao-secundario {
      font: inherit;
      padding: 8px 12px;
      border: 1px solid var(--borda-forte);
      border-radius: 8px;
      color: var(--texto);
      background: var(--cartao);
      cursor: pointer;
    }
    .fechar-modal:disabled,
    .botao-secundario:disabled {
      opacity: 0.55;
      cursor: default;
    }
    dialog [role="alert"] {
      color: var(--mat-sys-error);
    }
    .formulario,
    .formulario label {
      display: grid;
      gap: 8px;
    }
    .formulario {
      gap: 16px;
    }
    .formulario :is(input, select) {
      box-sizing: border-box;
      width: 100%;
      padding: 10px;
      border: 1px solid var(--borda-forte);
      border-radius: 8px;
      background: var(--fundo);
      color: var(--texto);
      font: inherit;
    }
    .acoes {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
  `,
})
export class CarteiraComponent {
  private readonly http = inject(HttpClient);
  private readonly saldo = inject(SaldoService);
  private readonly modalTransferencia =
    viewChild.required<ElementRef<HTMLDialogElement>>("modalTransferencia");
  private abertura = 0;
  readonly auth = inject(AuthService);
  readonly statusCompra = ROTULO_STATUS_COMPRA;
  readonly extrato = signal<Extrato | null>(null);
  readonly compras = signal<Compra[]>([]);
  readonly erro = signal<string | null>(null);
  readonly confirmacao = signal<string | null>(null);
  readonly erroTransferencia = signal<string | null>(null);
  readonly destinatarios = signal<Destinatario[]>([]);
  readonly carregandoDestinatarios = signal(false);
  readonly revisao = signal<Revisao | null>(null);
  readonly enviando = signal(false);
  destinatarioId = "";
  pontos: number | null = null;

  readonly creditos = computed(() => {
    const dados = this.extrato();
    return dados && { ...dados, lancamentos: dados.lancamentos.filter((registro) => registro.valor > 0) };
  });

  constructor() {
    if (this.auth.usuario()?.jogador) void this.carregar();
  }

  async carregar(): Promise<void> {
    this.erro.set(null);
    try {
      const [extrato, compras] = await Promise.all([
        firstValueFrom(this.http.get<Extrato>("/api/extrato/me")),
        firstValueFrom(this.http.get<Compra[]>("/api/loja/compras")),
      ]);
      this.extrato.set(extrato);
      this.compras.set(compras);
      this.saldo.definir(extrato.saldo);
    } catch (erro) {
      this.erro.set(mensagemDeErro(erro));
    }
  }

  async abrirTransferencia(): Promise<void> {
    const modal = this.modalTransferencia().nativeElement;
    if (modal.open) return;
    const abertura = ++this.abertura;
    this.destinatarioId = "";
    this.pontos = null;
    this.revisao.set(null);
    this.erroTransferencia.set(null);
    this.destinatarios.set([]);
    this.carregandoDestinatarios.set(true);
    modal.showModal();
    try {
      const jogadores = await firstValueFrom(
        this.http.get<Destinatario[]>("/api/carteira/transferencias/destinatarios"),
      );
      if (this.abertura === abertura) this.destinatarios.set(jogadores);
    } catch (erro) {
      if (this.abertura === abertura) this.erroTransferencia.set(mensagemDeErro(erro));
    } finally {
      if (this.abertura === abertura) this.carregandoDestinatarios.set(false);
    }
  }

  fechar(): void {
    if (!this.enviando()) this.modalTransferencia().nativeElement.close();
  }

  cancelarModal(evento: Event): void {
    if (this.enviando()) evento.preventDefault();
  }

  envioValido(): boolean {
    return (
      !!this.destinatarioId &&
      this.pontos !== null &&
      Number.isInteger(this.pontos) &&
      this.pontos >= 1 &&
      this.pontos <= Math.min(this.extrato()?.saldo ?? 0, 2_147_483_647)
    );
  }

  revisar(): void {
    const destinatario = this.destinatarios().find((jogador) => jogador.id === this.destinatarioId);
    if (!destinatario || !this.envioValido() || this.pontos === null) return;
    this.erroTransferencia.set(null);
    this.revisao.set({ id: idTransferencia(), destinatario, pontos: this.pontos });
  }

  async transferir(): Promise<void> {
    const revisao = this.revisao();
    if (!revisao || this.enviando()) return;
    this.enviando.set(true);
    this.erroTransferencia.set(null);
    try {
      await firstValueFrom(
        this.http.post("/api/carteira/transferencias", {
          id: revisao.id,
          destinatarioId: revisao.destinatario.id,
          pontos: revisao.pontos,
        }),
      );
      this.confirmacao.set(`Transferência enviada para ${revisao.destinatario.apelido}.`);
      this.modalTransferencia().nativeElement.close();
      await this.carregar();
    } catch (erro) {
      this.erroTransferencia.set(mensagemDeErro(erro));
    } finally {
      this.enviando.set(false);
    }
  }
}
