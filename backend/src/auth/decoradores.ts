import { createParamDecorator, type ExecutionContext, SetMetadata } from "@nestjs/common";
import type { Papel, Usuario } from "@prisma/client";
import type { Request } from "express";

export const CHAVE_PUBLICO = "betel:publico";
export const CHAVE_PAPEIS = "betel:papeis";
export const CHAVE_INTEGRACAO = "betel:integracao";

/** Rota acessível sem sessão. */
export const Publico = () => SetMetadata(CHAVE_PUBLICO, true);

/** Restringe a rota aos papéis informados (403 para os demais). */
export const Papeis = (...papeis: Papel[]) => SetMetadata(CHAVE_PAPEIS, papeis);

/**
 * Rota chamada por outro sistema (ex.: o bot nag4eyes), não por uma pessoa no navegador.
 * Autentica com `Authorization: Bearer <INTEGRACAO_TOKEN>` no lugar da sessão e dispensa a checagem de Origin.
 */
export const Integracao = () => SetMetadata(CHAVE_INTEGRACAO, true);

export type RequisicaoAutenticada = Request & { usuario?: Usuario };

/** Usuário da sessão atual (definido pelo GuardaAutenticacao). */
export const UsuarioAtual = createParamDecorator((_: unknown, ctx: ExecutionContext): Usuario => {
  const usuario = ctx.switchToHttp().getRequest<RequisicaoAutenticada>().usuario;
  if (usuario === undefined) throw new Error("UsuarioAtual usado em rota sem autenticação.");
  return usuario;
});
