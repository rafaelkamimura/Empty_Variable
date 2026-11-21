import { Dialog } from "@angular/cdk/dialog";
import { inject, Injectable } from "@angular/core";
import { confirmar, type OpcoesConfirmacao } from "../shared/ui/confirmacao/confirmacao.component";

/**
 * Pede confirmação antes de uma ação destrutiva ou irreversível (diretrizes §6.3), com o
 * `ui-confirmacao`. Fica em core/ para as páginas injetarem (e os testes trocarem) num lugar só.
 */
@Injectable({ providedIn: "root" })
export class Confirmacao {
  private readonly dialog = inject(Dialog);

  perguntar(opcoes: OpcoesConfirmacao): Promise<boolean> {
    return confirmar(this.dialog, opcoes);
  }
}
