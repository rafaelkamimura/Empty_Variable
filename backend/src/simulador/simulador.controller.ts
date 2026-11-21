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
import { type BonusExtrasMotor, RACAS_MOTOR } from "@betel/motor-latam";
import {
  type Alvo,
  type Atacante,
  BONUS_FISICO_ZERADO,
  BONUS_MAGICO_ZERADO,
  type BonusFisico,
  type BonusMagico,
  CODIGOS_TIPO_ARMA,
  ELEMENTOS,
  TAMANHOS,
} from "@betel/simulador";
import { Papeis, UsuarioAtual } from "../auth/decoradores.js";
import { booleano, inteiro, objeto, textoOpcional, uuid } from "../comum/validacao.js";
import { FarmModule } from "../farm/farm.controller.js";
import { MonstrosService } from "./monstros.service.js";
import { MotorService } from "./motor.service.js";
import { type EntradaSimulacao, type SimulacaoDaBuild, SimuladorService } from "./simulador.service.js";

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

/**
 * D59: passa os bônus digitados para o motor, que os soma aos efeitos lidos dos itens. O ATQ de
 * maestria não tem um bônus equivalente no motor e volta como não aplicado.
 * @param tipo Tipo de dano dos bônus digitados
 * @param bonus Bônus digitados
 */
function bonusParaOMotor(
  tipo: "FISICO" | "MAGICO",
  bonus: BonusFisico | BonusMagico,
): Pick<SimulacaoDaBuild, "bonus" | "bonusNaoAplicados"> {
  if (tipo === "MAGICO") {
    const m = bonus as BonusMagico;
    return {
      bonusNaoAplicados: [],
      bonus: {
        matk: m.matkEquipamento,
        matkPct: m.matkPct,
        magicoRacaPct: m.racaPct,
        magicoTamanhoPct: m.tamanhoPct,
        magicoElementoAlvoPct: m.elementoAlvoPct,
        magicoElementoHabilidadePct: m.elementoHabilidadePct,
        magicoClassePct: m.classePct,
        sMatk: m.smatk,
        habilidadePct: m.habilidadePct,
        ignorarMdefPct: m.ignorarMdefPct,
        ignorarMresPct: m.ignorarMresPct,
        danoFinalPct: m.danoFinalPct,
      },
    };
  }
  const f = bonus as BonusFisico;
  const extras: BonusExtrasMotor = {
    atk: f.atkEquipamento,
    atkPct: f.atkPct,
    fisicoRacaPct: f.racaPct,
    fisicoTamanhoPct: f.tamanhoPct,
    fisicoElementoPct: f.elementoPct,
    fisicoClassePct: f.classePct,
    pAtk: f.patk,
    distanciaPct: f.distanciaPct,
    habilidadePct: f.habilidadePct,
    ignorarDefPct: f.ignorarDefPct,
    ignorarResPct: f.ignorarResPct,
    danoFinalPct: f.danoFinalPct,
    ignoraPenalidadeDeTamanho: f.ignoraPenalidadeDeTamanho,
  };
  return { bonus: extras, bonusNaoAplicados: f.atkMaestria > 0 ? ["ATQ de maestria"] : [] };
}

/**
 * Lê o pedido de simulação da build (D59): o personagem, o alvo e, se vierem, a habilidade e os
 * bônus digitados. Do alvo vão também o ID do monstro, a raça e se é chefe, que os efeitos dos
 * itens usam.
 */
function lerSimulacaoDaBuild(corpo: unknown): SimulacaoDaBuild {
  const b = objeto(corpo);
  const a = objeto(b["alvo"]);
  const alvo = lerAlvo(a);
  const idMonstro = a["idMonstro"];
  const nome = textoOpcional(a["nome"], "Nome do alvo", 1, 80);
  const tipo = umDe(b["tipo"] ?? "FISICO", ["FISICO", "MAGICO"] as const, "Tipo de dano");
  const habilidade = textoOpcional(b["habilidade"], "Habilidade", 1, 120);
  return {
    personagemId: uuid(b["personagemId"], "Personagem"),
    alvo: {
      ...alvo,
      ...(idMonstro === undefined || idMonstro === null
        ? {}
        : { id: inteiro(idMonstro, "ID do monstro", 1, ID_MAXIMO) }),
      ...(nome === undefined ? {} : { nome }),
      ...(a["hp"] === undefined || a["hp"] === null
        ? {}
        : { hp: numero(a["hp"], "HP do alvo", 1, HP_MAXIMO) }),
      ...(a["raca"] === undefined || a["raca"] === null
        ? {}
        : { raca: umDe(a["raca"], RACAS_MOTOR, "Raça do alvo") }),
      ...(a["chefe"] === undefined || a["chefe"] === null ? {} : { chefe: booleano(a["chefe"], "Chefe") }),
    },
    ...(habilidade === undefined ? {} : { habilidade }),
    ...bonusParaOMotor(
      tipo,
      tipo === "FISICO"
        ? lerBonus(b["bonus"], BONUS_FISICO_ZERADO)
        : lerBonus(b["bonus"], BONUS_MAGICO_ZERADO),
    ),
  };
}

/** D57: simulação de dano da build de um personagem contra um chefe de instância ou outro monstro. */
@Controller("simulador")
export class SimuladorController {
  constructor(private readonly simulador: SimuladorService) {}

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

  /** D59: simula a build de um personagem do membro com os efeitos dos equipamentos. */
  @Post("simular-build")
  @HttpCode(200)
  simularBuild(@Body() corpo: unknown, @UsuarioAtual() usuario: Usuario) {
    return this.simulador.simularBuild(usuario, lerSimulacaoDaBuild(corpo));
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
  providers: [SimuladorService, MonstrosService, MotorService],
})
export class SimuladorModule {}
