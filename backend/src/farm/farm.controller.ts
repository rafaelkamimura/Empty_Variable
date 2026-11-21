import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Module,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import type { RecargaFarm, Usuario } from "@prisma/client";
import { ehRecarga, ZENY_MAXIMO } from "@betel/farm";
import { UsuarioAtual } from "../auth/decoradores.js";
import { inteiro, objeto, texto, uuid } from "../comum/validacao.js";
import {
  BUSCADOR_DIVINE_PRIDE,
  type BuscadorDivinePride,
  DivinePrideService,
} from "./divine-pride.service.js";
import { type EntradaDrop, type EntradaItem, FarmService } from "./farm.service.js";

// ---------- validação da entrada ----------

const nomeInstancia = (v: unknown) => texto(v, "Nome da instância", 1, 80);
const nomeItem = (v: unknown) => texto(v, "Nome do item", 1, 80);

function recarga(v: unknown): RecargaFarm {
  if (!ehRecarga(v)) throw new BadRequestException("Recarga deve ser DIARIA, TRES_DIAS, SEMANAL ou MENSAL.");
  return v;
}

function idsPersonagens(v: unknown): string[] {
  if (!Array.isArray(v) || v.length > 100) throw new BadRequestException("Personagens deve ser uma lista.");
  return [...new Set(v.map((id) => uuid(id, "Personagem")))];
}

const idJogo = (v: unknown) => (v === null ? null : inteiro(v, "ID do jogo", 1, 999_999_999));
const precoZeny = (v: unknown) => (v === null ? null : inteiro(v, "Preço", 0, ZENY_MAXIMO));

function entradaItem(corpo: Record<string, unknown>): EntradaItem {
  return {
    nome: nomeItem(corpo["nome"]),
    ...(corpo["idJogo"] !== undefined && { idJogo: idJogo(corpo["idJogo"]) }),
    ...(corpo["precoZeny"] !== undefined && { precoZeny: precoZeny(corpo["precoZeny"]) }),
  };
}

function drops(v: unknown): EntradaDrop[] {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > 200) throw new BadRequestException("Drops deve ser uma lista.");
  return v.map((d) => {
    const o = objeto(d);
    return {
      farmItemId: uuid(o["farmItemId"], "Item"),
      quantidade: inteiro(o["quantidade"], "Quantidade", 0, 1_000_000),
    };
  });
}

function data(v: unknown, campo: string): Date {
  const d = typeof v === "string" ? new Date(v) : new Date(Number.NaN);
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`${campo} deve ser uma data ISO.`);
  return d;
}

/** Maior período dos totais: um ano e pouco (o mês mais longo cabe com folga). */
const PERIODO_MAXIMO_MS = 400 * 86_400_000;

/**
 * D48–D54: Diário de farm, em `/api/farm`. Exige sessão (como todo o sistema); cada usuário só
 * enxerga e altera o próprio farm. Criar e alterar exige vínculo aprovado (D49).
 */
@Controller("farm")
export class FarmController {
  constructor(private readonly farm: FarmService) {}

  @Get("estado")
  estado(@UsuarioAtual() u: Usuario) {
    return this.farm.estado(u);
  }

  @Get("checkins")
  checkins(@UsuarioAtual() u: Usuario, @Query("de") de: unknown, @Query("ate") ate: unknown) {
    const inicio = data(de, "de");
    const fim = data(ate, "ate");
    if (fim <= inicio || fim.getTime() - inicio.getTime() > PERIODO_MAXIMO_MS) {
      throw new BadRequestException("Período inválido.");
    }
    return this.farm.checkins(u, inicio, fim);
  }

  @Get("catalogo-instancias")
  catalogo() {
    return this.farm.catalogoInstancias();
  }

  @Get("itens/busca")
  busca(@UsuarioAtual() u: Usuario, @Query("q") q: unknown) {
    const termo = typeof q === "string" ? q.trim().replace(/\s+/g, " ") : "";
    if (termo.length < 2 && !/^\d+$/.test(termo))
      throw new BadRequestException("Digite pelo menos 2 letras ou o ID.");
    if (termo.length > 80) throw new BadRequestException("Busca longa demais.");
    return this.farm.buscarItens(u, termo);
  }

  // ---------- instâncias ----------

  @Post("instancias")
  criarInstancia(@UsuarioAtual() u: Usuario, @Body() corpo: unknown) {
    const c = objeto(corpo);
    return this.farm.criarInstancia(u, {
      nome: nomeInstancia(c["nome"]),
      recarga: recarga(c["recarga"]),
      ...(c["instanciaId"] != null && { instanciaId: uuid(c["instanciaId"], "Instância do catálogo") }),
      ...(c["personagemIds"] !== undefined && { personagemIds: idsPersonagens(c["personagemIds"]) }),
    });
  }

  @Patch("instancias/:id")
  atualizarInstancia(@UsuarioAtual() u: Usuario, @Param("id") id: string, @Body() corpo: unknown) {
    const c = objeto(corpo);
    return this.farm.atualizarInstancia(u, uuid(id, "Instância"), {
      ...(c["nome"] !== undefined && { nome: nomeInstancia(c["nome"]) }),
      ...(c["recarga"] !== undefined && { recarga: recarga(c["recarga"]) }),
      ...(c["personagemIds"] !== undefined && { personagemIds: idsPersonagens(c["personagemIds"]) }),
    });
  }

  @Delete("instancias/:id")
  @HttpCode(204)
  excluirInstancia(@UsuarioAtual() u: Usuario, @Param("id") id: string) {
    return this.farm.excluirInstancia(u, uuid(id, "Instância"));
  }

  @Post("instancias/:id/drops")
  adicionarDrop(@UsuarioAtual() u: Usuario, @Param("id") id: string, @Body() corpo: unknown) {
    return this.farm.adicionarDrop(u, uuid(id, "Instância"), entradaItem(objeto(corpo)));
  }

  @Delete("instancias/:id/drops/:itemId")
  @HttpCode(204)
  removerDrop(@UsuarioAtual() u: Usuario, @Param("id") id: string, @Param("itemId") itemId: string) {
    return this.farm.removerDrop(u, uuid(id, "Instância"), uuid(itemId, "Item"));
  }

  // ---------- itens ----------

  @Post("itens")
  criarItem(@UsuarioAtual() u: Usuario, @Body() corpo: unknown) {
    return this.farm.criarItem(u, entradaItem(objeto(corpo)));
  }

  @Patch("itens/:id")
  atualizarItem(@UsuarioAtual() u: Usuario, @Param("id") id: string, @Body() corpo: unknown) {
    const c = objeto(corpo);
    return this.farm.atualizarItem(u, uuid(id, "Item"), {
      ...(c["nome"] !== undefined && { nome: nomeItem(c["nome"]) }),
      ...(c["idJogo"] !== undefined && { idJogo: idJogo(c["idJogo"]) }),
      ...(c["precoZeny"] !== undefined && { precoZeny: precoZeny(c["precoZeny"]) }),
    });
  }

  @Delete("itens/:id")
  @HttpCode(204)
  excluirItem(@UsuarioAtual() u: Usuario, @Param("id") id: string) {
    return this.farm.excluirItem(u, uuid(id, "Item"));
  }

  // ---------- check-ins ----------

  @Post("checkins")
  checkin(@UsuarioAtual() u: Usuario, @Body() corpo: unknown) {
    const c = objeto(corpo);
    return this.farm.fazerCheckin(u, {
      personagemId: uuid(c["personagemId"], "Personagem"),
      farmInstanciaId: uuid(c["farmInstanciaId"], "Instância"),
      drops: drops(c["drops"]),
    });
  }

  @Patch("checkins/:id")
  editarCheckin(@UsuarioAtual() u: Usuario, @Param("id") id: string, @Body() corpo: unknown) {
    return this.farm.editarDrops(u, uuid(id, "Check-in"), drops(objeto(corpo)["drops"]));
  }

  @Delete("checkins/:id")
  @HttpCode(204)
  desfazer(@UsuarioAtual() u: Usuario, @Param("id") id: string) {
    return this.farm.desfazerCheckin(u, uuid(id, "Check-in"));
  }

  // ---------- importação do artefato (D54) ----------

  /**
   * `{ backup, personagens: { <id no artefato>: <personagemId> } }`. O site manda o backup em
   * pedaços (cada pedaço é um backup válido com parte dos check-ins), para caber no limite do corpo.
   */
  @Post("importar")
  @HttpCode(200)
  importar(@UsuarioAtual() u: Usuario, @Body() corpo: unknown) {
    const c = objeto(corpo);
    const mapa: Record<string, string> = {};
    for (const [chave, valor] of Object.entries(objeto(c["personagens"] ?? {}))) {
      if (valor === null || valor === "") continue;
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(chave))
        throw new BadRequestException("Personagem do backup inválido.");
      mapa[chave] = uuid(valor, "Personagem");
    }
    return this.farm.importar(u, c["backup"], mapa);
  }
}

@Module({
  controllers: [FarmController],
  providers: [
    FarmService,
    DivinePrideService,
    {
      provide: BUSCADOR_DIVINE_PRIDE,
      useValue: ((url, init) => fetch(url, init)) satisfies BuscadorDivinePride,
    },
  ],
  exports: [DivinePrideService, BUSCADOR_DIVINE_PRIDE],
})
export class FarmModule {}
