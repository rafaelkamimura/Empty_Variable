import { Global, Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { AuditoriaModule } from "./auditoria/auditoria.service.js";
import { AuthModule } from "./auth/auth.module.js";
import { CadastrosModule } from "./cadastros/cadastros.module.js";
import { EstoqueModule } from "./estoque/estoque.module.js";
import { LojaModule } from "./loja/loja.module.js";
import { NebulaModule } from "./nebula/nebula.module.js";
import { ImagensModule } from "./imagens/imagens.controller.js";
import { GruposInstanciaModule } from "./instancias/grupos-instancia.controller.js";
import { InstanciasModule } from "./instancias/instancias.controller.js";
import { IntegracaoModule } from "./integracao/integracao.controller.js";
import { NotificacoesModule } from "./notificacoes/notificacoes.controller.js";
import { PainelModule } from "./painel/painel.controller.js";
import { FiltroErrosPrisma } from "./comum/filtro-prisma.js";
import { CONFIGURACAO, carregarConfiguracao } from "./configuracao.js";
import { JogadoresModule } from "./jogadores/jogadores.module.js";
import { LedgerModule } from "./ledger/ledger.module.js";
import { RunsModule } from "./runs/runs.module.js";
import { FiltroErroDominio } from "./comum/filtro-dominio.js";
import { PrismaModule } from "./prisma/prisma.service.js";
import { SaudeController } from "./saude/saude.controller.js";

@Global()
@Module({
  providers: [{ provide: CONFIGURACAO, useFactory: () => carregarConfiguracao() }],
  exports: [CONFIGURACAO],
})
export class ConfiguracaoModule {}

@Module({
  imports: [
    ConfiguracaoModule,
    PrismaModule,
    AuditoriaModule,
    AuthModule,
    JogadoresModule,
    CadastrosModule,
    LedgerModule,
    RunsModule,
    EstoqueModule,
    LojaModule,
    NebulaModule,
    PainelModule,
    ImagensModule,
    InstanciasModule,
    GruposInstanciaModule,
    IntegracaoModule,
    NotificacoesModule,
  ],
  controllers: [SaudeController],
  providers: [
    { provide: APP_FILTER, useClass: FiltroErrosPrisma },
    { provide: APP_FILTER, useClass: FiltroErroDominio },
  ],
})
export class AppModule {}
