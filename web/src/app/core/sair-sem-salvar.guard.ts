// Guarda de saída para telas com alteração não salva (assistentes, escalas): pergunta, pelo
// Confirmacao, se é para descartar. Cada tela diz o efeito com as próprias palavras (§6.3).
import { inject } from "@angular/core";
import type { CanDeactivateFn } from "@angular/router";
import type { OpcoesConfirmacao } from "../shared/ui/confirmacao/confirmacao.component";
import { Confirmacao } from "./confirmacao";

/** Tela que sabe se tem alteração ainda não salva e como perguntar antes de descartá-la. */
export interface ComAlteracaoNaoSalva {
  alterado(): boolean;
  /** Pergunta de saída: o título, o efeito ("… será perdido") e o botão repetindo o verbo. */
  confirmacaoDeSaida(): OpcoesConfirmacao;
}

export const sairSemSalvarGuard: CanDeactivateFn<ComAlteracaoNaoSalva> = (tela) =>
  !tela.alterado() || inject(Confirmacao).perguntar(tela.confirmacaoDeSaida());
