import { Module } from "@nestjs/common";
import { LedgerModule } from "../ledger/ledger.module.js";
import { RunsController } from "./runs.controller.js";
import { RunsService } from "./runs.service.js";
import { InstanciasModule } from "../instancias/instancias.controller.js";
import { IntegracaoRascunhosRunController, RascunhosRunController } from "./rascunhos-run.controller.js";
import { RascunhosRunService } from "./rascunhos-run.service.js";

@Module({
  imports: [LedgerModule, InstanciasModule],
  controllers: [RunsController, RascunhosRunController, IntegracaoRascunhosRunController],
  providers: [RunsService, RascunhosRunService],
})
export class RunsModule {}
