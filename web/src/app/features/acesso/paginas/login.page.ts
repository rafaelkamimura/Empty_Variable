import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CartaoComponent } from "../../../shared/ui/cartao/cartao.component";
import { MarcaComponent } from "../../../shared/ui/marca/marca.component";

const FALHA = "Não foi possível entrar com o Discord. Tente novamente.";
const ERROS: Record<string, string> = {
  "nao-membro": "Acesso restrito aos membros do servidor do Discord do grupo.",
  inativo: "Seu acesso foi desativado por um administrador.",
  falha: FALHA,
};

/** Mensagem do erro que o callback do OAuth devolve em `?erro=` (desconhecido vira "falha"). */
export function mensagemDoErro(erro: string | undefined): string | null {
  return erro === undefined ? null : (ERROS[erro] ?? FALHA);
}

/**
 * Entrada pelo Discord (diretrizes §2.4: a aurora no fundo do login). A navegação para
 * `api/auth/discord` é completa: o fluxo OAuth começa na API.
 */
@Component({
  selector: "app-login-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvisoComponent, BotaoComponent, CartaoComponent, MarcaComponent],
  template: `
    <div class="cena">
      <ui-cartao class="cartao">
        <div class="marca">
          <ui-marca tamanho="g" />
          <span class="nome" aria-hidden="true">Empty Variable</span>
        </div>
        <h1>Betel · Torre da Constelação</h1>
        <p class="sub">Pontuação de participação do grupo</p>
        @if (mensagem(); as msg) {
          <ui-aviso tom="erro" data-testid="login-erro">{{ msg }}</ui-aviso>
        }
        <p>Entre com a sua conta do Discord. Só membros do servidor do grupo têm acesso.</p>
        <a uiBotao variante="principal" href="api/auth/discord" data-testid="login-discord"
          >Entrar com Discord</a
        >
      </ui-cartao>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .cena {
      display: grid;
      place-items: center;
      min-height: 100vh;
      box-sizing: border-box;
      padding: var(--esp-5) var(--esp-4);
      background: var(--aurora-brilho), var(--fundo);
    }
    .cartao {
      width: min(440px, 100%);
      gap: var(--esp-4);
      padding: var(--esp-6) var(--esp-5);
      background: color-mix(in srgb, var(--cartao) 88%, transparent);
      box-shadow: var(--sombra-2);
    }
    .marca {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--esp-2);
    }
    .nome {
      font-size: var(--fs-l);
      font-weight: 700;
      letter-spacing: 0.02em;
      color: var(--texto-forte);
    }
    h1 {
      margin: var(--esp-2) 0 0;
      font-size: var(--fs-xl);
      font-weight: 700;
      text-align: center;
      color: var(--texto-forte);
    }
    .sub {
      margin: calc(var(--esp-3) * -1) 0 0;
      text-align: center;
      color: var(--texto-suave);
    }
    p {
      margin: 0;
      color: var(--texto);
    }
    a[uiBotao] {
      width: 100%;
    }
  `,
})
export class LoginPage {
  /** Preenchido pelo redirect do callback (?erro=...). */
  readonly erro = input<string | undefined>();
  protected readonly mensagem = computed(() => mensagemDoErro(this.erro()));
}
