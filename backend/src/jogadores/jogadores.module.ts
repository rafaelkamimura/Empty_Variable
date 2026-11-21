import { Module } from "@nestjs/common";
import { FarmModule } from "../farm/farm.controller.js";
import { BUSCADOR_LINK_CURTO, type BuscadorLinkCurto, BuildSimuladorService } from "./build-simulador.js";
import { JogadoresController } from "./jogadores.controller.js";
import { VinculoController } from "./vinculo.controller.js";
import { VinculoService } from "./vinculo.service.js";

@Module({
  imports: [FarmModule],
  controllers: [JogadoresController, VinculoController],
  providers: [
    VinculoService,
    BuildSimuladorService,
    {
      provide: BUSCADOR_LINK_CURTO,
      useValue: ((url, init) => fetch(url, init)) satisfies BuscadorLinkCurto,
    },
  ],
  exports: [BuildSimuladorService],
})
export class JogadoresModule {}
