// Rotas /api/integracao: token de serviço no lugar da sessão, sem checagem de Origin.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { carregarConfiguracao } from "../src/configuracao.js";
import { type Contexto, criarApp, TOKEN_INTEGRACAO } from "./suporte/app-de-teste.js";

describe("Integração entre sistemas", () => {
  let ctx: Contexto;
  let desligada: Contexto;

  beforeAll(async () => {
    ctx = await criarApp({ tokenIntegracao: TOKEN_INTEGRACAO });
    desligada = await criarApp();
  });
  afterAll(async () => {
    await ctx.fechar();
    await desligada.fechar();
  });

  it("com o token certo responde e informa o servidor do Discord, sem sessão nem Origin", async () => {
    const r = await ctx
      .http()
      .get("/api/integracao/saude")
      .set("Authorization", `Bearer ${TOKEN_INTEGRACAO}`)
      .expect(200);
    expect(r.body).toEqual({ status: "ok", guildId: "guild-1" });
  });

  it("sem token, com token errado ou com outro esquema → 401", async () => {
    await ctx.http().get("/api/integracao/saude").expect(401);
    await ctx.http().get("/api/integracao/saude").set("Authorization", "Bearer errado").expect(401);
    await ctx.http().get("/api/integracao/saude").set("Authorization", TOKEN_INTEGRACAO).expect(401);
  });

  it("uma sessão de usuário não vale nas rotas de integração", async () => {
    const cookie = await ctx.login("700000000000000007");
    await ctx.http().get("/api/integracao/saude").set("Cookie", cookie).expect(401);
  });

  it("o token de integração não abre as rotas de usuário", async () => {
    await ctx.http().get("/api/auth/me").set("Authorization", `Bearer ${TOKEN_INTEGRACAO}`).expect(401);
  });

  it("sem INTEGRACAO_TOKEN configurado a integração fica desligada (503)", async () => {
    await desligada
      .http()
      .get("/api/integracao/saude")
      .set("Authorization", `Bearer ${TOKEN_INTEGRACAO}`)
      .expect(503);
  });

  it("INTEGRACAO_TOKEN curto é recusado na subida; vazio desliga", () => {
    const base = { APP_ORIGIN: "https://betel.exemplo.com", SESSION_SECRET: "x".repeat(48) };
    expect(carregarConfiguracao(base).tokenIntegracao).toBeNull();
    expect(carregarConfiguracao({ ...base, INTEGRACAO_TOKEN: TOKEN_INTEGRACAO }).tokenIntegracao).toBe(
      TOKEN_INTEGRACAO,
    );
    expect(() => carregarConfiguracao({ ...base, INTEGRACAO_TOKEN: "curto" })).toThrow(/INTEGRACAO_TOKEN/);
  });
});
