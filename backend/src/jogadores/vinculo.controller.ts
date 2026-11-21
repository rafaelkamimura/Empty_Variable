import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import type { StatusSolicitacao, Usuario } from "@prisma/client";
import { Papeis, UsuarioAtual } from "../auth/decoradores.js";
import {
  apelidoJogador,
  inteiro,
  listaPersonagens,
  nomePersonagem,
  objeto,
  texto,
  textoOpcional,
  uuid,
} from "../comum/validacao.js";
import { BuildSimuladorService } from "./build-simulador.js";
import { VinculoService } from "./vinculo.service.js";

const STATUS: readonly StatusSolicitacao[] = ["PENDENTE", "APROVADA", "REJEITADA"];

const SLOTS = [
  "topo",
  "meio",
  "baixo",
  "arma",
  "armadura",
  "escudo",
  "capa",
  "calcado",
  "acessorio1",
  "acessorio2",
];

function lerFicha(valor: unknown) {
  const b = objeto(valor);
  const dados = b["equipamentos"] === undefined ? {} : objeto(b["equipamentos"]);
  const equipamentos: Record<string, string | { id: number; nome: string }> = {};
  for (const slot of SLOTS) {
    const selecionado = dados[slot];
    if (selecionado && typeof selecionado === "object") {
      const item = objeto(selecionado);
      equipamentos[slot] = {
        id: inteiro(item["id"], "ID do equipamento", 1, 2_147_483_647),
        nome: texto(item["nome"], "Equipamento", 1, 160),
      };
    } else {
      const nome = textoOpcional(selecionado, "Equipamento", 1, 100);
      if (nome) equipamentos[slot] = nome;
    }
  }
  return {
    equipamentos,
    nome: nomePersonagem(b["nome"], "Nickname"),
    classeId: uuid(b["classeId"], "Classe"),
    nivelBase: inteiro(b["nivelBase"], "Nível base", 1, 250),
    build: textoOpcional(b["build"], "Build", 1, 500) ?? null,
  };
}

/** US-08: reivindicação do vínculo Discord ↔ jogador e fila de aprovação dos admins (D12). */
@Controller("vinculo")
export class VinculoController {
  constructor(
    private readonly vinculo: VinculoService,
    private readonly buildSimulador: BuildSimuladorService,
  ) {}

  @Get()
  minhaSituacao(@UsuarioAtual() usuario: Usuario) {
    return this.vinculo.minhaSituacao(usuario);
  }

  @Get("jogadores-disponiveis")
  jogadoresDisponiveis() {
    return this.vinculo.jogadoresDisponiveis();
  }

  @Get("classes")
  classes() {
    return this.vinculo.classes();
  }

  /** D55: lê um link do simulador de dano e devolve classe, nível e equipamentos para preencher a ficha. */
  @Post("build-simulador")
  @HttpCode(200)
  importarBuild(@Body() corpo: unknown) {
    return this.buildSimulador.importar(texto(objeto(corpo)["link"], "Link do simulador", 1, 65_536));
  }

  @Post("personagens")
  adicionar(@Body() corpo: unknown, @UsuarioAtual() usuario: Usuario) {
    return this.vinculo.salvarFicha(usuario, lerFicha(corpo));
  }

  @Patch("personagens/:id")
  editar(@Param("id") id: string, @Body() corpo: unknown, @UsuarioAtual() usuario: Usuario) {
    return this.vinculo.salvarFicha(usuario, lerFicha(corpo), uuid(id, "Personagem"));
  }

  @Post("solicitacoes")
  solicitar(@Body() corpo: unknown, @UsuarioAtual() usuario: Usuario) {
    const b = objeto(corpo);
    const jogadorId =
      b["jogadorId"] === undefined || b["jogadorId"] === null ? undefined : uuid(b["jogadorId"], "jogadorId");
    const apelidoProposto =
      b["apelidoProposto"] === undefined || b["apelidoProposto"] === null || b["apelidoProposto"] === ""
        ? undefined
        : apelidoJogador(b["apelidoProposto"]);
    const entrada = b["fichas"];
    if (entrada !== undefined && (!Array.isArray(entrada) || entrada.length > 10)) {
      throw new BadRequestException("Informe uma lista com até 10 fichas de personagem.");
    }
    const fichas = Array.isArray(entrada) ? entrada.map(lerFicha) : undefined;
    const personagensNovos = listaPersonagens(
      fichas ? fichas.map((ficha) => ficha.nome) : b["personagensNovos"],
      10,
    );
    return this.vinculo.solicitar(usuario, {
      ...(jogadorId === undefined ? {} : { jogadorId }),
      ...(apelidoProposto === undefined ? {} : { apelidoProposto }),
      personagensNovos,
      ...(fichas === undefined ? {} : { fichas }),
    });
  }

  @Post("solicitacoes/:id/personagens")
  salvarPendente(@Param("id") id: string, @Body() corpo: unknown, @UsuarioAtual() usuario: Usuario) {
    const b = objeto(corpo);
    const nomeAnterior =
      b["nomeAnterior"] === undefined ? undefined : nomePersonagem(b["nomeAnterior"], "Nickname anterior");
    return this.vinculo.salvarFichaPendente(
      usuario,
      uuid(id, "Solicitacao"),
      lerFicha(b["ficha"]),
      nomeAnterior,
    );
  }

  @Get("solicitacoes")
  @Papeis("ADMIN")
  listar(@Query("status") status: unknown) {
    if (status !== undefined && !STATUS.includes(status as StatusSolicitacao)) {
      throw new BadRequestException("status inválido.");
    }
    return this.vinculo.listar(status as StatusSolicitacao | undefined);
  }

  @Post("solicitacoes/:id/aprovar")
  @Papeis("ADMIN")
  @HttpCode(200)
  aprovar(@Param("id") id: string, @UsuarioAtual() admin: Usuario) {
    return this.vinculo.aprovar(uuid(id, "id"), admin);
  }

  @Post("solicitacoes/:id/rejeitar")
  @Papeis("ADMIN")
  @HttpCode(200)
  rejeitar(@Param("id") id: string, @Body() corpo: unknown, @UsuarioAtual() admin: Usuario) {
    const motivo = texto(objeto(corpo)["motivo"], "Motivo", 3, 500);
    return this.vinculo.rejeitar(uuid(id, "id"), motivo, admin);
  }
}
