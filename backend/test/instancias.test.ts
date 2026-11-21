// Épico IV, M15 (T-57 a T-59): instâncias com encontros e funções versionados (D43 a D46).
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SeedService } from "../src/cadastros/seed.service.js";
import { REFERENCIA_BROWIKI } from "../src/instancias/referencia-browiki.js";
import { ADMIN_DISCORD_ID, type Contexto, criarApp, ORIGEM } from "./suporte/app-de-teste.js";

interface Instancia {
  id: string;
  nome: string;
  codigo: string | null;
  ativa: boolean;
  vigente: {
    versao: number;
    encontros: { id: string; nome: string; codigo: string | null; multiplicadorCentesimos: number }[];
    funcoes: {
      id: string;
      nome: string;
      rank: number;
      padrao: boolean;
      classe: { id: string; apelidoGrupo: string | null };
    }[];
  };
}

describe("Instâncias (M15)", () => {
  let ctx: Contexto;
  let admin: string;
  let classe: Record<string, string>;
  let personagem: string;

  const get = (url: string, cookie = admin) => ctx.http().get(url).set("Cookie", cookie);
  const enviar = (metodo: "post" | "patch", url: string, corpo: object, cookie = admin) =>
    ctx.http()[metodo](url).set("Cookie", cookie).set("Origin", ORIGEM).send(corpo);
  const detalhe = async (id: string) => (await get(`/api/instancias/${id}`).expect(200)).body as Instancia;

  /** Glastheim Sombria: um encontro (×1,20); v2 com o MTK de Tanque (rank 4, padrão); ativa. */
  async function glastheim(): Promise<Instancia> {
    const nova = (
      await enviar("post", "/api/instancias", {
        nome: "Glastheim Sombria",
        nivelMinimo: 160,
        retorno: "TRES_DIAS",
        modo: "GRUPO",
        dificuldade: "DIFICIL",
        encontros: [{ nome: "Chefe", multiplicadorCentesimos: 120 }],
      }).expect(201)
    ).body as Instancia;
    expect(nova).toMatchObject({ ativa: false, vigente: { versao: 1, funcoes: [] } });
    await enviar("post", `/api/instancias/${nova.id}/versoes`, {
      encontros: [{ nome: "Chefe", multiplicadorCentesimos: 120 }],
      funcoes: [{ classeId: classe["MTK"], nome: "Tanque", rank: 4, padrao: true }],
    }).expect(201);
    await enviar("patch", `/api/instancias/${nova.id}`, { ativa: true }).expect(200);
    return detalhe(nova.id);
  }

  const run = (extra: object, funcaoId?: string) => ({
    data: "2026-11-16",
    status: "CONCLUIDA",
    participantes: [
      funcaoId === undefined
        ? { personagemId: personagem, classeId: classe["MTK"] }
        : { personagemId: personagem, funcaoId },
    ],
    ...extra,
  });

  beforeAll(async () => {
    ctx = await criarApp();
  });
  afterAll(async () => {
    await ctx.fechar();
  });
  beforeEach(async () => {
    await ctx.limparBanco();
    await ctx.app.get(SeedService).aplicar();
    admin = await ctx.login(ADMIN_DISCORD_ID, "admin");
    classe = {};
    for (const c of await ctx.prisma.classe.findMany()) classe[c.apelidoGrupo ?? c.nomeOficial] = c.id;
    const ana = await ctx.prisma.jogador.create({
      data: { apelido: "Ana", personagens: { create: { nome: "Ana-MTK" } } },
      include: { personagens: true },
    });
    personagem = ana.personagens[0]!.id;
  });

  it("a Torre existe ativa, com os três encontros (D44) e as funções de antes (D45)", async () => {
    const lista = (await get("/api/instancias").expect(200)).body as Instancia[];
    const torre = lista.find((i) => i.codigo === "TORRE_CONSTELACAO")!;
    expect(torre.ativa).toBe(true);
    expect(torre.vigente.encontros.map((e) => [e.codigo, e.multiplicadorCentesimos])).toEqual([
      ["NAGHT_25", 100],
      ["BETELGEUSE_50", 150],
      ["BETELGEUSE_75", 200],
    ]);
    expect(torre.vigente.funcoes.length).toBeGreaterThan(5);
  });

  it("CT-143: run numa instância nova pontua com o multiplicador e o rank dela", async () => {
    const g = await glastheim();
    const r = (await enviar("post", "/api/runs", run({ instanciaId: g.id })).expect(201)).body as {
      runId: string;
    };
    const det = (await get(`/api/runs/${r.runId}`).expect(200)).body;
    // 100 × W(4)=2,5 × 1,20 × 1 × 1 = 300
    expect(det.participacoes[0]).toMatchObject({
      rank: 4,
      multiplicadorChefeCentesimos: 120,
      pontosGerados: 300,
    });
    expect(det).toMatchObject({
      encontro: { nome: "Chefe" },
      versaoInstancia: { versao: 2, instancia: { nome: "Glastheim Sombria" } },
    });
  });

  it("CT-144: nova versão vale para as runs seguintes; as antigas mantêm versão e pontos", async () => {
    const g = await glastheim();
    const r1 = (await enviar("post", "/api/runs", run({ instanciaId: g.id })).expect(201)).body
      .runId as string;
    await enviar("post", `/api/instancias/${g.id}/versoes`, {
      encontros: [{ nome: "Chefe", multiplicadorCentesimos: 200 }],
      funcoes: [{ classeId: classe["MTK"], nome: "Tanque", rank: 5, padrao: true }],
    }).expect(201);
    const r2 = (await enviar("post", "/api/runs", run({ instanciaId: g.id })).expect(201)).body
      .runId as string;
    const d1 = (await get(`/api/runs/${r1}`).expect(200)).body;
    const d2 = (await get(`/api/runs/${r2}`).expect(200)).body;
    expect([d1.versaoInstancia.versao, d1.participacoes[0].pontosGerados]).toEqual([2, 300]);
    // 100 × W(5)=3 × 2,00 = 600
    expect([d2.versaoInstancia.versao, d2.participacoes[0].pontosGerados]).toEqual([3, 600]);
    const hist = (await get(`/api/instancias/${g.id}/versoes`).expect(200)).body as {
      versao: number;
      runs: number;
    }[];
    expect(hist.map((v) => [v.versao, v.runs])).toEqual([
      [3, 1],
      [2, 1],
      [1, 0],
    ]);
  });

  it("CT-145: função de outra instância (ou de versão antiga) → 422", async () => {
    const g = await glastheim();
    const torre = (await get("/api/instancias").expect(200)).body.find(
      (i: Instancia) => i.codigo === "TORRE_CONSTELACAO",
    ) as Instancia;
    const funcaoTorre = torre.vigente.funcoes.find((f) => f.classe.apelidoGrupo === "MTK")!.id;
    await enviar("post", "/api/runs", run({ instanciaId: g.id }, funcaoTorre)).expect(422);
    // E a função da Glastheim não vale na Torre
    await enviar("post", "/api/runs", run({ chefe: "NAGHT_25" }, g.vigente.funcoes[0]!.id)).expect(422);
  });

  it("CT-146: instância inativa, ou sem funções, não recebe run; ativar sem funções dá 409", async () => {
    const nova = (
      await enviar("post", "/api/instancias", {
        nome: "Torre Submersa",
        encontros: [{ nome: "Chefe", multiplicadorCentesimos: 80 }],
      }).expect(201)
    ).body as Instancia;
    await enviar("patch", `/api/instancias/${nova.id}`, { ativa: true }).expect(409);
    await enviar("post", "/api/runs", run({ instanciaId: nova.id })).expect(422);
    const g = await glastheim();
    await enviar("patch", `/api/instancias/${g.id}`, { ativa: false }).expect(200);
    await enviar("post", "/api/runs", run({ instanciaId: g.id })).expect(422);
  });

  it("encontro: o de versão antiga é recusado; com vários encontros é preciso escolher", async () => {
    const g = await glastheim();
    const antigo = g.vigente.encontros[0]!.id;
    await enviar("post", `/api/instancias/${g.id}/versoes`, {
      encontros: [
        { nome: "Chefe", multiplicadorCentesimos: 120 },
        { nome: "Modo difícil", multiplicadorCentesimos: 180 },
      ],
      funcoes: [{ classeId: classe["MTK"], nome: "Tanque", rank: 4, padrao: true }],
    }).expect(201);
    await enviar("post", "/api/runs", run({ encontroId: antigo })).expect(422);
    await enviar("post", "/api/runs", run({ instanciaId: g.id })).expect(400);
    const dificil = (await detalhe(g.id)).vigente.encontros.find((e) => e.nome === "Modo difícil")!;
    const r = (await enviar("post", "/api/runs", run({ encontroId: dificil.id })).expect(201)).body.runId;
    // 100 × 2,5 × 1,80 = 450
    expect((await get(`/api/runs/${r}`).expect(200)).body.participacoes[0].pontosGerados).toBe(450);
  });

  it("a Torre continua aceitando chefe depois de uma versão nova (o código passa para a versão nova)", async () => {
    const torre = (await get("/api/instancias").expect(200)).body.find(
      (i: Instancia) => i.codigo === "TORRE_CONSTELACAO",
    ) as Instancia;
    await enviar("post", `/api/instancias/${torre.id}/versoes`, {
      encontros: torre.vigente.encontros.map((e) => ({
        nome: e.nome,
        multiplicadorCentesimos: e.codigo === "BETELGEUSE_75" ? 250 : e.multiplicadorCentesimos,
      })),
      funcoes: torre.vigente.funcoes.map((f) => ({
        classeId: f.classe.id,
        nome: f.nome,
        rank: f.rank,
        padrao: f.padrao,
      })),
    }).expect(201);
    const r = (await enviar("post", "/api/runs", run({ chefe: "BETELGEUSE_75" })).expect(201)).body.runId;
    // MTK rank 5: 100 × 3 × 2,50 = 750
    expect((await get(`/api/runs/${r}`).expect(200)).body.participacoes[0].pontosGerados).toBe(750);
  });

  it("CT-148: a correção sem instância informada usa a versão vigente da mesma instância", async () => {
    const g = await glastheim();
    const r1 = (await enviar("post", "/api/runs", run({ instanciaId: g.id })).expect(201)).body
      .runId as string;
    await enviar("post", `/api/instancias/${g.id}/versoes`, {
      encontros: [{ nome: "Chefe", multiplicadorCentesimos: 200 }],
      funcoes: [{ classeId: classe["MTK"], nome: "Tanque", rank: 4, padrao: true }],
    }).expect(201);
    const c = (
      await enviar("post", `/api/runs/${r1}/corrigir`, { motivo: "Ajuste", run: run({}) }).expect(201)
    ).body.runId as string;
    const d = (await get(`/api/runs/${c}`).expect(200)).body;
    expect([d.versaoInstancia.instancia.nome, d.versaoInstancia.versao]).toEqual(["Glastheim Sombria", 3]);
    expect(d.participacoes[0].pontosGerados).toBe(500); // 100 × 2,5 × 2,00
    expect((await get(`/api/runs/${r1}`).expect(200)).body.status).toBe("ESTORNADA");
  });

  it("validações: nome repetido 409; sem encontro, multiplicador fora da faixa ou rank inválido 400", async () => {
    await enviar("post", "/api/instancias", {
      nome: "torre da constelação",
      encontros: [{ nome: "X", multiplicadorCentesimos: 100 }],
    }).expect(409);
    await enviar("post", "/api/instancias", { nome: "Sem encontro", encontros: [] }).expect(400);
    await enviar("post", "/api/instancias", {
      nome: "Zero",
      encontros: [{ nome: "X", multiplicadorCentesimos: 0 }],
    }).expect(400);
    await enviar("post", "/api/instancias", {
      nome: "Repetido",
      encontros: [
        { nome: "A", multiplicadorCentesimos: 100 },
        { nome: "a", multiplicadorCentesimos: 100 },
      ],
    }).expect(400);
    const g = await glastheim();
    await enviar("post", `/api/instancias/${g.id}/versoes`, {
      encontros: [{ nome: "Chefe", multiplicadorCentesimos: 100 }],
      funcoes: [{ classeId: classe["MTK"], nome: "Tanque", rank: 6 }],
    }).expect(400);
    // Instância ativa não pode ficar sem funções
    await enviar("post", `/api/instancias/${g.id}/versoes`, {
      encontros: [{ nome: "Chefe", multiplicadorCentesimos: 100 }],
      funcoes: [],
    }).expect(422);
  });

  it("D56: o catálogo da browiki entra inativo e sem versão; repetir o seed não duplica nem desfaz", async () => {
    const seed = ctx.app.get(SeedService);
    const todas = await ctx.prisma.instancia.findMany({ include: { versoes: true } });
    expect(todas).toHaveLength(REFERENCIA_BROWIKI.length);
    const sombria = todas.find((i) => i.nome === "Glastheim Sombria");
    expect(sombria).toMatchObject({
      codigo: "BROWIKI_GLASTHEIM_SOMBRIA",
      ativa: false,
      nivelMinimo: 160,
      retorno: "TRES_DIAS",
      versoes: [],
    });
    const torre = todas.filter((i) => i.nome === "Torre da Constelação");
    expect(torre).toHaveLength(1);
    expect(torre[0]).toMatchObject({ codigo: "TORRE_CONSTELACAO", ativa: true });

    const catalogoFarm = (
      await ctx.http().get("/api/farm/catalogo-instancias").set("Cookie", admin).expect(200)
    ).body as { nome: string; recargaSugerida: string | null }[];
    expect(catalogoFarm).toHaveLength(REFERENCIA_BROWIKI.length);
    expect(catalogoFarm.find((i) => i.nome === "Glastheim Sombria")?.recargaSugerida).toBe("TRES_DIAS");
    expect(catalogoFarm.find((i) => i.nome === "Altar do Selo")?.recargaSugerida).toBeNull();

    const adotada = await glastheim();
    expect(adotada.id).toBe(sombria!.id);
    expect(await ctx.prisma.instancia.count()).toBe(REFERENCIA_BROWIKI.length);

    await ctx.prisma.instancia.update({
      where: { id: sombria!.id },
      data: { nome: "GH Sombria", nivelMinimo: 165 },
    });
    expect((await seed.aplicar()).instanciasBrowiki).toBe(false);
    expect(await ctx.prisma.instancia.count()).toBe(REFERENCIA_BROWIKI.length);
    expect(await ctx.prisma.instancia.findUnique({ where: { id: sombria!.id } })).toMatchObject({
      nome: "GH Sombria",
      nivelMinimo: 165,
    });
  });

  it("referência da browiki: 60 instâncias, só dados de apoio", async () => {
    const ref = (await get("/api/instancias/referencia").expect(200)).body as {
      nome: string;
      nivelMinimo: number | null;
    }[];
    expect(ref).toHaveLength(60);
    expect(ref.find((r) => r.nome === "Torre da Constelação")).toMatchObject({
      nivelMinimo: 240,
      retorno: "TRES_DIAS",
    });
  });

  it("CT-147: membro recebe 403; gestor cadastra", async () => {
    const membro = await ctx.login("9201", "membro");
    await get("/api/instancias", membro).expect(403);
    await enviar(
      "post",
      "/api/instancias",
      { nome: "X", encontros: [{ nome: "X", multiplicadorCentesimos: 100 }] },
      membro,
    ).expect(403);
    const gestor = await ctx.login("9202", "gestor");
    const u = await ctx.prisma.usuario.findUniqueOrThrow({ where: { discordId: "9202" } });
    await enviar("patch", `/api/usuarios/${u.id}`, { papel: "GESTOR" }).expect(200);
    await enviar(
      "post",
      "/api/instancias",
      { nome: "Cripta", encontros: [{ nome: "Chefe", multiplicadorCentesimos: 50 }] },
      gestor,
    ).expect(201);
  });

  it("versões, encontros e funções são imutáveis no banco (D46)", async () => {
    const g = await glastheim();
    await expect(
      ctx.prisma.encontro.update({
        where: { id: g.vigente.encontros[0]!.id },
        data: { multiplicadorCentesimos: 999 },
      }),
    ).rejects.toThrow(/só aceita inclusão/);
    await expect(
      ctx.prisma.funcaoClasse.update({ where: { id: g.vigente.funcoes[0]!.id }, data: { rank: 1 } }),
    ).rejects.toThrow(/só aceita inclusão/);
  });
});
