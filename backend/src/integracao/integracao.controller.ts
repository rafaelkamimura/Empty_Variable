import { Controller, Get, Inject, Module } from "@nestjs/common";
import { Integracao } from "../auth/decoradores.js";
import { CONFIGURACAO, type Configuracao } from "../configuracao.js";
import { PersonagensIntegracaoController } from "./personagens.controller.js";
import { PersonagensIntegracaoService } from "./personagens.service.js";

/**
 * API para outros sistemas do grupo (hoje, o bot nag4eyes). Tudo sob /api/integracao exige
 * `Authorization: Bearer <INTEGRACAO_TOKEN>`. O sentido é sempre de fora para cá: este sistema
 * não chama ninguém.
 */
@Integracao()
@Controller("integracao")
export class IntegracaoController {
  constructor(@Inject(CONFIGURACAO) private readonly config: Configuracao) {}

  /** Confirma o token e informa o servidor do Discord atendido, para o chamador limitar a integração a ele. */
  @Get("saude")
  saude(): { status: "ok"; guildId: string | null } {
    return { status: "ok", guildId: this.config.guildId };
  }
}

@Module({
  controllers: [IntegracaoController, PersonagensIntegracaoController],
  providers: [PersonagensIntegracaoService],
})
export class IntegracaoModule {}
