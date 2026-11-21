import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Module,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import type { Usuario } from "@prisma/client";
import {
  type Alvo,
  type Atacante,
  BONUS_FISICO_ZERADO,
  BONUS_MAGICO_ZERADO,
  CODIGOS_TIPO_ARMA,
  ELEMENTOS,
  TAMANHOS,
} from "@betel/simulador";
import { Papeis, UsuarioAtual } from "../auth/decoradores.js";
import { inteiro, objeto, textoOpcional, uuid } from "../comum/validacao.js";
import { FarmModule } from "../farm/farm.controller.js";
import { LootService } from "./loot.service.js";
import { MonstrosService } from "./monstros.service.js";
import { type EntradaSimulacao, SimuladorService } from "./simulador.service.js";

const ID_MAXIMO = 2_147_483_647;
/** Teto dos números da simulação: mantém as contas dentro dos inteiros exatos do JavaScript. */
const VALOR_MAXIMO = 1_000_000;
const HP_MAXIMO = 1_000_000_000_000;

function numero(valor: unknown, campo: string, min: number, max: number, padrao?: number): number {
  if ((valor === undefined || valor === null) && padrao !== undefined) return padrao;
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor < min || valor > max) {
    throw new BadRequestException(`${campo} deve ser um número entre ${min} e ${max}.`);
  }
  return valor;
}

function umDe<T extends string>(valor: unknown, opcoes: readonly T[], campo: string): T {
  const achado = opcoes.find((opcao) => opcao === valor);
  if (achado === undefined) throw new BadRequestException(`${campo} inválido.`);
  return achado;
}

function idDoJogo(valor: string): number {
  if (!/^\d{1,10}$/.test(valor)) throw new BadRequestException("ID do monstro inválido.");
  return inteiro(Number(valor), "ID do monstro", 1, ID_MAXIMO);
}

/** Lê os bônus digitados: campo ausente vale o padrão (0), e nenhum campo desconhecido entra. */
function lerBonus<T extends object>(valor: unknown, padrao: T): T {
  const dados = valor === undefined || valor === null ? {} : objeto(valor);
  const bonus: Record<string, number | boolean> = {};
  for (const [chave, inicial] of Object.entries(padrao) as [string, number | boolean][]) {
    const informado = dados[chave];
    bonus[chave] =
      typeof inicial === "boolean"
        ? informado === true
        : numero(informado, `Bônus (${chave})`, 0, VALOR_MAXIMO, inicial);
  }
  return bonus as T;
}

function lerAtacante(valor: unknown): Atacante {
  const a = objeto(valor);
  const ponto = (chave: string, rotulo: string) => numero(a[chave], rotulo, 0, 9999, 0);
  return {
    nivelBase: inteiro(a["nivelBase"], "Nível base", 1, 250),
    str: ponto("str", "FOR"),
    dex: ponto("dex", "DES"),
    int: ponto("int", "INT"),
    luk: ponto("luk", "SOR"),
    pow: ponto("pow", "POD"),
    spl: ponto("spl", "FEI"),
    con: ponto("con", "CON"),
  };
}

function lerAlvo(valor: unknown): Alvo {
  const a = objeto(valor);
  return {
    nivel: inteiro(a["nivel"], "Nível do alvo", 1, 999),
    def: numero(a["def"], "DEF do alvo", 0, VALOR_MAXIMO, 0),
    mdef: numero(a["mdef"], "DEFM do alvo", 0, VALOR_MAXIMO, 0),
    vit: numero(a["vit"], "VIT do alvo", 0, VALOR_MAXIMO, 0),
    int: numero(a["int"], "INT do alvo", 0, VALOR_MAXIMO, 0),
    res: numero(a["res"], "RES do alvo", 0, VALOR_MAXIMO, 0),
    mres: numero(a["mres"], "RESM do alvo", 0, VALOR_MAXIMO, 0),
    tamanho: umDe(a["tamanho"], TAMANHOS, "Tamanho do alvo"),
    elemento: umDe(a["elemento"], ELEMENTOS, "Propriedade do alvo"),
    nivelElemento: inteiro(a["nivelElemento"], "Nível da propriedade do alvo", 1, 4),
    danoRecebidoPct: numero(a["danoRecebidoPct"], "Dano recebido pelo alvo (%)", 0, 1000, 100),
  };
}

function lerSimulacao(corpo: unknown): { entrada: EntradaSimulacao; hp: number | null } {
  const b = objeto(corpo);
  const tipo = umDe(b["tipo"], ["FISICO", "MAGICO"] as const, "Tipo de dano");
  const arma = objeto(b["arma"]);
  const habilidade = objeto(b["habilidade"]);
  const hp = objeto(b["alvo"])["hp"];
  const comum = {
    atacante: lerAtacante(b["atacante"]),
    arma: {
      tipo: umDe(arma["tipo"], CODIGOS_TIPO_ARMA, "Tipo da arma"),
      ataque: numero(arma["ataque"], "Ataque base da arma", 0, VALOR_MAXIMO, 0),
      nivel: inteiro(arma["nivel"], "Nível da arma", 1, 5),
      refino: inteiro(arma["refino"], "Refino da arma", 0, 20),
    },
    elementoAtaque: umDe(b["elementoAtaque"], ELEMENTOS, "Propriedade do ataque"),
    habilidade: {
      pct: numero(habilidade["pct"], "% da habilidade", 1, VALOR_MAXIMO),
      acertos: inteiro(habilidade["acertos"], "Número de acertos", 1, 1000),
    },
    alvo: lerAlvo(b["alvo"]),
  };
  return {
    entrada:
      tipo === "FISICO"
        ? { tipo, ...comum, bonus: lerBonus(b["bonus"], BONUS_FISICO_ZERADO) }
        : { tipo, ...comum, bonus: lerBonus(b["bonus"], BONUS_MAGICO_ZERADO) },
    hp: hp === undefined || hp === null ? null : numero(hp, "HP do alvo", 1, HP_MAXIMO),
  };
}

/** D57: simulação de dano da build de um personagem contra um chefe de instância ou outro monstro. */
@Controller("simulador")
export class SimuladorController {
  constructor(
    private readonly simulador: SimuladorService,
    private readonly loot: LootService,
  ) {}

  @Get("alvos")
  alvos() {
    return this.simulador.alvos();
  }

  @Get("monstros")
  monstros(@Query("busca") busca: unknown) {
    const texto = typeof busca === "string" ? busca.trim().replace(/\s+/g, " ") : "";
    if (texto.length < 2 || texto.length > 80) {
      throw new BadRequestException("Informe de 2 a 80 letras do nome do monstro.");
    }
    return this.simulador.buscarMonstros(texto);
  }

  @Get("monstros/:idJogo")
  monstro(@Param("idJogo") idJogo: string) {
    return this.simulador.monstro(idDoJogo(idJogo));
  }

  @Post("simular")
  @HttpCode(200)
  simular(@Body() corpo: unknown) {
    const { entrada, hp } = lerSimulacao(corpo);
    return this.simulador.simular(entrada, hp);
  }

  /** D60: loot da instância, pelos drops dos chefes cadastrados nela. */
  @Get("instancias/:id/loot")
  lootDaInstancia(@Param("id") id: string) {
    return this.loot.daInstancia(uuid(id, "Instância"));
  }

  @Post("instancias/:id/chefes")
  @Papeis("GESTOR")
  adicionarChefe(@Param("id") id: string, @Body() corpo: unknown, @UsuarioAtual() gestor: Usuario) {
    const b = objeto(corpo);
    const nome = textoOpcional(b["nome"], "Nome do chefe", 1, 80);
    const observacao = textoOpcional(b["observacao"], "Observação", 1, 500);
    return this.simulador.adicionarChefe(gestor, uuid(id, "Instância"), {
      idMonstro: inteiro(b["idMonstro"], "ID do monstro", 1, ID_MAXIMO),
      ...(nome === undefined ? {} : { nome }),
      ...(observacao === undefined ? {} : { observacao }),
    });
  }

  @Delete("instancias/:id/chefes/:idMonstro")
  @Papeis("GESTOR")
  @HttpCode(204)
  async removerChefe(
    @Param("id") id: string,
    @Param("idMonstro") idMonstro: string,
    @UsuarioAtual() gestor: Usuario,
  ): Promise<void> {
    await this.simulador.removerChefe(gestor, uuid(id, "Instância"), idDoJogo(idMonstro));
  }
}

@Module({
  imports: [FarmModule],
  controllers: [SimuladorController],
  providers: [SimuladorService, MonstrosService, LootService],
})
export class SimuladorModule {}
