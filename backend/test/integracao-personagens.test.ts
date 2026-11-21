// Rotas /api/integracao/personagens: cadastro aprovado de personagens, lido pelo nag4eyes.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type Contexto, criarApp, TOKEN_INTEGRACAO } from "./suporte/app-de-teste.js";

describe("Integração: personagens aprovados", () => {
  let ctx: Contexto;
  let desligada: Contexto;
  let mago: { id: string; nomeOficial: string };
  let cardeal: { id: string; nomeOficial: string };

  const get = (url: string) => ctx.http().get(url).set("Authorization", `Bearer ${TOKEN_INTEGRACAO}`);

  /** Cria usuário, jogador (vinculado ou não) e personagens direto no banco. */
  async function membro(
    discordId: string,
    personagens: { nome: string; classeId?: string | null; ativo?: boolean; nivelBase?: number }[],
    opcoes: { ativo?: boolean; vinculado?: boolean } = {},
  ) {
    const usuario = await ctx.prisma.usuario.create({
      data: { discordId, discordUsername: `u${discordId}`, ativo: opcoes.ativo ?? true },
    });
    const jogador = await ctx.prisma.jogador.create({
      data: { apelido: `J${discordId}`, usuarioId: opcoes.vinculado === false ? null : usuario.id },
    });
    for (const p of personagens) {
      await ctx.prisma.personagem.create({
        data: {
          jogadorId: jogador.id,
          nome: p.nome,
          classeId: p.classeId ?? null,
          ativo: p.ativo ?? true,
          nivelBase: p.nivelBase ?? null,
          build: "build secreta",
          equipamentos: { arma: "Espada" },
        },
      });
    }
    return { usuario, jogador };
  }

  beforeAll(async () => {
    ctx = await criarApp({ tokenIntegracao: TOKEN_INTEGRACAO });
    desligada = await criarApp();
  });
  afterAll(async () => {
    await ctx.fechar();
    await desligada.fechar();
  });
  beforeEach(async () => {
    await ctx.limparBanco();
    mago = await ctx.prisma.classe.create({
      data: { nomeOficial: "Magus" },
      select: { id: true, nomeOficial: true },
    });
    cardeal = await ctx.prisma.classe.create({
      data: { nomeOficial: "Cardeal" },
      select: { id: true, nomeOficial: true },
    });
  });

  it("lista só membros ativos com vínculo aprovado e só personagens ativos, sem a ficha", async () => {
    await membro("300", [
      { nome: "Aria", classeId: mago.id, nivelBase: 250 },
      { nome: "Velha", classeId: mago.id, ativo: false },
      { nome: "Sem Classe" },
    ]);
    await membro("100", [{ nome: "Bento", classeId: cardeal.id }]);
    await membro("200", [{ nome: "Inativo", classeId: mago.id }], { ativo: false });
    await membro("400", [{ nome: "Pendente", classeId: mago.id }], { vinculado: false });
    await membro("500", []);
    const pedinte = await ctx.prisma.usuario.create({
      data: { discordId: "600", discordUsername: "pedinte" },
    });
    await ctx.prisma.solicitacaoVinculo.create({
      data: { usuarioId: pedinte.id, apelidoProposto: "Novo", personagens: { novos: ["Novo"] } },
    });

    const r = await get("/api/integracao/personagens").expect(200);

    expect(r.body.proximo).toBeNull();
    expect(r.body.membros.map((m: { discordId: string }) => m.discordId)).toEqual(["100", "300", "500"]);
    const ana = r.body.membros[1];
    expect(ana.personagens.map((p: { nome: string }) => p.nome)).toEqual(["Aria", "Sem Classe"]);
    expect(ana.personagens[0]).toEqual({
      id: expect.any(String),
      nome: "Aria",
      classe: { id: mago.id, nomeOficial: "Magus" },
      nivelBase: 250,
      versao: expect.stringMatching(/^[0-9a-f]{16}$/),
    });
    expect(ana.personagens[1]).toMatchObject({ nome: "Sem Classe", classe: null, nivelBase: null });
    expect(r.body.membros[2]).toEqual({ discordId: "500", personagens: [] });
  });

  it("pagina por discordId com limite e cursor `apos`", async () => {
    for (const id of ["101", "102", "103"]) await membro(id, [{ nome: `P${id}`, classeId: mago.id }]);

    const primeira = await get("/api/integracao/personagens?limite=2").expect(200);
    expect(primeira.body.membros.map((m: { discordId: string }) => m.discordId)).toEqual(["101", "102"]);
    expect(primeira.body.proximo).toBe("102");

    const segunda = await get("/api/integracao/personagens?limite=2&apos=102").expect(200);
    expect(segunda.body.membros.map((m: { discordId: string }) => m.discordId)).toEqual(["103"]);
    expect(segunda.body.proximo).toBeNull();
  });

  it("devolve um membro pelo id do Discord, ou vinculado=false quando ele não conta", async () => {
    await membro("700", [{ nome: "Cora", classeId: cardeal.id }]);
    await membro("701", [{ nome: "Dora", classeId: cardeal.id }], { ativo: false });
    await membro("702", [{ nome: "Eva", classeId: cardeal.id }], { vinculado: false });

    const r = await get("/api/integracao/personagens/700").expect(200);
    expect(r.body).toMatchObject({ discordId: "700", vinculado: true });
    expect(r.body.personagens).toEqual([expect.objectContaining({ nome: "Cora" })]);

    for (const id of ["701", "702", "999"]) {
      const fora = await get(`/api/integracao/personagens/${id}`).expect(200);
      expect(fora.body).toEqual({ discordId: id, vinculado: false, personagens: [] });
    }
  });

  it("a versão muda com nome, classe ou nível, e não com a ficha", async () => {
    await membro("800", [{ nome: "Fio", classeId: mago.id, nivelBase: 200 }]);
    const versao = async () =>
      (await get("/api/integracao/personagens/800").expect(200)).body.personagens[0].versao;
    const p = await ctx.prisma.personagem.findFirstOrThrow({ where: { nome: "Fio" } });

    const inicial = await versao();
    await ctx.prisma.personagem.update({ where: { id: p.id }, data: { build: "outra", equipamentos: {} } });
    expect(await versao()).toBe(inicial);

    await ctx.prisma.personagem.update({ where: { id: p.id }, data: { nivelBase: 201 } });
    const nivel = await versao();
    expect(nivel).not.toBe(inicial);

    await ctx.prisma.personagem.update({ where: { id: p.id }, data: { classeId: cardeal.id } });
    const classe = await versao();
    expect(classe).not.toBe(nivel);

    await ctx.prisma.personagem.update({ where: { id: p.id }, data: { nome: "Fia" } });
    expect(await versao()).not.toBe(classe);
  });

  it("valida limite, cursor e id do Discord (400)", async () => {
    for (const q of ["limite=0", "limite=201", "limite=abc", "limite=1.5", "apos=abc"]) {
      await get(`/api/integracao/personagens?${q}`).expect(400);
    }
    await get("/api/integracao/personagens/abc").expect(400);
    await get("/api/integracao/personagens?limite=200").expect(200);
  });

  it("exige o token de serviço e fica desligada sem INTEGRACAO_TOKEN", async () => {
    await ctx.http().get("/api/integracao/personagens").expect(401);
    await ctx.http().get("/api/integracao/personagens/1").set("Authorization", "Bearer errado").expect(401);
    const cookie = await ctx.login("700000000000000007");
    await ctx.http().get("/api/integracao/personagens").set("Cookie", cookie).expect(401);
    await desligada
      .http()
      .get("/api/integracao/personagens")
      .set("Authorization", `Bearer ${TOKEN_INTEGRACAO}`)
      .expect(503);
  });

  it("não aceita escrita: nenhuma rota de integração altera personagens", async () => {
    await membro("900", [{ nome: "Gil", classeId: mago.id }]);
    const auth = { Authorization: `Bearer ${TOKEN_INTEGRACAO}` };
    await ctx.http().post("/api/integracao/personagens").set(auth).send({ nome: "X" }).expect(404);
    await ctx.http().patch("/api/integracao/personagens/900").set(auth).send({ nome: "X" }).expect(404);
    expect(await ctx.prisma.personagem.count()).toBe(1);
  });
});
