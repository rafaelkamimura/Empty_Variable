// Rascunhos de run vindos do nag4eyes: recebimento idempotente pela integração, casamento pelo
// Discord id, revisão pela gestão e confirmação pelo registro normal de runs.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SeedService } from "../src/cadastros/seed.service.js";
import {
  ADMIN_DISCORD_ID,
  type Contexto,
  criarApp,
  ORIGEM,
  TOKEN_INTEGRACAO,
} from "./suporte/app-de-teste.js";

const ANA = "200000000000000001";
const BETO = "200000000000000002";
const SEM_VINCULO = "200000000000000003";
const DESCONHECIDO = "200000000000000004";
const MEMBRO = "200000000000000005";

interface Detalhe {
  id: string;
  status: string;
  runId: string | null;
  data: string;
  instancia: { id: string; nome: string } | null;
  participantes: {
    ordem: number;
    discordId: string;
    personagemNome: string;
    classeNome: string | null;
    pendencia: string | null;
    personagem: { id: string; nome: string } | null;
    jogador: { id: string; apelido: string } | null;
    classe: { id: string; nomeOficial: string } | null;
  }[];
}

describe("Rascunhos de run do nag4eyes", () => {
  let ctx: Contexto;
  let desligada: Contexto;
  let admin: string;
  let membro: string;
  let torreId: string;
  let encontroNaght: string;
  const personagem: Record<string, string> = {};
  const classe: Record<string, string> = {};

  const integracao = (corpo: object) =>
    ctx
      .http()
      .post("/api/integracao/rascunhos-run")
      .set("Authorization", `Bearer ${TOKEN_INTEGRACAO}`)
      .send(corpo);
  const post = (url: string, corpo: object = {}, cookie = admin) =>
    ctx.http().post(url).set("Cookie", cookie).set("Origin", ORIGEM).send(corpo);
  const get = (url: string, cookie = admin) => ctx.http().get(url).set("Cookie", cookie);

  /** Rascunho como o nag4eyes envia: Ana (Cardeal), Beto (Falcão do Vento) e quem não casa. */
  function rascunho(o: { idOrigem?: string; participantes?: object[]; instancia?: object | null } = {}) {
    return {
      idOrigem: o.idOrigem ?? "party:42",
      partyId: "42",
      guildId: "1",
      data: "2026-11-20",
      instancia:
        o.instancia === undefined
          ? { nome: "Torre da Constelação", nomeIngles: "Constellation Tower", slug: "torre-da-constelacao" }
          : o.instancia,
      participantes: o.participantes ?? [
        {
          discordId: ANA,
          personagem: "ana-cardeal",
          classe: { nome: "Cardeal", nomeIngles: "Cardinal", slug: "cardinal" },
        },
        {
          discordId: BETO,
          personagem: "Beto-Falcao",
          classe: { nome: "Falcão do Vento", nomeIngles: "Windhawk", slug: "windhawk" },
        },
        { discordId: SEM_VINCULO, personagem: "Solto", classe: { nome: "Cardeal" } },
        { discordId: DESCONHECIDO, personagem: "Ninguem", classe: { nome: "Classe Inventada" } },
        { discordId: ANA, personagem: "Ana-Outro", classe: { nome: "Cardeal" } },
      ],
    };
  }

  beforeAll(async () => {
    ctx = await criarApp({ tokenIntegracao: TOKEN_INTEGRACAO, guildId: "1" });
    desligada = await criarApp({ guildId: "1" });
  });
  afterAll(async () => {
    await ctx.fechar();
    await desligada.fechar();
  });

  beforeEach(async () => {
    await ctx.limparBanco();
    await ctx.app.get(SeedService).aplicar();
    admin = await ctx.login(ADMIN_DISCORD_ID, "admin");
    membro = await ctx.login(MEMBRO, "membro");
    for (const c of await ctx.prisma.classe.findMany()) classe[c.nomeOficial] = c.id;
    for (const [discordId, apelido, nomes] of [
      [ANA, "Ana", ["Ana-Cardeal", "Ana-MTK"]],
      [BETO, "Beto", ["Beto-Falcao"]],
    ] as const) {
      await ctx.login(discordId, apelido.toLowerCase());
      const usuario = await ctx.prisma.usuario.findUniqueOrThrow({ where: { discordId } });
      const j = await ctx.prisma.jogador.create({
        data: { apelido, usuarioId: usuario.id, personagens: { create: nomes.map((nome) => ({ nome })) } },
        include: { personagens: true },
      });
      for (const p of j.personagens) personagem[p.nome] = p.id;
    }
    await ctx.login(SEM_VINCULO, "solto");
    const torre = await ctx.prisma.instancia.findUniqueOrThrow({
      where: { codigo: "TORRE_CONSTELACAO" },
      include: { versoes: { include: { encontros: true } } },
    });
    torreId = torre.id;
    encontroNaght = torre.versoes[0]!.encontros.find((e) => e.codigo === "NAGHT_25")!.id;
  });

  describe("recebimento pela integração", () => {
    it("cria o rascunho com quem casou resolvido e quem não casou como pendência, sem pontuar", async () => {
      const r = await integracao(rascunho()).expect(201);
      expect(r.body).toMatchObject({ criado: true, status: "PENDENTE", participantes: 5, pendentes: 3 });

      const d = (await get(`/api/rascunhos-run/${r.body.id}`).expect(200)).body as Detalhe;
      expect(d.instancia).toEqual({ id: torreId, nome: "Torre da Constelação" });
      expect(d.data.slice(0, 10)).toBe("2026-11-20");
      expect(
        d.participantes.map((p) => [
          p.personagemNome,
          p.personagem?.id ?? null,
          p.classe?.nomeOficial ?? null,
          p.pendencia,
        ]),
      ).toEqual([
        ["ana-cardeal", personagem["Ana-Cardeal"], "Cardeal", null],
        ["Beto-Falcao", personagem["Beto-Falcao"], "Falcão dos Ventos", null],
        ["Solto", null, "Cardeal", "SEM_VINCULO"],
        ["Ninguem", null, null, "USUARIO_DESCONHECIDO"],
        ["Ana-Outro", null, "Cardeal", "PERSONAGEM_NAO_ENCONTRADO"],
      ]);
      expect(d.participantes[4]!.jogador?.apelido).toBe("Ana");
      expect(await ctx.prisma.run.count()).toBe(0);
      expect(await ctx.prisma.lancamentoPontos.count()).toBe(0);
    });

    it("é idempotente: o reenvio do mesmo idOrigem devolve o mesmo rascunho (200) e não cria outro", async () => {
      const primeiro = (await integracao(rascunho()).expect(201)).body as { id: string };
      const segundo = await integracao(
        rascunho({ participantes: [{ discordId: ANA, personagem: "Ana-MTK" }] }),
      ).expect(200);
      expect(segundo.body).toMatchObject({ id: primeiro.id, criado: false, participantes: 5 });
      expect(await ctx.prisma.rascunhoRun.count()).toBe(1);
      await integracao(rascunho({ idOrigem: "party:42:instance:7" })).expect(201);
      expect(await ctx.prisma.rascunhoRun.count()).toBe(2);
    });

    it("envios simultâneos do mesmo idOrigem criam um rascunho só", async () => {
      const respostas = await Promise.all([
        integracao(rascunho()),
        integracao(rascunho()),
        integracao(rascunho()),
      ]);
      expect(respostas.map((r) => r.status).sort()).toEqual([200, 200, 201]);
      expect(new Set(respostas.map((r) => (r.body as { id: string }).id)).size).toBe(1);
      expect(await ctx.prisma.rascunhoRun.count()).toBe(1);
    });

    it("instância e classe que não casam ficam sem resolução, com os dados crus guardados", async () => {
      const r = await integracao(
        rascunho({
          instancia: { nome: "Instância Nova", slug: "instancia-nova" },
          participantes: [
            {
              discordId: ANA,
              personagem: "Ana-MTK",
              classe: { nome: "Classe Inventada", nomeIngles: "Sorcerer" },
            },
          ],
        }),
      ).expect(201);
      const d = (await get(`/api/rascunhos-run/${r.body.id}`).expect(200)).body as Detalhe & {
        instanciaOrigem: object;
      };
      expect(d.instancia).toBeNull();
      expect(d.instanciaOrigem).toEqual({ nome: "Instância Nova", nomeIngles: null, slug: "instancia-nova" });
      // "Sorcerer" é apelido do Elementalista no grupo: o nome em inglês nunca casa com apelidos.
      expect(d.participantes[0]).toMatchObject({
        classe: null,
        pendencia: "CLASSE_NAO_ENCONTRADA",
        classeNome: "Classe Inventada",
      });
    });

    it("sem a classe na origem usa a do cadastro do personagem", async () => {
      await ctx.prisma.personagem.update({
        where: { id: personagem["Ana-MTK"]! },
        data: { classeId: classe["Mestre Celestial"]! },
      });
      const r = await integracao(
        rascunho({ participantes: [{ discordId: ANA, personagem: "Ana-MTK" }] }),
      ).expect(201);
      const d = (await get(`/api/rascunhos-run/${r.body.id}`).expect(200)).body as Detalhe;
      expect(d.participantes[0]).toMatchObject({
        pendencia: null,
        classe: { nomeOficial: "Mestre Celestial" },
      });
    });

    it("recusa outro servidor do Discord (422) e corpo malformado (400)", async () => {
      await integracao({ ...rascunho(), guildId: "999" }).expect(422);
      await integracao({ ...rascunho(), idOrigem: "com espaço" }).expect(400);
      await integracao({ ...rascunho(), data: "20/11/2026" }).expect(400);
      await integracao({ ...rascunho(), participantes: [] }).expect(400);
      await integracao({ ...rascunho(), participantes: [{ discordId: "abc", personagem: "X" }] }).expect(400);
      expect(await ctx.prisma.rascunhoRun.count()).toBe(0);
    });

    it("exige o token de serviço; sessão de usuário não vale; sem INTEGRACAO_TOKEN fica desligada (503)", async () => {
      await ctx.http().post("/api/integracao/rascunhos-run").send(rascunho()).expect(401);
      await ctx
        .http()
        .post("/api/integracao/rascunhos-run")
        .set("Cookie", admin)
        .set("Origin", ORIGEM)
        .send(rascunho())
        .expect(401);
      await desligada
        .http()
        .post("/api/integracao/rascunhos-run")
        .set("Authorization", `Bearer ${TOKEN_INTEGRACAO}`)
        .send(rascunho())
        .expect(503);
    });
  });

  describe("revisão pela gestão", () => {
    it("lista por status; membro comum não vê (403) e o token de integração não abre a gestão", async () => {
      const { id } = (await integracao(rascunho()).expect(201)).body as { id: string };
      const lista = (await get("/api/rascunhos-run?status=PENDENTE").expect(200)).body as {
        id: string;
        pendentes: number;
      }[];
      expect(lista).toMatchObject([{ id, pendentes: 3 }]);
      expect((await get("/api/rascunhos-run?status=CONFIRMADO").expect(200)).body).toEqual([]);
      await get("/api/rascunhos-run?status=OUTRO").expect(400);
      await get("/api/rascunhos-run", membro).expect(403);
      await get(`/api/rascunhos-run/${id}`, membro).expect(403);
      await ctx
        .http()
        .get("/api/rascunhos-run")
        .set("Authorization", `Bearer ${TOKEN_INTEGRACAO}`)
        .expect(401);
    });

    it("resolver refaz o casamento com o cadastro atual (vínculo aprovado depois)", async () => {
      const { id } = (await integracao(rascunho()).expect(201)).body as { id: string };
      const solto = await ctx.prisma.usuario.findUniqueOrThrow({ where: { discordId: SEM_VINCULO } });
      const j = await ctx.prisma.jogador.create({
        data: { apelido: "Solto", usuarioId: solto.id, personagens: { create: [{ nome: "Solto" }] } },
        include: { personagens: true },
      });
      const d = (await post(`/api/rascunhos-run/${id}/resolver`).expect(200)).body as Detalhe;
      expect(d.participantes[2]).toMatchObject({ pendencia: null, personagem: { id: j.personagens[0]!.id } });
      expect(d.participantes.filter((p) => p.pendencia !== null)).toHaveLength(2);
    });

    it("descartar encerra o rascunho; não dá para descartar nem confirmar de novo", async () => {
      const { id } = (await integracao(rascunho()).expect(201)).body as { id: string };
      const d = (await post(`/api/rascunhos-run/${id}/descartar`, { motivo: "Grupo de teste" }).expect(200))
        .body;
      expect(d).toMatchObject({
        status: "DESCARTADO",
        motivoDescarte: "Grupo de teste",
        decididoPor: { discordUsername: "admin" },
      });
      await post(`/api/rascunhos-run/${id}/descartar`).expect(409);
      await post(`/api/rascunhos-run/${id}/confirmar`, {
        status: "CONCLUIDA",
        chefe: "NAGHT_25",
        participantes: [],
      }).expect(409);
      await post(`/api/rascunhos-run/${id}/resolver`).expect(409);
      const auditoria = await ctx.prisma.auditoria.findMany({
        where: { entidade: "rascunho_run", entidadeId: id },
      });
      expect(auditoria.map((a) => a.acao).sort()).toEqual([
        "RASCUNHO_RUN_DESCARTADO",
        "RASCUNHO_RUN_RECEBIDO",
      ]);
    });

    it("rascunho inexistente → 404; id inválido → 400", async () => {
      await get("/api/rascunhos-run/00000000-0000-4000-8000-000000000000").expect(404);
      await get("/api/rascunhos-run/abc").expect(400);
    });
  });

  describe("confirmação pelo registro normal de runs", () => {
    it("com pendências exige a lista de participantes; com ela registra a run e só então pontua", async () => {
      const { id } = (await integracao(rascunho()).expect(201)).body as { id: string };
      const semLista = await post(`/api/rascunhos-run/${id}/confirmar`, {
        status: "CONCLUIDA",
        chefe: "NAGHT_25",
      }).expect(422);
      expect(semLista.body.message).toContain("3 participante(s)");

      const r = await post(`/api/rascunhos-run/${id}/confirmar`, {
        status: "CONCLUIDA",
        encontroId: encontroNaght,
        participantes: [
          { personagemId: personagem["Ana-Cardeal"], classeId: classe["Cardeal"] },
          { personagemId: personagem["Ana-MTK"], classeId: classe["Mestre Celestial"] },
        ],
      }).expect(201);
      expect(r.body).toMatchObject({ rascunhoId: id, runId: expect.any(String) });

      const d = (await get(`/api/rascunhos-run/${id}`).expect(200)).body as Detalhe;
      expect(d).toMatchObject({ status: "CONFIRMADO", runId: r.body.runId });
      const run = (await get(`/api/runs/${r.body.runId as string}`).expect(200)).body as {
        data: string;
        versaoInstancia: { instancia: { id: string } };
        participacoes: unknown[];
      };
      expect(run.data.slice(0, 10)).toBe("2026-11-20");
      expect(run.versaoInstancia.instancia.id).toBe(torreId);
      expect(run.participacoes).toHaveLength(2);
      expect(await ctx.prisma.lancamentoPontos.count()).toBe(2);

      await post(`/api/rascunhos-run/${id}/confirmar`, {
        status: "CONCLUIDA",
        chefe: "NAGHT_25",
        participantes: [],
      }).expect(409);
      await post(`/api/rascunhos-run/${id}/descartar`).expect(409);
    });

    it("sem pendências, data, instância e participantes vêm do rascunho; o gestor informa resultado e encontro", async () => {
      const { id } = (
        await integracao(
          rascunho({
            participantes: [
              { discordId: ANA, personagem: "Ana-Cardeal", classe: { nome: "Cardeal" } },
              { discordId: ANA, personagem: "Ana-MTK", classe: { nome: "Mestre Celestial" } },
            ],
          }),
        ).expect(201)
      ).body as { id: string };
      await post(`/api/rascunhos-run/${id}/confirmar`, { chefe: "NAGHT_25" }).expect(400);
      const r = await post(`/api/rascunhos-run/${id}/confirmar`, {
        status: "FALHA_CHEFE",
        chefe: "NAGHT_25",
      }).expect(201);
      const run = (await get(`/api/runs/${r.body.runId as string}`).expect(200)).body as {
        status: string;
        participacoes: { personagem: { id: string } }[];
      };
      expect(run.status).toBe("FALHA_CHEFE");
      expect(run.participacoes.map((p) => p.personagem.id).sort()).toEqual(
        [personagem["Ana-Cardeal"], personagem["Ana-MTK"]].sort(),
      );
    });

    it("um erro no registro (encontro de outra instância) não confirma o rascunho nem grava nada", async () => {
      const { id } = (
        await integracao(
          rascunho({
            participantes: [{ discordId: ANA, personagem: "Ana-Cardeal", classe: { nome: "Cardeal" } }],
          }),
        ).expect(201)
      ).body as { id: string };
      await post(`/api/rascunhos-run/${id}/confirmar`, { status: "CONCLUIDA" }).expect(400);
      expect((await get(`/api/rascunhos-run/${id}`).expect(200)).body).toMatchObject({
        status: "PENDENTE",
        runId: null,
      });
      expect(await ctx.prisma.run.count()).toBe(0);
    });

    it("duas confirmações simultâneas registram uma run só", async () => {
      const { id } = (
        await integracao(
          rascunho({
            participantes: [{ discordId: ANA, personagem: "Ana-Cardeal", classe: { nome: "Cardeal" } }],
          }),
        ).expect(201)
      ).body as { id: string };
      const corpo = { status: "CONCLUIDA", chefe: "NAGHT_25" };
      const respostas = await Promise.all([
        post(`/api/rascunhos-run/${id}/confirmar`, corpo),
        post(`/api/rascunhos-run/${id}/confirmar`, corpo),
      ]);
      expect(respostas.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(await ctx.prisma.run.count()).toBe(1);
      expect(await ctx.prisma.lancamentoPontos.count()).toBe(1);
    });

    it("membro comum não confirma nem descarta (403)", async () => {
      const { id } = (await integracao(rascunho()).expect(201)).body as { id: string };
      await post(`/api/rascunhos-run/${id}/confirmar`, { status: "CONCLUIDA" }, membro).expect(403);
      await post(`/api/rascunhos-run/${id}/descartar`, {}, membro).expect(403);
    });
  });
});
