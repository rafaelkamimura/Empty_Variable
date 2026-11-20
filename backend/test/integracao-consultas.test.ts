// Consultas somente leitura do bot (/saldo, /extrato, /loja) por Discord ID, com o token de integração.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SeedService } from "../src/cadastros/seed.service.js";
import {
  ADMIN_DISCORD_ID,
  type Contexto,
  criarApp,
  ORIGEM,
  TOKEN_INTEGRACAO,
} from "./suporte/app-de-teste.js";

const LINKS = {
  carteira: `${ORIGEM}/carteira`,
  loja: `${ORIGEM}/loja`,
  vinculo: `${ORIGEM}/vinculo`,
};

describe("Integração: consultas do bot", () => {
  let ctx: Contexto;
  let subRota: Contexto;
  let adminId: string;

  const integracao = (url: string, app: Contexto = ctx) =>
    app.http().get(url).set("Authorization", `Bearer ${TOKEN_INTEGRACAO}`);

  async function membro(discordId: string, apelido: string): Promise<[string, string]> {
    const cookie = await ctx.login(discordId, apelido.toLowerCase());
    const u = await ctx.prisma.usuario.findUniqueOrThrow({ where: { discordId } });
    const j = await ctx.prisma.jogador.create({ data: { apelido, usuarioId: u.id } });
    return [cookie, j.id];
  }
  async function creditar(jogadorId: string, valor: number, observacao = "teste", criadoEm?: Date) {
    await ctx.prisma.lancamentoPontos.create({
      data: { jogadorId, valor, tipo: "AJUSTE_ADMIN", criadoPorId: adminId, observacao, criadoEm },
    });
  }

  beforeAll(async () => {
    ctx = await criarApp({ tokenIntegracao: TOKEN_INTEGRACAO });
    subRota = await criarApp({ tokenIntegracao: TOKEN_INTEGRACAO, caminhoBase: "/emptyvariable" });
  });
  afterAll(async () => {
    await ctx.fechar();
    await subRota.fechar();
  });
  beforeEach(async () => {
    await ctx.limparBanco();
    await ctx.app.get(SeedService).aplicar();
    await ctx.login(ADMIN_DISCORD_ID, "admin");
    adminId = (await ctx.prisma.usuario.findUniqueOrThrow({ where: { discordId: ADMIN_DISCORD_ID } })).id;
  });

  describe("situação do membro", () => {
    it("Discord ID que nunca entrou no site → desconhecido, com os links", async () => {
      for (const rota of ["saldo", "extrato"]) {
        const r = await integracao(`/api/integracao/membros/900000000000000009/${rota}`).expect(200);
        expect(r.body).toEqual({ situacao: "desconhecido", links: LINKS });
      }
    });

    it("entrou mas sem vínculo aprovado → sem_vinculo, dizendo se há solicitação pendente", async () => {
      await ctx.login("7101", "novato");
      const semPedido = await integracao("/api/integracao/membros/7101/saldo").expect(200);
      expect(semPedido.body).toEqual({ situacao: "sem_vinculo", solicitacaoPendente: false, links: LINKS });

      const u = await ctx.prisma.usuario.findUniqueOrThrow({ where: { discordId: "7101" } });
      await ctx.prisma.solicitacaoVinculo.create({
        data: { usuarioId: u.id, apelidoProposto: "Novato", personagens: { novos: [] } },
      });
      const comPedido = await integracao("/api/integracao/membros/7101/extrato").expect(200);
      expect(comPedido.body).toEqual({ situacao: "sem_vinculo", solicitacaoPendente: true, links: LINKS });
    });

    it("usuário desativado → inativo, mesmo com jogador e saldo", async () => {
      const [, jogador] = await membro("7102", "Inativa");
      await creditar(jogador, 50);
      await ctx.prisma.usuario.update({ where: { discordId: "7102" }, data: { ativo: false } });
      for (const rota of ["saldo", "extrato"]) {
        const r = await integracao(`/api/integracao/membros/7102/${rota}`).expect(200);
        expect(r.body).toEqual({ situacao: "inativo", links: LINKS });
      }
    });

    it("Discord ID que não é número → 400", async () => {
      await integracao("/api/integracao/membros/abc/saldo").expect(400);
      await integracao("/api/integracao/membros/12a/extrato").expect(400);
    });
  });

  describe("saldo e extrato", () => {
    it("saldo igual ao do site", async () => {
      const [cookie, jogador] = await membro("7201", "Ana");
      await creditar(jogador, 300);
      await creditar(jogador, -40);
      const site = await ctx.http().get("/api/saldo/me").set("Cookie", cookie).expect(200);
      const r = await integracao("/api/integracao/membros/7201/saldo").expect(200);
      expect(r.body).toEqual({
        situacao: "vinculado",
        jogador: { apelido: "Ana" },
        saldo: 260,
        links: LINKS,
      });
      expect(r.body.saldo).toBe(site.body.saldo);
    });

    it("extrato: mais recentes primeiro, limitado, com tipo, valor assinado e detalhe", async () => {
      const [ana, jogadorAna] = await membro("7301", "Ana");
      const [, jogadorBia] = await membro("7302", "Bia");
      await creditar(jogadorAna, 100, "bônus de evento", new Date(Date.now() - 3_600_000));
      await ctx
        .http()
        .post("/api/carteira/transferencias")
        .set("Cookie", ana)
        .set("Origin", ORIGEM)
        .send({ id: randomUUID(), destinatarioId: jogadorBia, pontos: 30 })
        .expect(201);

      const r = await integracao("/api/integracao/membros/7301/extrato").expect(200);
      expect(r.body).toMatchObject({
        situacao: "vinculado",
        jogador: { apelido: "Ana" },
        saldo: 70,
        total: 2,
      });
      expect(r.body.links).toEqual(LINKS);
      expect(r.body.lancamentos).toEqual([
        expect.objectContaining({ tipo: "TRANSFERENCIA_ENVIADA", valor: -30, detalhe: "Bia" }),
        expect.objectContaining({ tipo: "AJUSTE_ADMIN", valor: 100, detalhe: "bônus de evento" }),
      ]);
      expect(Number.isNaN(Date.parse(r.body.lancamentos[0].criadoEm as string))).toBe(false);

      const site = await ctx.http().get("/api/extrato/me").set("Cookie", ana).expect(200);
      expect((r.body.lancamentos as { id: string }[]).map((l) => l.id)).toEqual(
        (site.body.lancamentos as { id: string }[]).map((l) => l.id),
      );

      const bia = await integracao("/api/integracao/membros/7302/extrato").expect(200);
      expect(bia.body.lancamentos).toEqual([
        expect.objectContaining({ tipo: "TRANSFERENCIA_RECEBIDA", valor: 30, detalhe: "Ana" }),
      ]);
    });

    it("extrato respeita ?limite= e informa o total", async () => {
      const [, jogador] = await membro("7401", "Cai");
      const inicio = Date.parse("2026-11-01T12:00:00Z");
      for (let i = 1; i <= 12; i++) {
        await creditar(jogador, i, `crédito ${i}`, new Date(inicio + i * 60_000));
      }
      const padrao = await integracao("/api/integracao/membros/7401/extrato").expect(200);
      expect(padrao.body.lancamentos).toHaveLength(10);
      expect(padrao.body.total).toBe(12);
      const tres = await integracao("/api/integracao/membros/7401/extrato?limite=3").expect(200);
      expect((tres.body.lancamentos as { detalhe: string }[]).map((l) => l.detalhe)).toEqual([
        "crédito 12",
        "crédito 11",
        "crédito 10",
      ]);
      await integracao("/api/integracao/membros/7401/extrato?limite=0").expect(400);
      await integracao("/api/integracao/membros/7401/extrato?limite=26").expect(400);
      await integracao("/api/integracao/membros/7401/extrato?limite=x").expect(400);
    });
  });

  describe("loja", () => {
    it("lista o mesmo que a página /loja do site: nome, preço (ou null) e quantidade", async () => {
      const [cookie] = await membro("7501", "Dani");
      const admin = await ctx.login(ADMIN_DISCORD_ID, "admin");
      const itens = await ctx.prisma.itemCatalogo.findMany({ orderBy: { nome: "asc" }, take: 2 });
      const [comPreco, semPreco] = [itens[0]!, itens[1]!];
      for (const item of itens) {
        await ctx.prisma.itemCatalogo.update({
          where: { id: item.id },
          data: { ativo: true, negociavel: true, vinculadoConta: false },
        });
      }
      const enviar = (url: string, corpo: object) =>
        ctx.http().post(url).set("Cookie", admin).set("Origin", ORIGEM).send(corpo);
      await enviar("/api/loja/precos", { itemId: comPreco.id, precoPontos: 150 }).expect(201);
      await enviar("/api/estoque/entradas", { itemId: comPreco.id, quantidade: 4 }).expect(201);
      await enviar("/api/estoque/entradas", { itemId: semPreco.id, quantidade: 2 }).expect(201);

      const r = await integracao("/api/integracao/loja").expect(200);
      expect(r.body).toEqual({
        itens: [
          { itemId: comPreco.id, nome: comPreco.nome, preco: 150, quantidade: 4 },
          { itemId: semPreco.id, nome: semPreco.nome, preco: null, quantidade: 2 },
        ],
        total: 2,
        links: LINKS,
      });
      const site = await ctx.http().get("/api/loja/catalogo").set("Cookie", cookie).expect(200);
      expect((site.body as { itemId: string }[]).map((i) => i.itemId)).toEqual([comPreco.id, semPreco.id]);

      const um = await integracao("/api/integracao/loja?limite=1").expect(200);
      expect(um.body.itens).toHaveLength(1);
      expect(um.body.total).toBe(2);
    });

    it("sem nada em estoque → lista vazia", async () => {
      const r = await integracao("/api/integracao/loja").expect(200);
      expect(r.body).toEqual({ itens: [], total: 0, links: LINKS });
    });
  });

  describe("autenticação e configuração", () => {
    it("exige o token de integração; a sessão de um membro não serve", async () => {
      const [cookie] = await membro("7601", "Eva");
      await ctx.http().get("/api/integracao/membros/7601/saldo").expect(401);
      await ctx.http().get("/api/integracao/loja").set("Cookie", cookie).expect(401);
      await ctx
        .http()
        .get("/api/integracao/membros/7601/extrato")
        .set("Authorization", "Bearer x")
        .expect(401);
    });

    it("os links respeitam a sub-rota (APP_BASE_PATH)", async () => {
      const r = await integracao("/api/integracao/membros/7701/saldo", subRota).expect(200);
      expect(r.body.links).toEqual({
        carteira: `${ORIGEM}/emptyvariable/carteira`,
        loja: `${ORIGEM}/emptyvariable/loja`,
        vinculo: `${ORIGEM}/emptyvariable/vinculo`,
      });
    });

    it("sem INTEGRACAO_TOKEN as consultas ficam desligadas (503)", async () => {
      const desligada = await criarApp();
      try {
        await integracao("/api/integracao/membros/7801/saldo", desligada).expect(503);
        await integracao("/api/integracao/loja", desligada).expect(503);
      } finally {
        await desligada.fechar();
      }
    });
  });
});
