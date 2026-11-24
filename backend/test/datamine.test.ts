// D63: datamine dos patches do cliente. Publicação pelo rolatam-dm (token de integração) e leitura
// pelos membros (sessão), com o relatório emoldurável servido do disco.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { CONFIG_TESTE, type Contexto, criarApp, TOKEN_INTEGRACAO } from "./suporte/app-de-teste.js";

const CHAVE = "2026-11-24_live_client_2170_2171_1795480754.rgz";
const HTML =
  "<title>Patch LATAM 2026-11-24</title><h1>Patch LATAM 2026-11-24</h1><script>const D = 1;</script>";
const JSON_RELATORIO = JSON.stringify({
  meta: { title: "Patch LATAM 2026-11-24" },
  items: { added: [{ id: 108642 }] },
});

const entrada = (extra: Record<string, unknown> = {}) => ({
  chave: CHAVE,
  titulo: "Patch LATAM 2026-11-24",
  dataPatch: "2026-11-24",
  patches: ["1601 2026-11-24_live_client_2168_2168_1795478972.gpf", "1604 " + CHAVE],
  resumo: { itensNovos: 230, itensAlterados: 122, monstros: 24, mapas: ["1@vrcas.rsw"] },
  relatorioHtml: HTML,
  relatorioJson: JSON_RELATORIO,
  ...extra,
});

describe("Datamine dos patches (D63)", () => {
  let ctx: Contexto;
  let cookie: string;
  const publicar = (corpo: unknown, token = TOKEN_INTEGRACAO) =>
    ctx
      .http()
      .post("/api/integracao/datamine/patches")
      .set("Authorization", `Bearer ${token}`)
      .send(corpo as object);
  const get = (url: string) => ctx.http().get(url).set("Cookie", cookie);

  beforeAll(async () => {
    ctx = await criarApp({ tokenIntegracao: TOKEN_INTEGRACAO });
  });
  afterAll(async () => {
    await ctx.fechar();
  });
  beforeEach(async () => {
    await ctx.limparBanco();
    cookie = await ctx.login("9100", "ana");
  });

  it("publica um patch, grava os arquivos em DATAMINE_DIR/<id> e o membro vê na lista", async () => {
    const r = await publicar(entrada()).expect(200);
    expect(r.body).toEqual({
      id: expect.any(String),
      criado: true,
      url: `http://betel.test/datamine/${r.body.id}`,
    });
    const pasta = join(CONFIG_TESTE.datamineDir, r.body.id as string);
    expect(readFileSync(join(pasta, "report.html"), "utf8")).toBe(HTML);
    expect(readFileSync(join(pasta, "report.json"), "utf8")).toBe(JSON_RELATORIO);
    expect(existsSync(join(pasta, "report.html.tmp"))).toBe(false);

    const lista = await get("/api/datamine/patches").expect(200);
    expect(lista.body).toEqual([
      expect.objectContaining({
        id: r.body.id,
        chave: CHAVE,
        titulo: "Patch LATAM 2026-11-24",
        dataPatch: "2026-11-24",
        patches: entrada().patches,
        resumo: entrada().resumo,
        bytesHtml: Buffer.byteLength(HTML),
        bytesJson: Buffer.byteLength(JSON_RELATORIO),
      }),
    ]);
    const detalhe = await get(`/api/datamine/patches/${r.body.id}`).expect(200);
    expect(detalhe.body.chave).toBe(CHAVE);
  });

  it("a mesma chave substitui o relatório em vez de duplicar o patch", async () => {
    const r1 = await publicar(entrada()).expect(200);
    const r2 = await publicar(
      entrada({ titulo: "Patch LATAM 2026-11-24 (rev. 2)", relatorioHtml: HTML + "<!-- v2 -->" }),
    ).expect(200);
    expect(r2.body).toEqual(expect.objectContaining({ id: r1.body.id, criado: false }));
    expect(await ctx.prisma.patchCliente.count()).toBe(1);
    const rel = await get(`/api/datamine/patches/${r1.body.id}/relatorio`).expect(200);
    expect(rel.text).toBe(HTML + "<!-- v2 -->");
    const lista = await get("/api/datamine/patches").expect(200);
    expect(lista.body[0].titulo).toBe("Patch LATAM 2026-11-24 (rev. 2)");
  });

  it("serve o relatório como HTML emoldurável só pelo próprio domínio, em sandbox", async () => {
    const { body } = await publicar(entrada()).expect(200);
    const rel = await get(`/api/datamine/patches/${body.id}/relatorio`).expect(200);
    expect(rel.headers["content-type"]).toContain("text/html");
    expect(rel.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(rel.headers["content-security-policy"]).toContain("frame-ancestors 'self'");
    expect(rel.headers["content-security-policy"]).toContain("sandbox allow-scripts");
    expect(rel.headers["content-security-policy"]).toContain("connect-src 'none'");
    expect(rel.headers["x-content-type-options"]).toBe("nosniff");
    expect(rel.text).toBe(HTML);

    const dados = await get(`/api/datamine/patches/${body.id}/dados`).expect(200);
    expect(dados.headers["content-type"]).toContain("application/json");
    expect(dados.body).toEqual(JSON.parse(JSON_RELATORIO));
  });

  it("aceita um relatório maior que o limite padrão do corpo (100 kB)", async () => {
    const grande = HTML + "<!-- " + "x".repeat(600 * 1024) + " -->";
    const { body } = await publicar(entrada({ relatorioHtml: grande })).expect(200);
    const rel = await get(`/api/datamine/patches/${body.id}/relatorio`).expect(200);
    expect(rel.text.length).toBe(grande.length);
  });

  it("recusa corpo inválido com 400 e sem gravar nada", async () => {
    await publicar({ ...entrada(), chave: undefined }).expect(400);
    await publicar(entrada({ chave: "tem espaço.gpf" })).expect(400);
    await publicar(entrada({ dataPatch: "24/11/2026" })).expect(400);
    await publicar(entrada({ patches: "1604" })).expect(400);
    await publicar(entrada({ relatorioJson: "{não é json" })).expect(400);
    await publicar(entrada({ relatorioJson: "[1,2]" })).expect(400);
    await publicar(entrada({ relatorioHtml: "" })).expect(400);
    await publicar(entrada({ resumo: "texto" })).expect(400);
    expect(await ctx.prisma.patchCliente.count()).toBe(0);
  });

  it("a publicação exige o token de integração; a leitura exige sessão", async () => {
    await publicar(entrada(), "token-errado-com-pelo-menos-32-caracteres-xx").expect(401);
    await ctx.http().post("/api/integracao/datamine/patches").send(entrada()).expect(401);
    const { body } = await publicar(entrada()).expect(200);
    await ctx.http().get("/api/datamine/patches").expect(401);
    await ctx.http().get(`/api/datamine/patches/${body.id}/relatorio`).expect(401);
  });

  it("id desconhecido dá 404 e id fora do formato dá 400", async () => {
    await get("/api/datamine/patches/00000000-0000-4000-8000-000000000000").expect(404);
    await get("/api/datamine/patches/00000000-0000-4000-8000-000000000000/relatorio").expect(404);
    await get("/api/datamine/patches/abc").expect(400);
  });

  it("a lista vem do patch mais recente para o mais antigo", async () => {
    await publicar(
      entrada({
        chave: "2026-10-28_live_client_2125_2125_1793163226.rgz",
        dataPatch: "2026-10-28",
        titulo: "Patch LATAM 2026-10-28",
      }),
    ).expect(200);
    await publicar(entrada()).expect(200);
    const lista = await get("/api/datamine/patches").expect(200);
    expect(lista.body.map((p: { dataPatch: string }) => p.dataPatch)).toEqual(["2026-11-24", "2026-10-28"]);
  });
});
