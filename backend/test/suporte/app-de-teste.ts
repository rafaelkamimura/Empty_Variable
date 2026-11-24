import "reflect-metadata";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { inject } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { DISCORD_CLIENTE, type DiscordCliente, type PerfilDiscord } from "../../src/auth/discord.cliente.js";
import { CONFIGURACAO, type Configuracao } from "../../src/configuracao.js";
import { configurarApp } from "../../src/configurar-app.js";
import { PrismaService } from "../../src/prisma/prisma.service.js";
import { BUSCADOR_IMAGEM } from "../../src/imagens/imagens.service.js";
import { BUSCADOR_DIVINE_PRIDE } from "../../src/farm/divine-pride.service.js";
import { BUSCADOR_LINK_CURTO } from "../../src/jogadores/build-simulador.js";

process.env["DATABASE_URL"] = inject("databaseUrl");

export const ORIGEM = "http://betel.test";
export const ADMIN_DISCORD_ID = "100000000000000001";

export const CONFIG_TESTE: Configuracao = {
  appOrigin: ORIGEM,
  caminhoBase: "",
  sessionSecret: "segredo-de-teste-com-pelo-menos-32-caracteres",
  cookieSecure: true,
  adminDiscordIds: new Set([ADMIN_DISCORD_ID]),
  discord: {
    clientId: "cid",
    clientSecret: "csecret",
    guildId: "guild-1",
    redirectUri: `${ORIGEM}/api/auth/discord/callback`,
  },
  devLogin: false,
  tokenIntegracao: null,
  guildId: "guild-1",
  divinePride: null,
  // D63: cada execução dos testes grava os relatórios numa pasta temporária própria.
  datamineDir: mkdtempSync(join(tmpdir(), "betel-datamine-")),
};

/** Token de serviço usado nos testes das rotas /api/integracao. */
export const TOKEN_INTEGRACAO = "token-de-integracao-de-teste-com-32-caracteres";

/** Dublê do Discord: cada `code` mapeia para um perfil; `naoMembros` simula o 404 da consulta de membro. */
export class DiscordFalso implements DiscordCliente {
  perfis = new Map<string, PerfilDiscord>();
  naoMembros = new Set<string>();
  revogados: string[] = [];

  urlAutorizacao(state: string): string {
    return `https://discord.test/authorize?state=${state}`;
  }
  async trocarCodigo(code: string): Promise<string> {
    if (!this.perfis.has(code)) throw new Error("código inválido");
    return `token-${code}`;
  }
  async obterPerfil(token: string): Promise<PerfilDiscord> {
    return this.perfis.get(token.replace(/^token-/, ""))!;
  }
  async ehMembroDoServidor(token: string): Promise<boolean> {
    return !this.naoMembros.has(token.replace(/^token-/, ""));
  }
  async revogar(token: string): Promise<void> {
    this.revogados.push(token);
  }
}

/**
 * Dublê da Divine Pride (D41): os testes nunca saem para a internet. Cada chamada fica registrada;
 * a resposta vem de `respostas` (por URL) e, sem resposta configurada, é 404.
 */
export class BuscadorImagemFalso {
  readonly chamadas: string[] = [];
  readonly respostas = new Map<string, { status: number; tipo?: string; corpo?: Uint8Array } | "falha">();

  readonly buscar = async (url: string) => {
    this.chamadas.push(url);
    const r = this.respostas.get(url) ?? { status: 404 };
    if (r === "falha") throw new Error("rede indisponível");
    return {
      status: r.status,
      headers: { get: (nome: string) => (nome.toLowerCase() === "content-type" ? (r.tipo ?? null) : null) },
      arrayBuffer: async () => {
        const corpo = r.corpo ?? new Uint8Array();
        return corpo.buffer.slice(corpo.byteOffset, corpo.byteOffset + corpo.byteLength) as ArrayBuffer;
      },
    };
  };
}

/** Dublê da API da Divine Pride (D53): respostas por ID; sem resposta configurada, 404. */
export class DivinePrideFalso {
  readonly chamadas: string[] = [];
  readonly servidores: (string | undefined)[] = [];
  readonly respostas = new Map<number, { status: number; corpo?: unknown } | "falha">();
  /** D57: respostas de `/Monster/{id}`, por ID. */
  readonly monstros = new Map<number, { status: number; corpo?: unknown } | "falha">();

  readonly buscar = async (url: string, init?: RequestInit) => {
    this.chamadas.push(url);
    this.servidores.push((init?.headers as Record<string, string> | undefined)?.["x-server"]);
    const monstro = /\/Monster\/(\d+)/.exec(url)?.[1];
    const id = Number(/\/Item\/(\d+)/.exec(url)?.[1]);
    const configurada = monstro === undefined ? this.respostas.get(id) : this.monstros.get(Number(monstro));
    const r: { status: number; corpo?: unknown } | "falha" = configurada ?? { status: 404 };
    if (r === "falha") throw new Error("rede indisponível");
    return { status: r.status, json: async () => r.corpo ?? null };
  };
}

/** Dublê do encurtador do simulador (D55): destino por slug; sem destino configurado, 404. */
export class EncurtadorFalso {
  readonly chamadas: string[] = [];
  readonly destinos = new Map<string, string | "falha">();

  readonly buscar = async (url: string) => {
    this.chamadas.push(url);
    const destino = this.destinos.get(url.split("/").pop() ?? "");
    if (destino === "falha") throw new Error("rede indisponível");
    return destino === undefined
      ? { status: 404, json: async () => null }
      : { status: 200, json: async () => ({ url: destino }) };
  };
}

export interface Contexto {
  app: INestApplication;
  prisma: PrismaService;
  discord: DiscordFalso;
  imagens: BuscadorImagemFalso;
  divinePride: DivinePrideFalso;
  encurtador: EncurtadorFalso;
  http: () => ReturnType<typeof request>;
  /** Faz o fluxo OAuth completo com o dublê e devolve o cookie de sessão. */
  login: (discordId: string, username?: string) => Promise<string>;
  limparBanco: () => Promise<void>;
  fechar: () => Promise<void>;
}

export async function criarApp(config: Partial<Configuracao> = {}): Promise<Contexto> {
  const discord = new DiscordFalso();
  const imagens = new BuscadorImagemFalso();
  const divinePride = new DivinePrideFalso();
  const encurtador = new EncurtadorFalso();
  const modulo = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(BUSCADOR_IMAGEM)
    .useValue(imagens.buscar)
    .overrideProvider(BUSCADOR_DIVINE_PRIDE)
    .useValue(divinePride.buscar)
    .overrideProvider(BUSCADOR_LINK_CURTO)
    .useValue(encurtador.buscar)
    .overrideProvider(CONFIGURACAO)
    .useValue({ ...CONFIG_TESTE, ...config })
    .overrideProvider(DISCORD_CLIENTE)
    .useValue(discord)
    .compile();
  const app = modulo.createNestApplication({ logger: false });
  configurarApp(app);
  await app.init();
  const prisma = app.get(PrismaService);
  const http = () => request(app.getHttpServer());

  async function login(discordId: string, username = `user${discordId.slice(-4)}`): Promise<string> {
    const code = `code-${discordId}`;
    discord.perfis.set(code, { id: discordId, username, globalName: null, avatar: null });
    const inicio = await http().get("/api/auth/discord").expect(302);
    const state = new URL(inicio.headers["location"] as string).searchParams.get("state")!;
    const cookieState = cookiesDe(inicio).find((c) => c.startsWith("betel_oauth_state="))!;
    const fim = await http()
      .get(`/api/auth/discord/callback?code=${code}&state=${state}`)
      .set("Cookie", cookieState)
      .expect(302);
    const sessao = cookiesDe(fim).find((c) => c.startsWith("betel_sessao="));
    if (sessao === undefined) throw new Error(`Login falhou: ${String(fim.headers["location"])}`);
    return sessao.split(";")[0]!;
  }

  async function limparBanco(): Promise<void> {
    // O ledger bloqueia TRUNCATE por trigger; nos testes o desligamos só nesta sessão (requer superusuário).
    await prisma.$transaction([
      prisma.$executeRawUnsafe("SET LOCAL session_replication_role = replica"),
      prisma.$executeRawUnsafe(
        `TRUNCATE patch_cliente, chefe_instancia, monstro, farm_checkin_drop, farm_checkin, farm_instancia_drop, farm_instancia_personagem, farm_instancia, farm_item, nome_item_divine_pride, notificacao, rascunho_run_participante, rascunho_run, transferencia_pontos, imagem_cache, receita_peca, receita_componente, preco_receita, solicitacao_nebula, receita,
         movimento_estoque, compra_lote, compra, lote_estoque, oferta_venda, preco_item, config_loja,
         lancamento_pontos, emprestimo, drop_run, participacao, run, config_pontuacao, funcao_classe, encontro, versao_instancia, instancia, classe,
         item_catalogo, solicitacao_vinculo, personagem, jogador, sessao, auditoria, usuario CASCADE`,
      ),
    ]);
  }

  return {
    app,
    prisma,
    discord,
    imagens,
    divinePride,
    encurtador,
    http,
    login,
    limparBanco,
    fechar: () => app.close(),
  };
}

export function cookiesDe(res: { headers: Record<string, unknown> }): string[] {
  const c = res.headers["set-cookie"];
  return Array.isArray(c) ? (c as string[]) : typeof c === "string" ? [c] : [];
}
