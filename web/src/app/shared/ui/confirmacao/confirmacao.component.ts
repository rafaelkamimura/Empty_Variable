import { Dialog, DIALOG_DATA, DialogRef } from "@angular/cdk/dialog";
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { BotaoComponent } from "../botao/botao.component";

export interface OpcoesConfirmacao {
  /** Pergunta curta. Ex.: "Cancelar a compra?". */
  readonly titulo: string;
  /** O efeito da ação, em uma ou duas frases. Ex.: "Os 300 pts voltam para o seu saldo." */
  readonly descricao: string;
  /** Texto do botão de confirmar, repetindo o verbo. Ex.: "Cancelar compra". */
  readonly confirmar: string;
  /** Texto do botão que desiste. Padrão: "Voltar". */
  readonly voltar?: string;
  /** Ação destrutiva ou irreversível: o botão de confirmar usa a variante perigo. */
  readonly perigo?: boolean;
}

/**
 * Diálogo de confirmação (diretrizes §5 e §6.3), para ações destrutivas ou irreversíveis.
 * O texto diz o efeito e o botão repete o verbo. Abre com o foco em "Voltar" (a opção segura);
 * Esc e o fundo desistem. Abra com `confirmar(dialog, opcoes)` (ou o serviço `Confirmacao`).
 *
 * @nivel organismo
 */
@Component({
  selector: "ui-confirmacao",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotaoComponent],
  template: `
    <h2 id="ui-confirmacao-titulo">{{ opcoes.titulo }}</h2>
    <p id="ui-confirmacao-descricao">{{ opcoes.descricao }}</p>
    <div class="botoes">
      <button uiBotao (click)="ref.close(false)">{{ opcoes.voltar ?? "Voltar" }}</button>
      <button uiBotao [variante]="opcoes.perigo ? 'perigo' : 'principal'" (click)="ref.close(true)">
        {{ opcoes.confirmar }}
      </button>
    </div>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
      box-sizing: border-box;
      padding: var(--esp-5);
      border: 1px solid var(--borda-forte);
      border-radius: var(--raio-g);
      background: var(--elevado);
      box-shadow: var(--sombra-2);
      color: var(--texto);
    }
    h2 {
      margin: 0;
      font-size: var(--fs-xl);
      font-weight: 700;
      color: var(--texto-forte);
    }
    p {
      margin: 0;
      color: var(--texto);
    }
    .botoes {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--esp-2);
      margin-top: var(--esp-2);
    }
  `,
})
export class ConfirmacaoComponent {
  protected readonly opcoes = inject<OpcoesConfirmacao>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
}

/** Abre o `ui-confirmacao` e resolve `true` só se a pessoa confirmar. */
export async function confirmar(dialog: Dialog, opcoes: OpcoesConfirmacao): Promise<boolean> {
  const ref = dialog.open<boolean, OpcoesConfirmacao>(ConfirmacaoComponent, {
    data: opcoes,
    role: "alertdialog",
    ariaLabelledBy: "ui-confirmacao-titulo",
    ariaDescribedBy: "ui-confirmacao-descricao",
    width: "min(440px, calc(100vw - 32px))",
    autoFocus: "first-tabbable",
    restoreFocus: true,
  });
  return (await firstValueFrom(ref.closed)) === true;
}
