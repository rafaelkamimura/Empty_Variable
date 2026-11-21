import { BadRequestException, Controller, Get, Param, Query } from "@nestjs/common";
import { Integracao } from "../auth/decoradores.js";
import {
  LIMITE_MAXIMO_MEMBROS,
  LIMITE_PADRAO_MEMBROS,
  type PaginaMembros,
  PersonagensIntegracaoService,
  type PersonagensDoMembro,
} from "./personagens.service.js";

const DISCORD_ID = /^\d{1,25}$/;

/** Valida um id do Discord vindo da URL (só dígitos). */
function discordId(valor: unknown, campo: string): string {
  if (typeof valor !== "string" || !DISCORD_ID.test(valor))
    throw new BadRequestException(`${campo} inválido.`);
  return valor;
}

/** Lê o tamanho da página da query string, com padrão e teto. */
function limite(valor: unknown): number {
  if (valor === undefined || valor === "") return LIMITE_PADRAO_MEMBROS;
  const numero = typeof valor === "string" && /^\d+$/.test(valor) ? Number(valor) : Number.NaN;
  if (!Number.isInteger(numero) || numero < 1 || numero > LIMITE_MAXIMO_MEMBROS) {
    throw new BadRequestException(`limite deve ser um número inteiro entre 1 e ${LIMITE_MAXIMO_MEMBROS}.`);
  }
  return numero;
}

/**
 * Personagens aprovados para o nag4eyes (fonte da verdade do servidor atendido). Somente leitura:
 * o nag4eyes não cria nem altera personagens aqui.
 */
@Integracao()
@Controller("integracao/personagens")
export class PersonagensIntegracaoController {
  constructor(private readonly personagens: PersonagensIntegracaoService) {}

  /** Todos os membros vinculados, página a página: `?limite=100&apos=<discordId>`. */
  @Get()
  listar(@Query("limite") limiteBruto: unknown, @Query("apos") aposBruto: unknown): Promise<PaginaMembros> {
    const apos = aposBruto === undefined || aposBruto === "" ? null : discordId(aposBruto, "apos");
    return this.personagens.listar(limite(limiteBruto), apos);
  }

  /** Um membro, pelo id do Discord. */
  @Get(":discordId")
  doMembro(@Param("discordId") id: string): Promise<PersonagensDoMembro> {
    return this.personagens.doMembro(discordId(id, "discordId"));
  }
}
