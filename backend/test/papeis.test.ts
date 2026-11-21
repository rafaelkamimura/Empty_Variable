// M12 (T-48 a T-50): papéis de cliente, gestor e administrador (D37, D38) e telas iniciais.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SeedService } from "../src/cadastros/seed.service.js";
import { ADMIN_DISCORD_ID, type Contexto, criarApp, ORIGEM } from "./suporte/app-de-teste.js";

/** Rotas de leitura da Gestão (paineis §3): gestor e admin entram. */
const GESTAO = [
  "/api/runs",
  "/api/saldos",
  "/api/jogadores",
  "/api/classes",
  "/api/config-pontuacao",
  "/api/config-pontuacao/vigente",
  "/api/receitas",
  "/api/itens",
  "/api/painel/gestao",
];

/** Rotas de leitura da Administração: só o admin. A fila de vínculos fica com os admins (D40). */
const ADMINISTRACAO = [
  "/api/vinculo/solicitacoes",
  "/api/estoque",
  "/api/estoque/movimentos",
  "/api/compras",
  "/api/ofertas",
  "/api/nebula/fila",
  "/api/config-loja",
  "/api/usuarios",
  "/api/painel/admin",
];

describe("Papéis e painéis (M12)", () => {
  let ctx: Contexto;
  let admin: string;
  let adminId: string;
  let gestor: string;
  let gestorId: string;
  let membro: string;
  let membroId: string;

  const get = (url: string, cookie: string) => ctx.http().get(url).set("Cookie", cookie);
  const enviar = (metodo: "post" | "patch", url: string, corpo: object, cookie: string) =>
    ctx.http()[metodo](url).set("Cookie", cookie).set("Origin", ORIGEM).send(corpo);
  const idDe = async (discordId: string) =>
    (await ctx.prisma.usuario.findUniqueOrThrow({ where: { discordId } })).id;

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
    adminId = await idDe(ADMIN_DISCORD_ID);
    gestor = await ctx.login("8001", "gestora");
    gestorId = await idDe("8001");
    membro = await ctx.login("8002", "membro");
    membroId = await idDe("8002");
    await enviar("patch", `/api/usuarios/${gestorId}`, { papel: "GESTOR" }, admin).expect(200);
  });

  it("CT-129: o gestor acessa a Gestão", async () => {
    for (const url of GESTAO) expect([url, (await get(url, gestor)).status]).toEqual([url, 200]);
  });

  it("CT-130: o gestor não acessa a Administração, nem as ações de estoque", async () => {
    for (const url of ADMINISTRACAO) expect([url, (await get(url, gestor)).status]).toEqual([url, 403]);
    const item = await ctx.prisma.itemCatalogo.findFirstOrThrow();
    await enviar("post", "/api/estoque/entradas", { itemId: item.id, quantidade: 1 }, gestor).expect(403);
    await enviar("post", "/api/itens", { nome: "Novo item", tipo: "OUTRO" }, gestor).expect(403);
    await enviar("patch", `/api/usuarios/${membroId}`, { papel: "GESTOR" }, gestor).expect(403);
  });

  it("CT-131: o admin acessa tudo", async () => {
    for (const url of [...GESTAO, ...ADMINISTRACAO]) {
      expect([url, (await get(url, admin)).status]).toEqual([url, 200]);
    }
  });

  it("CT-132: o membro não acessa Gestão nem Administração", async () => {
    for (const url of [...GESTAO, ...ADMINISTRACAO].filter((u) => u !== "/api/config-pontuacao/vigente")) {
      expect([url, (await get(url, membro)).status]).toEqual([url, 403]);
    }
  });

  it("CT-133: o admin promove e rebaixa; a auditoria registra; vale na requisição seguinte", async () => {
    await get("/api/runs", membro).expect(403);
    await enviar("patch", `/api/usuarios/${membroId}`, { papel: "GESTOR" }, admin).expect(200);
    await get("/api/runs", membro).expect(200);
    await enviar("patch", `/api/usuarios/${membroId}`, { papel: "MEMBRO" }, admin).expect(200);
    await get("/api/runs", membro).expect(403);
    const trilha = await ctx.prisma.auditoria.findMany({
      where: { acao: "USUARIO_ALTERADO", entidadeId: membroId },
      orderBy: { em: "asc" },
    });
    expect(trilha.map((a) => [a.usuarioId, (a.depois as { papel: string }).papel])).toEqual([
      [adminId, "GESTOR"],
      [adminId, "MEMBRO"],
    ]);
    await enviar("patch", `/api/usuarios/${membroId}`, { papel: "CHEFE" }, admin).expect(400);
  });

  it("CT-134: o papel de quem está em ADMIN_DISCORD_IDS não muda, e ninguém rebaixa a si mesmo", async () => {
    const outroAdmin = await ctx.login("8003", "segundo");
    const outroAdminId = await idDe("8003");
    await enviar("patch", `/api/usuarios/${outroAdminId}`, { papel: "ADMIN" }, admin).expect(200);
    // O segundo admin tenta rebaixar o admin do .env
    const r = await enviar("patch", `/api/usuarios/${adminId}`, { papel: "MEMBRO" }, outroAdmin).expect(409);
    expect(r.body.message).toContain("ADMIN_DISCORD_IDS");
    // E não rebaixa a si mesmo
    await enviar("patch", `/api/usuarios/${outroAdminId}`, { papel: "GESTOR" }, outroAdmin).expect(409);
    const lista = (await get("/api/usuarios", admin).expect(200)).body as {
      id: string;
      papelFixo: boolean;
    }[];
    expect(lista.find((u) => u.id === adminId)?.papelFixo).toBe(true);
    expect(lista.find((u) => u.id === outroAdminId)?.papelFixo).toBe(false);
  });

  it("CT-135: gestor sem vínculo usa a Gestão, mas não a loja nem a Nebula (D12)", async () => {
    await get("/api/runs", gestor).expect(200);
    await get("/api/loja", gestor).expect(403);
    await get("/api/nebula", gestor).expect(403);
    await get("/api/saldo/me", gestor).expect(403);
  });

  it("o gestor vê o extrato de qualquer jogador; o membro só o próprio (D14)", async () => {
    const j = await ctx.prisma.jogador.create({ data: { apelido: "Zed" } });
    await get(`/api/extrato/${j.id}`, gestor).expect(200);
    await get(`/api/extrato/${j.id}`, membro).expect(403);
  });

  it("CT-138: as telas iniciais contam as pendências", async () => {
    const vazio = (await get("/api/painel/admin", admin).expect(200)).body;
    expect(vazio).toMatchObject({
      comprasAEntregar: { quantidade: 0, maisAntiga: null },
      ofertasAAnalisar: { quantidade: 0 },
      nebulasAEntregar: { quantidade: 0 },
    });
    // Itens do seed ainda sem negociabilidade conferida
    expect(vazio.itensSemConferencia).toBeGreaterThan(0);

    await ctx.prisma.solicitacaoVinculo.create({
      data: { usuarioId: membroId, apelidoProposto: "Novata", personagens: { novos: [] } },
    });
    const g = (await get("/api/painel/gestao", gestor).expect(200)).body;
    expect(g.vinculosPendentes.quantidade).toBe(1);
    expect(g.vinculosPendentes.maisAntiga).not.toBeNull();
    expect(g.receitasAValidar).toBe(6); // as 6 Nebulosas do seed entram inativas
    expect(g.runsNaSemana).toBe(0);
    expect(g.maioresSaldos).toEqual([]);
  });
});
