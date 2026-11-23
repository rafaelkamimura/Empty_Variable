// Guarda de saída do assistente de run: com alteração não registrada, pergunta antes de descartar.
import { inject } from "@angular/core";
import type { CanDeactivateFn } from "@angular/router";
import { Confirmacao } from "../../core/confirmacao";

/** Tela que sabe se tem alteração ainda não registrada. */
export interface ComRascunhoNaoSalvo {
  alterado(): boolean;
}

export const sairDoAssistenteGuard: CanDeactivateFn<ComRascunhoNaoSalvo> = (tela) => {
  if (!tela.alterado()) return true;
  return inject(Confirmacao).perguntar({
    titulo: "Descartar a run?",
    descricao: "O que você preencheu ainda não foi registrado e será perdido.",
    confirmar: "Descartar",
    perigo: true,
  });
};
