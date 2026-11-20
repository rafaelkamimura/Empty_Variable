import { createHash, timingSafeEqual } from "node:crypto";
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Papel } from "@prisma/client";
import { CONFIGURACAO, type Configuracao } from "../configuracao.js";
import { CHAVE_INTEGRACAO, CHAVE_PAPEIS, CHAVE_PUBLICO, type RequisicaoAutenticada } from "./decoradores.js";
import { SessaoService } from "./sessao.service.js";

export const COOKIE_SESSAO = "betel_sessao";

const METODOS_SEGUROS = new Set(["GET", "HEAD", "OPTIONS"]);

/** true se a rota (ou o controller) está marcada com @Integracao(). */
function ehIntegracao(reflector: Reflector, ctx: ExecutionContext): boolean {
  return (
    reflector.getAllAndOverride<boolean | undefined>(CHAVE_INTEGRACAO, [ctx.getHandler(), ctx.getClass()]) ===
    true
  );
}

/** Compara dois segredos em tempo constante (pelos hashes, para não vazar o tamanho). */
function segredosIguais(a: string, b: string): boolean {
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(a), hash(b));
}

/**
 * Proteção contra CSRF: requisições que alteram dados precisam vir da origem do próprio sistema.
 * Roda antes da autenticação, inclusive em rotas públicas. Rotas @Integracao() ficam de fora:
 * quem chama é outro sistema, sem navegador nem cookie, e a prova é o token.
 */
@Injectable()
export class GuardaOrigem implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(CONFIGURACAO) private readonly config: Configuracao,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<RequisicaoAutenticada>();
    if (METODOS_SEGUROS.has(req.method) || ehIntegracao(this.reflector, ctx)) return true;
    if (req.headers.origin !== this.config.appOrigin) {
      throw new ForbiddenException("Origem da requisição não permitida.");
    }
    return true;
  }
}

/**
 * Exige sessão válida em todas as rotas, exceto as marcadas com @Publico().
 * Rotas @Integracao() trocam a sessão pelo token de serviço e nunca têm `req.usuario`.
 */
@Injectable()
export class GuardaAutenticacao implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessoes: SessaoService,
    @Inject(CONFIGURACAO) private readonly config: Configuracao,
  ) {}

  /** Confere o `Authorization: Bearer` de uma rota de integração. */
  private autenticarIntegracao(req: RequisicaoAutenticada): boolean {
    const esperado = this.config.tokenIntegracao;
    if (esperado === null) throw new ServiceUnavailableException("Integração não configurada.");
    const recebido = /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1];
    if (recebido === undefined || !segredosIguais(recebido, esperado)) {
      throw new UnauthorizedException("Token de integração inválido.");
    }
    return true;
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ehIntegracao(this.reflector, ctx)) {
      return this.autenticarIntegracao(ctx.switchToHttp().getRequest<RequisicaoAutenticada>());
    }
    const publico = this.reflector.getAllAndOverride<boolean | undefined>(CHAVE_PUBLICO, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (publico === true) return true;
    const req = ctx.switchToHttp().getRequest<RequisicaoAutenticada>();
    const token: unknown = req.cookies?.[COOKIE_SESSAO];
    const usuario = typeof token === "string" ? await this.sessoes.validar(token) : null;
    if (usuario === null) throw new UnauthorizedException("Sessão inválida ou expirada.");
    req.usuario = usuario;
    return true;
  }
}

/**
 * Aplica @Papeis(...). Sem o decorator, qualquer usuário autenticado passa.
 * D37: o ADMIN acessa tudo; GESTOR e MEMBRO só o que está listado.
 */
@Injectable()
export class GuardaPapeis implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const papeis = this.reflector.getAllAndOverride<Papel[] | undefined>(CHAVE_PAPEIS, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (papeis === undefined || papeis.length === 0) return true;
    const usuario = ctx.switchToHttp().getRequest<RequisicaoAutenticada>().usuario;
    if (usuario === undefined || (usuario.papel !== "ADMIN" && !papeis.includes(usuario.papel))) {
      throw new ForbiddenException("Acesso restrito.");
    }
    return true;
  }
}
