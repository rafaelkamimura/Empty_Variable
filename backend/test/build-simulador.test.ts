// D55: importar para a ficha a build de um link do simulador de dano (simulador.latam-tools.com.br).
// D57: a build vem inteira (refino, grau, cartas, encantamentos, atributos) e a ficha a guarda.
// D59: a ficha guarda também a classe do simulador e o token do link, que a simulação lê de novo.
import lzString from "lz-string";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SeedService } from "../src/cadastros/seed.service.js";
import { decodificarBuild, lerLinkSimulador } from "../src/jogadores/build-simulador.js";
import { ADMIN_DISCORD_ID, type Contexto, criarApp, ORIGEM } from "./suporte/app-de-teste.js";

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

/** Build com tudo o que a D57 guarda, nos campos que o simulador usa. */
const BUILD_COMPLETA = {
  class: 4252,
  level: 250,
  jobLevel: 55,
  str: 130,
  jobStr: 12,
  agi: 90,
  vit: 100,
  int: 1,
  dex: 60,
  jobDex: 6,
  luk: 50,
  pow: 100,
  sta: 10,
  con: 50,
  crt: 0,
  selectedAtkSkill: "Dragonic Breath==10",
  propertyAtk: "Fire",
  weapon: 600020,
  weaponRefine: 12,
  weaponGrade: "A",
  weaponCard1: 4608,
  weaponCard2: 4608,
  weaponCard3: 4625,
  weaponEnchant1: 4700,
  weaponEnchant3: 29594,
  armor: 450127,
  armorRefine: 9,
  armorGrade: "b",
  armorCard: 4302,
  armorEnchant1: 4701,
  armorEnchant2: 4702,
  headUpper: 19241,
  headUpperRefine: 0,
  accLeft: 490015,
  accLeftCard: 4040,
  shadowWeapon: 24705,
};

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
        meio: { id: 19241 },
        baixo: { id: 420003 },
        arma: { id: 540031 },
        armadura: { id: 450042 },
        escudo: { id: 28901 },
        capa: { id: 20940 },
        calcado: { id: 470017 },
        acessorio2: { id: 490015 },
      },
      atributos: {
        nivelClasse: 50,
        base: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 },
        bonusClasse: { str: 3, agi: 3, vit: 5, int: 10, dex: 7, luk: 3 },
        habilidade: { nome: "Fire Bolt", nivel: 10 },
        classeSimulador: 8,
        token: TOKEN_REAL,
      },
    });
  });

  it("ignora campos fora do esperado e recusa o que não é build", () => {
    const token = tokenDe({ class: "8", level: 999, weapon: -1, armor: 1.5, boot: 2404, headUpper: 5011 });
    expect(decodificarBuild(token)).toEqual({
      classe: null,
      nivelBase: null,
      equipamentos: { topo: { id: 5011 }, calcado: { id: 2404 } },
      atributos: { token },
    });
    expect(decodificarBuild(tokenDe([1, 2]))).toBeNull();
    expect(decodificarBuild("isto-nao-e-um-token")).toBeNull();
  });

  it("D57: traz refino, grau, cartas, encantamentos, atributos, talentos e habilidade", () => {
    expect(decodificarBuild(tokenDe(BUILD_COMPLETA))).toEqual({
      classe: 4252,
      nivelBase: 250,
      equipamentos: {
        arma: { id: 600020, refino: 12, grau: "A", cartas: [4608, 4608, 4625], encantamentos: [4700, 29594] },
        armadura: { id: 450127, refino: 9, grau: "B", cartas: [4302], encantamentos: [4701, 4702] },
        topo: { id: 19241, refino: 0 },
        acessorio1: { id: 490015, cartas: [4040] },
      },
      atributos: {
        nivelClasse: 55,
        base: { str: 130, agi: 90, vit: 100, int: 1, dex: 60, luk: 50 },
        bonusClasse: { str: 12, dex: 6 },
        talentos: { pow: 100, sta: 10, con: 50, crt: 0 },
        habilidade: { nome: "Dragonic Breath", nivel: 10 },
        elementoAtaque: "FOGO",
        classeSimulador: 4252,
        token: tokenDe(BUILD_COMPLETA),
      },
    });
  });

  it("D59: um link grande demais para a ficha vem sem o token", () => {
    const enorme = tokenDe({
      class: 8,
      rawOptionTxts: Array.from({ length: 6000 }, (_, i) => `atk:${(i * 7919) % 100003}`),
    });
    expect(enorme.length).toBeGreaterThan(16 * 1024);
    expect(decodificarBuild(enorme)?.atributos).toEqual({ classeSimulador: 8 });
  });

  it("D57: descarta refino, grau, cartas e atributos fora do esperado", () => {
    const token = tokenDe({
      weapon: 1291,
      weaponRefine: 25,
      weaponGrade: "S",
      weaponCard1: -4,
      weaponCard2: "4001",
      weaponEnchant1: 4700.5,
      armorRefine: 7,
      str: 0,
      jobStr: -1,
      pow: 1000,
      jobLevel: 0,
      selectedAtkSkill: "==3",
      propertyAtk: "Plasma",
    });
    expect(decodificarBuild(token)).toEqual({
      classe: null,
      nivelBase: null,
      equipamentos: { arma: { id: 1291 } },
      atributos: { token },
    });
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
    ctx.divinePride.chamadas.length = 0;
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
    expect(r.body.atributos).toMatchObject({
      nivelClasse: 50,
      habilidade: { nome: "Fire Bolt", nivel: 10 },
      classeSimulador: 8,
      token: TOKEN_REAL,
    });
    expect(ctx.encurtador.chamadas).toEqual([]);
  });

  it("D57: devolve refino, grau, cartas e encantamentos, com o nome que a Divine Pride tiver", async () => {
    ctx.divinePride.respostas.set(4608, { status: 200, corpo: { name: "Carta Cavaleiro Branco" } });
    ctx.divinePride.respostas.set(4700, { status: 200, corpo: { name: "FOR+1" } });
    const r = await importar(`https://simulador.latam-tools.com.br/s/${tokenDe(BUILD_COMPLETA)}/`).expect(
      200,
    );
    expect(r.body.equipamentos.arma).toEqual({
      id: 600020,
      nome: null,
      refino: 12,
      grau: "A",
      cartas: [
        { id: 4608, nome: "Carta Cavaleiro Branco" },
        { id: 4608, nome: "Carta Cavaleiro Branco" },
        { id: 4625, nome: null },
      ],
      encantamentos: [
        { id: 4700, nome: "FOR+1" },
        { id: 29594, nome: null },
      ],
    });
    expect(r.body.equipamentos.topo).toEqual({ id: 19241, nome: null, refino: 0 });
    expect(r.body.atributos.talentos).toEqual({ pow: 100, sta: 10, con: 50, crt: 0 });
    const pedidos = ctx.divinePride.chamadas.map((url) => Number(/Item\/(\d+)/.exec(url)?.[1]));
    expect(pedidos.filter((id) => id === 4608)).toHaveLength(1);
    expect(pedidos.slice(0, 4).sort()).toEqual([19241, 450127, 490015, 600020]);
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

describe("Ficha com a build completa (D57)", () => {
  let ctx: Contexto;
  let membro: string;
  let classeId: string;

  const enviar = (metodo: "post" | "patch", url: string, corpo: object) =>
    ctx.http()[metodo](url).set("Cookie", membro).set("Origin", ORIGEM).send(corpo);

  const ARMA = {
    id: 600020,
    nome: "Espada de Duas Mãos",
    refino: 12,
    grau: "A",
    cartas: [
      { id: 4608, nome: "Carta Cavaleiro Branco" },
      { id: 4625, nome: null },
    ],
    encantamentos: [{ id: 4700, nome: "FOR+1" }],
  };
  const ATRIBUTOS = {
    nivelClasse: 55,
    base: { str: 130, dex: 60 },
    bonusClasse: { str: 12 },
    talentos: { pow: 100, con: 50 },
    habilidade: { nome: "Dragonic Breath", nivel: 10 },
    elementoAtaque: "FOGO",
    classeSimulador: 4252,
    token: tokenDe(BUILD_COMPLETA),
  };

  beforeAll(async () => {
    ctx = await criarApp();
  });
  afterAll(async () => {
    await ctx.fechar();
  });
  beforeEach(async () => {
    await ctx.limparBanco();
    await ctx.app.get(SeedService).aplicar();
    membro = await ctx.login("2001", "ana");
    const usuario = await ctx.prisma.usuario.findUniqueOrThrow({ where: { discordId: "2001" } });
    await ctx.prisma.jogador.create({ data: { apelido: "Ana", usuarioId: usuario.id } });
    classeId = (await ctx.prisma.classe.findFirstOrThrow({ where: { ativa: true } })).id;
  });

  const ficha = (extra: object = {}) => ({ nome: "Ana-DK", classeId, nivelBase: 250, build: "", ...extra });

  it("guarda e devolve refino, grau, cartas, encantamentos e atributos", async () => {
    const criada = await enviar(
      "post",
      "/api/vinculo/personagens",
      ficha({ equipamentos: { arma: ARMA, topo: { id: 5011, nome: "Antena" } }, atributos: ATRIBUTOS }),
    ).expect(201);
    expect(criada.body.equipamentos).toEqual({ arma: ARMA, topo: { id: 5011, nome: "Antena" } });
    expect(criada.body.atributos).toEqual(ATRIBUTOS);
    const situacao = await ctx.http().get("/api/vinculo").set("Cookie", membro).expect(200);
    expect(situacao.body.jogador.personagens[0]).toMatchObject({
      equipamentos: { arma: ARMA },
      atributos: ATRIBUTOS,
    });
  });

  it("salvar sem o campo atributos mantém os guardados; nulo os apaga", async () => {
    const criada = await enviar("post", "/api/vinculo/personagens", ficha({ atributos: ATRIBUTOS })).expect(
      201,
    );
    const url = `/api/vinculo/personagens/${criada.body.id}`;
    const semCampo = await enviar("patch", url, ficha({ nivelBase: 249 })).expect(200);
    expect(semCampo.body).toMatchObject({ nivelBase: 249, atributos: ATRIBUTOS });
    const apagada = await enviar("patch", url, ficha({ atributos: null })).expect(200);
    expect(apagada.body.atributos).toEqual({});
  });

  it("ficha antiga (só id e nome, sem atributos) continua válida e fica com atributos vazios", async () => {
    const antiga = await ctx.prisma.personagem.create({
      data: {
        nome: "Ana-Antiga",
        classe: { connect: { id: classeId } },
        nivelBase: 200,
        equipamentos: { arma: { id: 1291, nome: "Faca" }, capa: "Manto" },
        jogador: { connect: { apelido: "Ana" } },
      },
    });
    const situacao = await ctx.http().get("/api/vinculo").set("Cookie", membro).expect(200);
    expect(situacao.body.jogador.personagens[0]).toMatchObject({
      equipamentos: { arma: { id: 1291, nome: "Faca" }, capa: "Manto" },
      atributos: {},
    });
    const salva = await enviar(
      "patch",
      `/api/vinculo/personagens/${antiga.id}`,
      ficha({ nome: "Ana-Antiga", equipamentos: { arma: { id: 1291, nome: "Faca" }, capa: "Manto" } }),
    ).expect(200);
    expect(salva.body).toMatchObject({
      equipamentos: { arma: { id: 1291, nome: "Faca" }, capa: "Manto" },
      atributos: {},
    });
  });

  it("recusa refino, grau, cartas e atributos inválidos", async () => {
    const com = (arma: object, atributos?: unknown) =>
      enviar(
        "post",
        "/api/vinculo/personagens",
        ficha({ equipamentos: { arma: { id: 1291, nome: "Faca", ...arma } }, atributos }),
      );
    await com({ refino: 21 }).expect(400);
    await com({ refino: 1.5 }).expect(400);
    await com({ grau: "S" }).expect(400);
    await com({ cartas: [1, 2, 3, 4, 5].map((id) => ({ id })) }).expect(400);
    await com({ cartas: [{ id: 0 }] }).expect(400);
    await com({ encantamentos: "4700" }).expect(400);
    await com({}, { base: { str: 0 } }).expect(400);
    await com({}, { talentos: { pow: -1 } }).expect(400);
    await com({}, { elementoAtaque: "PLASMA" }).expect(400);
    await com({}, { habilidade: { nome: "" } }).expect(400);
    await com({}, "texto").expect(400);
    expect(await ctx.prisma.personagem.count()).toBe(0);
  });

  it("ficha da solicitação pendente leva a build completa para o personagem aprovado", async () => {
    await ctx.prisma.jogador.deleteMany();
    const pedido = await enviar("post", "/api/vinculo/solicitacoes", {
      fichas: [ficha({ equipamentos: { arma: ARMA }, atributos: ATRIBUTOS })],
    }).expect(201);
    const admin = await ctx.login(ADMIN_DISCORD_ID, "admin");
    await ctx
      .http()
      .post(`/api/vinculo/solicitacoes/${pedido.body.id}/aprovar`)
      .set("Cookie", admin)
      .set("Origin", ORIGEM)
      .send({})
      .expect(200);
    const personagem = await ctx.prisma.personagem.findUniqueOrThrow({ where: { nome: "Ana-DK" } });
    expect(personagem.equipamentos).toEqual({ arma: ARMA });
    expect(personagem.atributos).toEqual(ATRIBUTOS);
  });
});
