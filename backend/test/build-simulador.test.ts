// D55: importar para a ficha a build de um link do simulador de dano (simulador.latam-tools.com.br).
import lzString from "lz-string";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SeedService } from "../src/cadastros/seed.service.js";
import { decodificarBuild, lerLinkSimulador } from "../src/jogadores/build-simulador.js";
import { type Contexto, criarApp, ORIGEM } from "./suporte/app-de-teste.js";

/** Token de um link real do simulador: Feiticeiro, nível 105, com oito equipamentos. */
const TOKEN_REAL =
  "N4Igzg1glgNjBiB7ATgWwK4wIYDUCmyYUiAdiAFwgDG6yyeJALiADTXZhgUAcbMeANzwwKARgAMAVjYArRACMAMoOEVJ4tmEbIxs" +
  "hQGVtFAMxssAcyi6Qc.QEFLJtgKjNyovfJyu1bKE2tbAEkA9w0QABM8AA9AhQARGIoAdj50CDildKdwYTwqRjwIu0YIfWg4ChB4K" +
  "HoAAgAhRBhGAF5WiVYQAHc8LAAHUjUAFnFxYw8QAAs.iIBZKAiI-" +
  "jEATgAmYcmZrAjFRF6dcmH1sfGzNBQKYfVxE80pqGEIinXuVfFJ8yw0BjdT1ajNjyRCINzDZJjUSpEBYKhUABKUHMU3BH0.0hA-T" +
  "wjH2AE8sC08dcHrsDgB1PqDMjkTaQzFgKZk7p2S5HTYANkBpIiB30j2er2GXNM4CZvO6TTBQq5DPFBwAoj9kP5zDLVhyeQcAAoMC" +
  "JYUKc1YwyCwGANdAAM0tcwGFFAAGEDYxEFQDRFFuguORwg7.Kg-lAsBRwkFUIMiIxiHVbSQvSG2Arov0g1HEAmQA7EOGcYHgz62A" +
  "jhMjiBmGgwilACuhUBn9IhMHVEJa6gAJPpCEh1d11JXIRhTDMAFUJUDAqANTZb2uQYPyaZp4RHMDHE67zbqA7wdXJyuIRyXo-Hk4" +
  "3W5jFirQcXbGXq5PLZqQl7-r.3vCrPM6EYXrq3kY.ffZBP2-" +
  "MA6iHYQawzGc8DABhQLsKgnjfNgHWQLAAC88TqABVfpZx.DNFCwdB9QsONkJAIiSKwOoESwDAKP0OE0IDJhIILEAAHEYBQIMMzDP" +
  "DECfLMSCoP40IXDM7AiegSFHEhtwRL1Bw47UDgIMCpmQL03HCSkBlIOpdWQS152Ia9qiwWosPrTA63lbo6lskQOPgQkqEM5yM045" +
  "o8FQJyGxc8IAHkPRIAByUC1MODNbXMON-IaegsAyDiLVEqYpycrSoHDWLQRIFcUUYJyCAYXY8DrbQoGgEg1Q4gB9JjzDwBqakFRr" +
  "62QMT6GQBqQiIeK.Mazi8lqAC2H5J4YAiJzsUqNK0MsSKjMQPy626VU6niA0xNivEtCrQk6jscMV0tI7JI4-" +
  "R5pgXsMudVVYp.KhMo3GdSEKNC6zKuSoiygApLBuisqwOPJR4tBWDi7E4LBOH8OpUMQTgsv0dASFg3S2Dsfp.n4LKggiDGM1bGtU" +
  "Ce1yUG-BSVoAaTHRiCBcMS6ktFA6gATQbDN4m0-zDLPBosEYRh.AujrwiROqsoAOSgeQILqhh.JIARMAUtD5AJ-QnnMS0VSKDMlM" +
  "ZMDEB3fwIgphbwgVV7zfrOq6zxcMplILCN32IQDzYeAVXMcwVsd.rwmUNCIhWxJul53bt3JVxMvJdAQ7YEILpIVxtzJ1AKadji5i" +
  "9I67pCL6YBIyqOKzAMStO-pjasl4OJ25AICR7Bo6bvB5CtS0msGeok3xlHzONpl.jARAIg9lsFgU7oUAgAhvLwa0GCDOpZddb9kA" +
  "UjNgok0sOIVFw7ucpHaFg1XTIKEeOPwEhszqAT6ARoYOJLxBoku2-wgaVwvqRs0Ru4Q1JwBVu-cMhI-J-" +
  "AzE1FAPUCD9UxsiDOWAGojiAjiBqohYFdQQX1AaKCgzoJ.C1RgDV1i4PgWVAhyChpoIwWQhqxgqHdRoUgwaqCSGYPIcMbyaEXD-i" +
  "uuEBqcw8Bji.g1AAiugFKFcQr8BrE5Xa35aw.gAL5mBvkIcoZpbR13IKAJAL9kSogzAqEgEpGjYHQvItgihTGMAzjLfYFUfbVFnF" +
  "oHcVI37hH0OI8cVZvEGQsjULxN1hBBTYHAthvUGoKhfEwQkfdag.A0Wwfo8MiA6IqDAb0ABtDQRSWDFNKSU8pGhpClIALoZKyVAH" +
  "Jei7SGMzEAxozRsYeJRiVeIDSl7XSwKZRgWFdw2xxhEAQsdZpSlSuEPmFhSDNEQOYYk79LGYBalJL8DtbrmMsQcaxGE7GUUcc48w" +
  "dRXFRHcX7bpwTqQ-VXEE-S9yOJEUsUZWchQChXHIJiQwKpaopxAL0.ipBZrxB0uYn4A46icQEfI9R6igA";

const tokenDe = (build: object) =>
  lzString.compressToEncodedURIComponent(JSON.stringify(build)).replace(/\+/g, ".");

describe("Link do simulador (D55)", () => {
  it("reconhece o link completo, o parâmetro b e o link curto", () => {
    expect(lerLinkSimulador(`https://simulador.latam-tools.com.br/s/${TOKEN_REAL}/`)).toEqual({
      tipo: "token",
      token: TOKEN_REAL,
    });
    expect(lerLinkSimulador(`simulador.latam-tools.com.br/#/?b=${TOKEN_REAL}`)).toEqual({
      tipo: "token",
      token: TOKEN_REAL,
    });
    expect(lerLinkSimulador(" <https://short.latam-tools.com.br/Ukxuq4> ")).toEqual({
      tipo: "curto",
      slug: "Ukxuq4",
    });
  });

  it("recusa outros endereços", () => {
    for (const texto of [
      "",
      "não é um link",
      `https://exemplo.com/s/${TOKEN_REAL}/`,
      `https://simulador.latam-tools.com.br.exemplo.com/s/${TOKEN_REAL}/`,
      "https://short.latam-tools.com.br/",
      "https://short.latam-tools.com.br/a%2Fb",
      "https://simulador.latam-tools.com.br/",
    ]) {
      expect([texto, lerLinkSimulador(texto)]).toEqual([texto, null]);
    }
  });

  it("abre a build de um link real", () => {
    expect(decodificarBuild(TOKEN_REAL)).toEqual({
      classe: 8,
      nivelBase: 105,
      equipamentos: {
        meio: 19241,
        baixo: 420003,
        arma: 540031,
        armadura: 450042,
        escudo: 28901,
        capa: 20940,
        calcado: 470017,
        acessorio2: 490015,
      },
    });
  });

  it("ignora campos fora do esperado e recusa o que não é build", () => {
    expect(
      decodificarBuild(
        tokenDe({ class: "8", level: 999, weapon: -1, armor: 1.5, boot: 2404, headUpper: 5011 }),
      ),
    ).toEqual({ classe: null, nivelBase: null, equipamentos: { topo: 5011, calcado: 2404 } });
    expect(decodificarBuild(tokenDe([1, 2]))).toBeNull();
    expect(decodificarBuild("isto-nao-e-um-token")).toBeNull();
  });
});

describe("POST /api/vinculo/build-simulador (D55)", () => {
  let ctx: Contexto;
  let membro: string;

  const importar = (link: unknown, cookie = membro) =>
    ctx
      .http()
      .post("/api/vinculo/build-simulador")
      .set("Cookie", cookie)
      .set("Origin", ORIGEM)
      .send({ link });

  beforeAll(async () => {
    ctx = await criarApp({ divinePride: { chave: "chave-de-teste", servidor: "bRO" } });
  });
  afterAll(async () => {
    await ctx.fechar();
  });
  beforeEach(async () => {
    await ctx.limparBanco();
    await ctx.app.get(SeedService).aplicar();
    ctx.encurtador.destinos.clear();
    ctx.encurtador.chamadas.length = 0;
    ctx.divinePride.respostas.clear();
    membro = await ctx.login("2001", "ana");
  });

  it("exige sessão", async () => {
    await ctx
      .http()
      .post("/api/vinculo/build-simulador")
      .set("Origin", ORIGEM)
      .send({ link: `https://simulador.latam-tools.com.br/s/${TOKEN_REAL}/` })
      .expect(401);
  });

  it("devolve classe do grupo, nível e equipamentos com o nome da Divine Pride", async () => {
    ctx.divinePride.respostas.set(540031, { status: 200, corpo: { name: "Livro Feiticeiro do Éden" } });
    const r = await importar(`https://simulador.latam-tools.com.br/s/${TOKEN_REAL}/`).expect(200);
    const classe = await ctx.prisma.classe.findUniqueOrThrow({ where: { nomeOficial: "Feiticeiro" } });
    expect(r.body).toMatchObject({ classeId: classe.id, classeNome: "Feiticeiro", nivelBase: 105 });
    expect(r.body.equipamentos.arma).toEqual({ id: 540031, nome: "Livro Feiticeiro do Éden" });
    expect(r.body.equipamentos.escudo).toEqual({ id: 28901, nome: null });
    expect(Object.keys(r.body.equipamentos).sort()).toEqual(
      ["acessorio2", "arma", "armadura", "baixo", "calcado", "capa", "escudo", "meio"].sort(),
    );
    expect(ctx.encurtador.chamadas).toEqual([]);
  });

  it("segue o link curto pelo encurtador", async () => {
    ctx.encurtador.destinos.set("Ukxuq4", `https://simulador.latam-tools.com.br/s/${TOKEN_REAL}/`);
    const r = await importar("https://short.latam-tools.com.br/Ukxuq4").expect(200);
    expect(r.body.nivelBase).toBe(105);
    expect(ctx.encurtador.chamadas).toEqual(["https://short.latam-tools.com.br/api/links/Ukxuq4"]);
  });

  it("classe que o grupo não tem fica sem classeId, mas com o nome", async () => {
    await ctx.prisma.classe.updateMany({ where: { nomeOficial: "Feiticeiro" }, data: { ativa: false } });
    const r = await importar(`https://simulador.latam-tools.com.br/s/${TOKEN_REAL}/`).expect(200);
    expect(r.body).toMatchObject({ classeId: null, classeNome: "Feiticeiro" });
  });

  it("recusa link de outro site, link curto desconhecido e destino que não é build", async () => {
    await importar("https://exemplo.com/s/abcdefgh/").expect(400);
    await importar("https://short.latam-tools.com.br/nao-existe").expect(400);
    ctx.encurtador.destinos.set("fora", "https://exemplo.com/qualquer");
    await importar("https://short.latam-tools.com.br/fora").expect(400);
    await importar("https://simulador.latam-tools.com.br/s/isto-nao-e-um-token/").expect(400);
    await importar(42).expect(400);
  });

  it("encurtador fora do ar vira 502", async () => {
    ctx.encurtador.destinos.set("Ukxuq4", "falha");
    await importar("https://short.latam-tools.com.br/Ukxuq4").expect(502);
  });
});
