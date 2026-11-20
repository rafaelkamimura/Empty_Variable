import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import type { StatusRascunhoRun, Usuario } from "@prisma/client";
import type { Response } from "express";
import { Integracao, Papeis, UsuarioAtual } from "../auth/decoradores.js";
import { objeto, textoOpcional, uuid } from "../comum/validacao.js";
import { lerEntradaRascunhoRun } from "./entrada-rascunho-run.js";
import { RascunhosRunService } from "./rascunhos-run.service.js";

const STATUS_RASCUNHO: readonly StatusRascunhoRun[] = ["PENDENTE", "CONFIRMADO", "DESCARTADO"];

/**
 * Entrada dos rascunhos pela integração (POST /api/integracao/rascunhos-run), com o token de
 * serviço. Responde 201 quando cria e 200 quando o mesmo `idOrigem` já tinha chegado.
 */
@Integracao()
@Controller("integracao/rascunhos-run")
export class IntegracaoRascunhosRunController {
  constructor(private readonly rascunhos: RascunhosRunService) {}

  @Post()
  async receber(@Body() corpo: unknown, @Res({ passthrough: true }) res: Response) {
    const r = await this.rascunhos.receber(lerEntradaRascunhoRun(corpo));
    res.status(r.criado ? 201 : 200);
    return r;
  }
}

/** Revisão dos rascunhos pela gestão: listar, ver, refazer o casamento, descartar e confirmar. */
@Controller("rascunhos-run")
@Papeis("GESTOR")
export class RascunhosRunController {
  constructor(private readonly rascunhos: RascunhosRunService) {}

  @Get()
  listar(@Query("status") status: unknown) {
    if (status === undefined || status === "") return this.rascunhos.listar();
    if (!STATUS_RASCUNHO.includes(status as StatusRascunhoRun))
      throw new BadRequestException("status inválido.");
    return this.rascunhos.listar(status as StatusRascunhoRun);
  }

  @Get(":id")
  detalhe(@Param("id") id: string) {
    return this.rascunhos.detalhe(uuid(id, "id"));
  }

  @Post(":id/resolver")
  @HttpCode(200)
  resolver(@Param("id") id: string) {
    return this.rascunhos.resolver(uuid(id, "id"));
  }

  /** Corpo opcional: { motivo }. */
  @Post(":id/descartar")
  @HttpCode(200)
  descartar(@Param("id") id: string, @Body() corpo: unknown, @UsuarioAtual() admin: Usuario) {
    const motivo = corpo === undefined || corpo === null ? undefined : objeto(corpo)["motivo"];
    return this.rascunhos.descartar(uuid(id, "id"), textoOpcional(motivo, "motivo", 3, 500) ?? null, admin);
  }

  /** Corpo: o mesmo de POST /api/runs; `data`, `instanciaId` e `participantes` podem vir do rascunho. */
  @Post(":id/confirmar")
  confirmar(@Param("id") id: string, @Body() corpo: unknown, @UsuarioAtual() admin: Usuario) {
    return this.rascunhos.confirmar(uuid(id, "id"), corpo, admin);
  }
}
