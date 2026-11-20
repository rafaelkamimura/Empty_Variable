import { BadRequestException, Body, Controller, Global, HttpCode, Module, Post } from "@nestjs/common";
import { Integracao } from "../auth/decoradores.js";
import { inteiro, objeto, textoOpcional, uuid } from "../comum/validacao.js";
import {
  LOTE_MAXIMO,
  LOTE_PADRAO,
  type NotificacaoReservada,
  NotificacoesService,
  type ResultadoEntrega,
} from "./notificacoes.service.js";

/** Lê `{ resultados: [{ id, status: "ENTREGUE" | "FALHOU", motivo? }] }` (1 a LOTE_MAXIMO itens). */
function lerResultados(corpo: unknown): ResultadoEntrega[] {
  const lista = objeto(corpo)["resultados"];
  if (!Array.isArray(lista) || lista.length === 0 || lista.length > LOTE_MAXIMO) {
    throw new BadRequestException(`resultados deve ser uma lista com 1 a ${LOTE_MAXIMO} itens.`);
  }
  return lista.map((item, i) => {
    const r = objeto(item);
    const status = r["status"];
    if (status !== "ENTREGUE" && status !== "FALHOU") {
      throw new BadRequestException(`resultados[${i}].status deve ser ENTREGUE ou FALHOU.`);
    }
    return {
      id: uuid(r["id"], `resultados[${i}].id`),
      status,
      motivo: textoOpcional(r["motivo"], `resultados[${i}].motivo`, 1, 200) ?? null,
    };
  });
}

/**
 * Notificações por DM para o nag4eyes buscar (contrato em ./eventos.ts, protocolo em
 * docs/integracao-notificacoes.md). Este sistema não chama o bot: o bot reserva um lote, envia as DMs
 * e confirma o desfecho de cada uma.
 */
@Integracao()
@Controller("integracao/notificacoes")
export class NotificacoesController {
  constructor(private readonly notificacoes: NotificacoesService) {}

  /** Reserva e devolve as próximas pendentes. Corpo opcional: `{ limite }` (1 a 100, padrão 50). */
  @Post("reservar")
  @HttpCode(200)
  async reservar(@Body() corpo: unknown): Promise<{ notificacoes: NotificacaoReservada[] }> {
    const b = corpo === undefined || corpo === null ? {} : objeto(corpo);
    const limite = b["limite"] === undefined ? LOTE_PADRAO : inteiro(b["limite"], "limite", 1, LOTE_MAXIMO);
    return { notificacoes: await this.notificacoes.reservar(limite) };
  }

  /** Confirma o desfecho de cada notificação; confirmadas não voltam mais nos lotes. */
  @Post("confirmar")
  @HttpCode(200)
  confirmar(@Body() corpo: unknown): Promise<{ confirmadas: number; ignoradas: string[] }> {
    return this.notificacoes.confirmar(lerResultados(corpo));
  }
}

/** Global: os serviços de negócio gravam notificações sem importar este módulo. */
@Global()
@Module({
  controllers: [NotificacoesController],
  providers: [NotificacoesService],
  exports: [NotificacoesService],
})
export class NotificacoesModule {}
