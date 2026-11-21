import { Dialog } from "@angular/cdk/dialog";
import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { BotaoComponent } from "../botao/botao.component";
import { confirmar } from "./confirmacao.component";

/** Exemplos do catálogo: ui-confirmacao destrutiva e comum. */
@Component({
  selector: "ui-confirmacao-catalogo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotaoComponent],
  template: `
    <div class="linha">
      <button uiBotao variante="perigo" (click)="destrutiva()">Cancelar compra</button>
      <button uiBotao (click)="comum()">Criar nova versão</button>
    </div>
    <p class="meta" role="status">Resposta: {{ resposta() }}</p>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
    .linha {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-3);
    }
    .meta {
      margin: 0;
      color: var(--texto-suave);
    }
  `,
})
export class ConfirmacaoCatalogoComponent {
  private readonly dialog = inject(Dialog);
  protected readonly resposta = signal("—");

  protected async destrutiva(): Promise<void> {
    const ok = await confirmar(this.dialog, {
      titulo: "Cancelar a compra?",
      descricao: "Os 300 pts voltam para o seu saldo e o item volta ao estoque.",
      confirmar: "Cancelar compra",
      perigo: true,
    });
    this.resposta.set(ok ? "confirmou" : "desistiu");
  }

  protected async comum(): Promise<void> {
    const ok = await confirmar(this.dialog, {
      titulo: "Criar a versão v4?",
      descricao: "Ela passa a valer para as próximas runs.",
      confirmar: "Criar versão",
    });
    this.resposta.set(ok ? "confirmou" : "desistiu");
  }
}
