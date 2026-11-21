// D57: simulação de dano — alvos (chefes das instâncias e monstros pelo ID) e o cálculo pela API.
// D59: simulação da build da ficha com os efeitos dos equipamentos, conferida com o simulador da
// latam-tools.
import {
  BONUS_FISICO_ZERADO,
  BONUS_MAGICO_ZERADO,
  contraHp,
  simularFisico,
  simularMagico,
} from "@betel/simulador";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SeedService } from "../src/cadastros/seed.service.js";
import { lerDropsDivinePride } from "../src/simulador/loot.service.js";
import { BUSCAS_POR_HORA, lerMonstroDivinePride } from "../src/simulador/monstros.service.js";
import { ADMIN_DISCORD_ID, type Contexto, criarApp, ORIGEM } from "./suporte/app-de-teste.js";

/** Resposta no formato da documentação pública da Divine Pride: campos soltos, com texto. */
const PORING = {
  id: 1002,
  name: "Poring",
  level: 1,
  race: "Plant",
  element: "Water 1",
  elementLevel: 1,
  size: "Medium",
  type: "Normal",
  attributes: [],
  health: 50,
  def: 0,
  mDef: 5,
  region: "LATAM",
};

/** Resposta no formato com `stats` numérico (códigos do cliente do jogo). */
const DRAGAO = {
  id: 20994,
  name: "Betelgeuse",
  stats: {
    level: 250,
    health: 2_000_000_000,
    defense: 346,
    magicDefense: 102,
    vit: 132,
    int: 152,
    res: 500,
    mres: 500,
    race: 9,
    scale: 2,
    element: 40,
    mvp: 1,
  },
};

/** Campos da resposta real da API para o Betelgeuse (x-server LATAM, 2026-11-21). */
const BETELGEUSE_REAL = {
  id: 20994,
  name: "베텔기우스",
  availableServers: ["GGH", "iRO", "kROM", "kROZS", "thROG", "twRO"],
  level: 250,
  race: "Dragon",
  element: "Neutral 2",
  elementLevel: 2,
  size: "Large",
  type: "MVP",
  attributes: ["Taking only 1% of the damage dealt to it"],
  health: 2_000_000_000,
  magicHealth: null,
  def: 346,
  mDef: 102,
  res: 500,
  mRes: 500,
  vit: 132,
  int: 152,
  region: "LATAM",
};

/** Drops no formato real da API (Naght Sieger e Osíris, x-server LATAM, 2026-11-21), só os campos lidos. */
const DROPS_NAGHT = {
  drops: [],
  mvpDrops: [],
  mapSpecificDrops: [
    { mapName: "2@ch_t", itemId: 1000396, itemName: "Alma de Naght Sieger", probability: 0.01 },
    { mapName: "2@ch_t", itemId: 1000396, itemName: "Alma de Naght Sieger", probability: 0.05 },
    { mapName: "2@ch_t", itemId: 25729, itemName: "Sombridecon", probability: 0.2 },
  ],
};
const DROPS_OSIRIS = {
  drops: [
    {
      itemId: 25729,
      itemName: "Sombridecon",
      displayName: "Sombridecon",
      probability: 0.005,
      dropType: "common",
    },
    { itemId: 1232, itemName: "Adaga do Algoz", displayName: "Adaga do Algoz", probability: 0.0075 },
    { itemId: 0, itemName: "inválido", probability: 1 },
  ],
  mvpDrops: [{ itemId: 608, itemName: "Semente de Yggdrasil", probability: 0.3, dropType: "mvp" }],
  mapSpecificDrops: [],
};

describe("leitura dos drops da Divine Pride (D60)", () => {
  it("junta drops comuns, de MVP e de mapa; item repetido fica com a maior chance", () => {
    expect(lerDropsDivinePride(DROPS_NAGHT)).toEqual([
      { idItem: 1000396, nome: "Alma de Naght Sieger", tipo: "MAPA", chance: 0.05 },
      { idItem: 25729, nome: "Sombridecon", tipo: "MAPA", chance: 0.2 },
    ]);
    expect(lerDropsDivinePride(DROPS_OSIRIS)).toEqual([
      { idItem: 25729, nome: "Sombridecon", tipo: "COMUM", chance: 0.005 },
      { idItem: 1232, nome: "Adaga do Algoz", tipo: "COMUM", chance: 0.0075 },
      { idItem: 608, nome: "Semente de Yggdrasil", tipo: "MVP", chance: 0.3 },
    ]);
    expect(lerDropsDivinePride({ erro: "formato novo" })).toEqual([]);
    expect(lerDropsDivinePride(null)).toEqual([]);
  });
});

describe("leitura do monstro da Divine Pride", () => {
  it("resposta real da API: propriedade com o nível no texto e dano recebido nos atributos", () => {
    expect(lerMonstroDivinePride(BETELGEUSE_REAL)).toEqual({
      nome: "베텔기우스",
      nivel: 250,
      hp: 2_000_000_000,
      def: 346,
      mdef: 102,
      vit: 132,
      int: 152,
      res: 500,
      mres: 500,
      raca: "DRAGAO",
      tamanho: "GRANDE",
      elemento: "NEUTRO",
      nivelElemento: 2,
      chefe: true,
      danoRecebidoPct: 1,
    });
  });

  it("formato com campos soltos e texto", () => {
    expect(lerMonstroDivinePride(PORING)).toEqual({
      nome: "Poring",
      nivel: 1,
      hp: 50,
      def: 0,
      mdef: 5,
      vit: null,
      int: null,
      res: null,
      mres: null,
      raca: "PLANTA",
      tamanho: "MEDIO",
      elemento: "AGUA",
      nivelElemento: 1,
      chefe: false,
      danoRecebidoPct: null,
    });
  });

  it("formato com stats numérico: raça, tamanho e propriedade em código", () => {
    expect(lerMonstroDivinePride(DRAGAO)).toEqual({
      nome: "Betelgeuse",
      nivel: 250,
      hp: 2_000_000_000,
      def: 346,
      mdef: 102,
      vit: 132,
      int: 152,
      res: 500,
      mres: 500,
      raca: "DRAGAO",
      tamanho: "GRANDE",
      elemento: "NEUTRO",
      nivelElemento: 2,
      chefe: true,
      danoRecebidoPct: null,
    });
    expect(
      lerMonstroDivinePride({ name: "X", stats: { level: 10, element: 68, race: 6, scale: 0 } }),
    ).toMatchObject({
      elemento: "FANTASMA",
      nivelElemento: 3,
      raca: "DEMONIO",
      tamanho: "PEQUENO",
    });
  });

  it("o que não dá para ler fica nulo; resposta sem nada útil é recusada", () => {
    expect(
      lerMonstroDivinePride({ name: "Estranho", level: "12", race: "Robot", size: 7, element: "Plasma" }),
    ).toMatchObject({ nome: "Estranho", nivel: 12, raca: null, tamanho: null, elemento: null, chefe: null });
    expect(lerMonstroDivinePride({ erro: "x" })).toBeNull();
    expect(lerMonstroDivinePride(null)).toBeNull();
    expect(lerMonstroDivinePride([PORING])).toBeNull();
  });
});

describe("Simulação de dano (D57)", () => {
  let ctx: Contexto;
  let admin: string;
  let membro: string;

  const enviar = (metodo: "post" | "delete", url: string, cookie: string, corpo: object = {}) =>
    ctx.http()[metodo](url).set("Cookie", cookie).set("Origin", ORIGEM).send(corpo);
  const ler = (url: string, cookie = membro) => ctx.http().get(url).set("Cookie", cookie);

  async function iniciar(): Promise<void> {
    await ctx.limparBanco();
    await ctx.app.get(SeedService).aplicar();
    ctx.divinePride.monstros.clear();
    ctx.divinePride.chamadas.length = 0;
    ctx.divinePride.servidores.length = 0;
    admin = await ctx.login(ADMIN_DISCORD_ID, "admin");
    membro = await ctx.login("2001", "ana");
  }

  const torre = async () =>
    (await ler("/api/simulador/alvos").expect(200)).body.instancias.find(
      (i: { nome: string }) => i.nome === "Torre da Constelação",
    );

  describe("sem a chave da Divine Pride", () => {
    beforeAll(async () => {
      ctx = await criarApp();
    });
    afterAll(async () => {
      await ctx.fechar();
    });
    beforeEach(iniciar);

    it("exige sessão", async () => {
      await ctx.http().get("/api/simulador/alvos").expect(401);
      await ctx.http().post("/api/simulador/simular").set("Origin", ORIGEM).send({}).expect(401);
    });

    it("alvos: a Torre já vem com os chefes de referência, os dos andares e a fonte de cada um", async () => {
      const r = await ler("/api/simulador/alvos").expect(200);
      expect(r.body.divinePride).toBe(false);
      const t = await torre();
      const chefes: { idMonstro: number; nome: string; monstro: unknown }[] = t.chefes;
      expect(chefes).toHaveLength(27);
      expect(chefes.find((c) => c.idMonstro === 21356)).toMatchObject({
        nome: "Ifrit",
        fonte: "https://simulador.latam-tools.com.br/",
        monstro: { origem: "LATAM_TOOLS", servidor: "LATAM", hp: 693_500_000, elemento: "FOGO" },
      });
      expect(chefes.find((c) => c.idMonstro === 20996)).toMatchObject({
        idMonstro: 20996,
        fonte: "https://browiki.org/wiki/Torre_da_Constelação",
        monstro: {
          origem: "REFERENCIA",
          fonte: "https://www.divine-pride.net/database/monster/20996",
          nivel: 250,
          hp: 300_000_000,
          def: 410,
          mdef: 80,
          res: 300,
          mres: 200,
          raca: "DEMONIO",
          tamanho: "GRANDE",
          elemento: "FANTASMA",
          nivelElemento: 3,
          danoRecebidoPct: 100,
        },
      });
      expect(chefes.find((c) => c.idMonstro === 20994)?.monstro).toMatchObject({
        idJogo: 20994,
        raca: "DRAGAO",
        res: 500,
        danoRecebidoPct: 1,
      });
    });

    it("monstro pelo ID: o de referência responde; outro ID dá 404 sem sair para a internet", async () => {
      const r = await ler("/api/simulador/monstros/20994").expect(200);
      expect(r.body).toMatchObject({ nome: "Betelgeuse", origem: "REFERENCIA", elemento: "NEUTRO" });
      const ausente = await ler("/api/simulador/monstros/1002").expect(404);
      expect(ausente.body.message).toContain("Informe os atributos do alvo");
      await ler("/api/simulador/monstros/abc").expect(400);
      await ler("/api/simulador/monstros/0").expect(400);
      expect(ctx.divinePride.chamadas).toEqual([]);
    });

    it("chefes: só o gestor cadastra; sem chave o nome é obrigatório", async () => {
      const instancia = await ctx.prisma.instancia.create({ data: { nome: "Instância de Teste" } });
      const url = `/api/simulador/instancias/${instancia.id}/chefes`;
      await enviar("post", url, membro, { idMonstro: 990_001, nome: "Rainha Verme" }).expect(403);
      await enviar("post", url, admin, { idMonstro: 990_001 }).expect(400);
      await enviar("post", url, admin, { idMonstro: 0, nome: "X" }).expect(400);
      await enviar("post", `/api/simulador/instancias/${crypto.randomUUID()}/chefes`, admin, {
        idMonstro: 990_001,
        nome: "Rainha Verme",
      }).expect(404);
      const criado = await enviar("post", url, admin, {
        idMonstro: 990_001,
        nome: "Rainha Verme",
        observacao: "Último andar",
      }).expect(201);
      expect(criado.body).toEqual({
        idMonstro: 990_001,
        nome: "Rainha Verme",
        observacao: "Último andar",
        fonte: null,
        monstro: null,
      });
      const lista = (await ler("/api/simulador/alvos").expect(200)).body.instancias;
      expect(lista.find((i: { id: string }) => i.id === instancia.id).chefes).toEqual([
        { ...criado.body, noSimulador: false },
      ]);
    });

    it("busca por nome: acha os monstros da latam-tools sem diferenciar maiúsculas (D58)", async () => {
      await ctx.http().get("/api/simulador/monstros?busca=bafo").expect(401);
      await ler("/api/simulador/monstros?busca=b").expect(400);
      const r = await ler("/api/simulador/monstros?busca=valqu%C3%ADria%20rand").expect(200);
      expect(r.body.map((m: { idJogo: number }) => m.idJogo)).toEqual([21357, 1751]);
      expect(r.body[1]).toMatchObject({
        nome: "Valquíria Randgris",
        origem: "LATAM_TOOLS",
        raca: "ANJO",
        danoRecebidoPct: 10,
        chefe: true,
      });
      expect((await ler("/api/simulador/monstros?busca=zzzz").expect(200)).body).toEqual([]);
      const betelgeuse = await ler("/api/simulador/monstros/21361").expect(200);
      expect(betelgeuse.body).toMatchObject({ nome: "Demi Freya", danoRecebidoPct: 1 });
    });

    it("loot sem a chave: nada sai para a internet e os chefes ficam pendentes (D60)", async () => {
      const t = await torre();
      const r = await ler(`/api/simulador/instancias/${t.id}/loot`).expect(200);
      expect(r.body).toMatchObject({ chefes: 27, pendentes: 27, divinePride: false, itens: [] });
    });

    it("chefe removido não volta com o seed, e pode ser cadastrado de novo", async () => {
      const t = await torre();
      const url = `/api/simulador/instancias/${t.id}/chefes`;
      await enviar("delete", `${url}/20996`, membro).expect(403);
      await enviar("delete", `${url}/20996`, admin).expect(204);
      await enviar("delete", `${url}/20996`, admin).expect(404);
      expect((await ctx.app.get(SeedService).aplicar()).chefes).toBe(false);
      const restantes: number[] = (await torre()).chefes.map((c: { idMonstro: number }) => c.idMonstro);
      expect(restantes).toHaveLength(26);
      expect(restantes).not.toContain(20996);
      await enviar("post", url, admin, { idMonstro: 20996 }).expect(201);
      expect((await torre()).chefes).toHaveLength(27);
    });

    it("simula dano físico: o resultado é o do pacote de regras, com a comparação de HP", async () => {
      const entrada = {
        atacante: { nivelBase: 200, str: 120, dex: 60, int: 0, luk: 30, pow: 30, spl: 0, con: 10 },
        arma: { tipo: "ESPADA_DUAS_MAOS", ataque: 300, nivel: 4, refino: 10 },
        elementoAtaque: "NEUTRO",
        bonus: { atkEquipamento: 100, atkPct: 10, racaPct: 20, classePct: 50 },
        habilidade: { pct: 500, acertos: 3 },
        alvo: {
          nivel: 250,
          def: 500,
          vit: 150,
          res: 500,
          tamanho: "GRANDE",
          elemento: "NEUTRO",
          nivelElemento: 1,
        },
      } as const;
      const r = await enviar("post", "/api/simulador/simular", membro, {
        tipo: "FISICO",
        ...entrada,
        alvo: { ...entrada.alvo, hp: 1_000_000 },
      }).expect(200);
      const esperado = simularFisico({
        ...entrada,
        bonus: { ...BONUS_FISICO_ZERADO, ...entrada.bonus },
        alvo: { ...entrada.alvo, mdef: 0, int: 0, mres: 0, danoRecebidoPct: 100 },
      });
      expect(r.body).toEqual({
        tipo: "FISICO",
        ...esperado,
        contraHp: { hp: 1_000_000, ...contraHp(1_000_000, esperado.total) },
      });
      expect(r.body.porAcerto).toEqual({ minimo: 2605, maximo: 3207, medio: 2906 });
      expect(r.body.contraHp).toMatchObject({ usosMinimo: 104, usosMaximo: 128 });
    });

    it("simula dano mágico contra um chefe de referência, sem HP informado", async () => {
      const chefe = (await torre()).chefes.find((c: { idMonstro: number }) => c.idMonstro === 20996).monstro;
      const entrada = {
        atacante: { nivelBase: 250, str: 1, dex: 150, int: 200, luk: 60, pow: 0, spl: 100, con: 50 },
        arma: { tipo: "CAJADO", ataque: 400, nivel: 5, refino: 11 },
        elementoAtaque: "FANTASMA",
        bonus: { ...BONUS_MAGICO_ZERADO, matkPct: 80, racaPct: 40, ignorarMdefPct: 50 },
        habilidade: { pct: 9000, acertos: 5 },
        alvo: {
          nivel: chefe.nivel,
          def: chefe.def,
          mdef: chefe.mdef,
          vit: chefe.vit,
          int: chefe.int,
          res: chefe.res,
          mres: chefe.mres,
          tamanho: chefe.tamanho,
          elemento: chefe.elemento,
          nivelElemento: chefe.nivelElemento,
          danoRecebidoPct: chefe.danoRecebidoPct,
        },
      } as const;
      const r = await enviar("post", "/api/simulador/simular", membro, { tipo: "MAGICO", ...entrada }).expect(
        200,
      );
      expect(r.body).toEqual({ tipo: "MAGICO", ...simularMagico(entrada), contraHp: null });
      expect(r.body.detalhe).toMatchObject({ modificadorElementalPct: 175, defesa: 40, resistencia: 200 });
    });

    it("recusa entradas inválidas", async () => {
      const valida = {
        tipo: "FISICO",
        atacante: { nivelBase: 200 },
        arma: { tipo: "ADAGA", ataque: 100, nivel: 3, refino: 7 },
        elementoAtaque: "NEUTRO",
        habilidade: { pct: 100, acertos: 1 },
        alvo: { nivel: 100, tamanho: "MEDIO", elemento: "NEUTRO", nivelElemento: 1 },
      };
      const simular = (corpo: object) => enviar("post", "/api/simulador/simular", membro, corpo);
      await simular(valida).expect(200);
      await simular({ ...valida, tipo: "VENENO" }).expect(400);
      await simular({ ...valida, atacante: { nivelBase: 0 } }).expect(400);
      await simular({ ...valida, atacante: { nivelBase: 200, str: -1 } }).expect(400);
      await simular({ ...valida, arma: { ...valida.arma, tipo: "BAZUCA" } }).expect(400);
      await simular({ ...valida, arma: { ...valida.arma, nivel: 6 } }).expect(400);
      await simular({ ...valida, arma: { ...valida.arma, refino: 21 } }).expect(400);
      await simular({ ...valida, elementoAtaque: "PLASMA" }).expect(400);
      await simular({ ...valida, habilidade: { pct: 0, acertos: 1 } }).expect(400);
      await simular({ ...valida, habilidade: { pct: 100, acertos: 0 } }).expect(400);
      await simular({ ...valida, bonus: { atkPct: "10" } }).expect(400);
      await simular({ ...valida, bonus: { atkPct: -5 } }).expect(400);
      await simular({ ...valida, alvo: { ...valida.alvo, nivelElemento: 5 } }).expect(400);
      await simular({ ...valida, alvo: { ...valida.alvo, tamanho: "ENORME" } }).expect(400);
      await simular({ ...valida, alvo: { ...valida.alvo, hp: 0 } }).expect(400);
      await simular({ ...valida, alvo: undefined }).expect(400);
    });
  });

  describe("com a chave da Divine Pride", () => {
    beforeAll(async () => {
      ctx = await criarApp({ divinePride: { chave: "chave-de-teste", servidor: "LATAM" } });
    });
    afterAll(async () => {
      await ctx.fechar();
    });
    beforeEach(iniciar);

    it("busca o monstro uma vez, guarda e não repete o pedido", async () => {
      ctx.divinePride.monstros.set(1002, { status: 200, corpo: PORING });
      const r = await ler("/api/simulador/monstros/1002").expect(200);
      expect(r.body).toMatchObject({
        idJogo: 1002,
        nome: "Poring",
        origem: "DIVINE_PRIDE",
        servidor: "LATAM",
        fonte: "https://www.divine-pride.net/database/monster/1002",
        nivel: 1,
        hp: 50,
        raca: "PLANTA",
        elemento: "AGUA",
        vit: null,
      });
      await ler("/api/simulador/monstros/1002").expect(200);
      expect(ctx.divinePride.chamadas).toEqual([
        "https://www.divine-pride.net/api/database/Monster/1002?apiKey=chave-de-teste",
      ]);
      expect(ctx.divinePride.servidores).toEqual(["LATAM"]);
      expect((await ler("/api/simulador/alvos").expect(200)).body.divinePride).toBe(true);
    });

    it("ID desconhecido fica guardado como ausente; falha da Divine Pride é tentada de novo", async () => {
      await ler("/api/simulador/monstros/999999").expect(404);
      await ler("/api/simulador/monstros/999999").expect(404);
      expect(ctx.divinePride.chamadas).toHaveLength(1);
      ctx.divinePride.monstros.set(1002, "falha");
      await ler("/api/simulador/monstros/1002").expect(404);
      ctx.divinePride.monstros.set(1002, { status: 500 });
      await ler("/api/simulador/monstros/1002").expect(404);
      ctx.divinePride.monstros.set(1002, { status: 200, corpo: { erro: "formato novo" } });
      await ler("/api/simulador/monstros/1002").expect(404);
      ctx.divinePride.monstros.set(1002, { status: 200, corpo: PORING });
      await ler("/api/simulador/monstros/1002").expect(200);
      expect(ctx.divinePride.chamadas).toHaveLength(5);
    });

    it("a resposta da API substitui a referência, mantendo o nome, o HP da instância e o que só a referência tem", async () => {
      ctx.divinePride.monstros.set(20996, {
        status: 200,
        corpo: {
          ...PORING,
          id: 20996,
          name: "변종 나흐트 지거",
          attributes: ["Taking only 10% of the damage dealt to it"],
          level: 250,
          health: 2_000_000_000,
          def: 400,
        },
      });
      const r = await ler("/api/simulador/monstros/20996").expect(200);
      expect(r.body).toMatchObject({
        nome: "Naght Sieger",
        origem: "DIVINE_PRIDE",
        hp: 300_000_000,
        def: 400,
        vit: 90,
        res: 300,
        mres: 200,
        danoRecebidoPct: 10,
      });
    });

    it("referência continua valendo quando a Divine Pride não conhece o ID ou está fora do ar", async () => {
      await ler("/api/simulador/monstros/20994").expect(200);
      ctx.divinePride.monstros.set(20996, "falha");
      const r = await ler("/api/simulador/monstros/20996").expect(200);
      expect(r.body).toMatchObject({ origem: "REFERENCIA", def: 410 });
    });

    it("gestor cadastra um chefe só pelo ID: nome e atributos vêm da Divine Pride", async () => {
      ctx.divinePride.monstros.set(20994, { status: 200, corpo: DRAGAO });
      const instancia = await ctx.prisma.instancia.create({ data: { nome: "Outra Torre" } });
      const r = await enviar("post", `/api/simulador/instancias/${instancia.id}/chefes`, admin, {
        idMonstro: 20994,
      }).expect(201);
      expect(r.body).toMatchObject({
        idMonstro: 20994,
        nome: "Betelgeuse",
        monstro: { origem: "DIVINE_PRIDE", hp: 1_100_000_000, raca: "DRAGAO", danoRecebidoPct: 1 },
      });
    });

    it("loot da instância: junta os drops dos chefes, guarda e não busca de novo (D60)", async () => {
      ctx.divinePride.monstros.set(20996, { status: 200, corpo: { ...BETELGEUSE_REAL, ...DROPS_NAGHT } });
      ctx.divinePride.monstros.set(1038, { status: 200, corpo: { ...PORING, id: 1038, ...DROPS_OSIRIS } });
      ctx.divinePride.monstros.set(1039, { status: 404 });
      const instancia = await ctx.prisma.instancia.create({ data: { nome: "Instância do loot" } });
      const url = `/api/simulador/instancias/${instancia.id}`;
      for (const [idMonstro, nome] of [
        [20996, "Naght Sieger"],
        [1038, "Osíris"],
        [1039, "Bafomé"],
      ] as const) {
        await enviar("post", `${url}/chefes`, admin, { idMonstro, nome }).expect(201);
      }
      await ctx.http().get(`${url}/loot`).expect(401);
      await ler(`/api/simulador/instancias/${crypto.randomUUID()}/loot`).expect(404);

      const antes = ctx.divinePride.chamadas.length;
      const r = await ler(`${url}/loot`).expect(200);
      expect(ctx.divinePride.chamadas.length - antes).toBe(3);
      expect(r.body).toMatchObject({
        instancia: { id: instancia.id, nome: "Instância do loot" },
        chefes: 3,
        pendentes: 0,
        divinePride: true,
      });
      expect(r.body.itens).toEqual([
        {
          idJogo: 1232,
          nome: "Adaga do Algoz",
          chance: 0.0075,
          origens: [{ idMonstro: 1038, monstro: "Osíris", tipo: "COMUM", chance: 0.0075 }],
        },
        {
          idJogo: 1000396,
          nome: "Alma de Naght Sieger",
          chance: 0.05,
          origens: [{ idMonstro: 20996, monstro: "Naght Sieger", tipo: "MAPA", chance: 0.05 }],
        },
        {
          idJogo: 608,
          nome: "Semente de Yggdrasil",
          chance: 0.3,
          origens: [{ idMonstro: 1038, monstro: "Osíris", tipo: "MVP", chance: 0.3 }],
        },
        {
          idJogo: 25729,
          nome: "Sombridecon",
          chance: 0.2,
          origens: [
            { idMonstro: 20996, monstro: "Naght Sieger", tipo: "MAPA", chance: 0.2 },
            { idMonstro: 1038, monstro: "Osíris", tipo: "COMUM", chance: 0.005 },
          ],
        },
      ]);

      const depois = await ler(`${url}/loot`).expect(200);
      expect(depois.body.itens).toEqual(r.body.itens);
      expect(ctx.divinePride.chamadas.length - antes).toBe(3);

      ctx.divinePride.monstros.set(1046, "falha");
      await enviar("post", `${url}/chefes`, admin, { idMonstro: 1046, nome: "Doppelganger" }).expect(201);
      const comFalha = await ler(`${url}/loot`).expect(200);
      expect(comFalha.body).toMatchObject({ chefes: 4, pendentes: 1 });
      expect(comFalha.body.itens).toHaveLength(4);
    });

    // Esgota as buscas da hora deste app: precisa ser o último teste do grupo.
    it("teto de buscas novas por hora: depois dele a API responde 429 sem chamar a Divine Pride", async () => {
      const antes = ctx.divinePride.chamadas.length;
      let recusadas = 0;
      for (let id = 500_000; id < 500_000 + BUSCAS_POR_HORA + 5; id++) {
        const r = await ler(`/api/simulador/monstros/${id}`);
        if (r.status === 429) recusadas++;
        else expect(r.status).toBe(404);
      }
      expect(recusadas).toBeGreaterThanOrEqual(5);
      expect(ctx.divinePride.chamadas.length - antes).toBeLessThanOrEqual(BUSCAS_POR_HORA);
      await ler("/api/simulador/monstros/20994").expect(200);
    });
  });
});

/** Token do link https://short.latam-tools.com.br/Ukxuq4: Feiticeiro 105/50 com Lanças de Fogo nv. 10. */
const TOKEN_FEITICEIRO =
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

describe("Simulação da build com os efeitos dos equipamentos (D59)", () => {
  let ctx: Contexto;
  let membro: string;
  let outro: string;
  let personagemId: string;

  const enviar = (metodo: "post" | "patch", url: string, corpo: object, cookie = membro) =>
    ctx.http()[metodo](url).set("Cookie", cookie).set("Origin", ORIGEM).send(corpo);

  /** Alvo como a tela envia depois de escolher um monstro guardado: os atributos dele e o ID. */
  async function alvoDe(idJogo: number): Promise<Record<string, unknown>> {
    const m = (await ctx.http().get(`/api/simulador/monstros/${idJogo}`).set("Cookie", membro).expect(200))
      .body;
    return {
      idMonstro: m.idJogo,
      nome: m.nome,
      nivel: m.nivel,
      hp: m.hp,
      def: m.def,
      mdef: m.mdef,
      vit: m.vit,
      int: m.int,
      res: m.res,
      mres: m.mres,
      raca: m.raca,
      tamanho: m.tamanho,
      elemento: m.elemento,
      nivelElemento: m.nivelElemento,
      chefe: m.chefe,
      danoRecebidoPct: m.danoRecebidoPct,
    };
  }

  const simular = (corpo: object, cookie = membro) =>
    enviar("post", "/api/simulador/simular-build", corpo, cookie);

  beforeAll(async () => {
    ctx = await criarApp();
    await ctx.limparBanco();
    await ctx.app.get(SeedService).aplicar();
    membro = await ctx.login("2001", "ana");
    outro = await ctx.login("2002", "bia");
    const usuario = await ctx.prisma.usuario.findUniqueOrThrow({ where: { discordId: "2001" } });
    await ctx.prisma.jogador.create({ data: { apelido: "Ana", usuarioId: usuario.id } });
    const importada = (
      await enviar("post", "/api/vinculo/build-simulador", {
        link: `https://simulador.latam-tools.com.br/s/${TOKEN_FEITICEIRO}/`,
      }).expect(200)
    ).body;
    const equipamentos = Object.fromEntries(
      Object.entries(importada.equipamentos as Record<string, { id: number; nome: string | null }>).map(
        ([slot, item]) => [slot, { ...item, nome: item.nome ?? `Item ${item.id}` }],
      ),
    );
    const criada = await enviar("post", "/api/vinculo/personagens", {
      nome: "Ana-Sage",
      classeId: importada.classeId,
      nivelBase: importada.nivelBase,
      build: "",
      equipamentos,
      atributos: importada.atributos,
    }).expect(201);
    personagemId = criada.body.id;
  });
  afterAll(async () => {
    await ctx.fechar();
  });

  // Números lidos em https://simulador.latam-tools.com.br/ (0.1.228-beta) em 2026-11-21, com este
  // link aberto e o alvo escolhido na lista: a faixa "DANO" da habilidade e o "Por uso". O alvo aqui
  // é o monstro guardado pelo seed (D58), como a tela envia. Tolerância: nenhuma.
  it.each([
    { idJogo: 1865, nome: "Zumbi Dilacerado", minimo: 493, maximo: 796, porUso: 6440 },
    { idJogo: 21067, nome: "Dummy - Amorfo", minimo: 329, maximo: 530, porUso: 4290 },
  ])(
    "build importada contra $nome: $minimo a $maximo e $porUso por uso, como no simulador",
    async ({ idJogo, minimo, maximo, porUso }) => {
      const r = await simular({ personagemId, alvo: await alvoDe(idJogo) }).expect(200);
      expect(r.body).toMatchObject({
        modo: "BUILD",
        personagem: { id: personagemId, nome: "Ana-Sage" },
        classe: { id: 8, nome: "Feiticeiro" },
        habilidade: { nome: "Lanças de Fogo", nivel: 10, tipo: "MAGICO", elemento: "FOGO", acertos: 10 },
        dano: { minimo, maximo },
        porUso: { minimo: minimo * 10, maximo: maximo * 10, medio: porUso },
        ignorados: [],
        bonusNaoAplicados: [],
      });
    },
  );

  it("Naght Sieger: com os atributos do simulador dá 75 a 185 e 1.300 por uso; o HP guardado só muda a comparação", async () => {
    const guardado = await alvoDe(20996);
    const r = await simular({ personagemId, alvo: guardado }).expect(200);
    expect(r.body.dano).toEqual({ minimo: 75, maximo: 185 });
    expect(r.body.porUso).toEqual({ minimo: 750, maximo: 1850, medio: 1300 });
    expect(r.body.contraHp).toMatchObject({
      hp: guardado["hp"],
      usosMinimo: Math.ceil(Number(guardado["hp"]) / 1850),
    });
    expect(r.body.itens.map((item: { slot: string }) => item.slot)).toEqual(
      expect.arrayContaining(["Arma", "Escudo", "Sombrio: arma", "Sombrio: colar"]),
    );
    expect(r.body.conjuntos).toContainEqual(
      expect.objectContaining({ item: "Manopla Sombria do Paraíso Mágico" }),
    );
    expect(r.body.habilidadesEBuffs).toContain("Proteger Terreno nv. 5");
  });

  it("os bônus digitados somam aos dos itens, e o que o motor não tem volta como não aplicado", async () => {
    const alvo = await alvoDe(1865);
    const comBonus = await simular({
      personagemId,
      alvo,
      tipo: "MAGICO",
      bonus: { matkEquipamento: 100, danoFinalPct: 100 },
    }).expect(200);
    expect(comBonus.body.dano.minimo).toBeGreaterThan(493 * 2);
    expect(comBonus.body.bonusTotais).toContainEqual({ rotulo: "ATQM", valor: 205 });
    const fisico = await simular({ personagemId, alvo, tipo: "FISICO", bonus: { atkMaestria: 30 } }).expect(
      200,
    );
    expect(fisico.body.bonusNaoAplicados).toEqual(["ATQ de maestria"]);
    expect(fisico.body.dano).toEqual({ minimo: 493, maximo: 796 });
  });

  it("a habilidade pedida vale no lugar da guardada na ficha", async () => {
    const r = await simular({ personagemId, alvo: await alvoDe(1865), habilidade: "Cold Bolt==10" }).expect(
      200,
    );
    expect(r.body.habilidade).toMatchObject({ valor: "Cold Bolt==10", elemento: "AGUA" });
    expect(r.body.habilidadesDisponiveis).toContainEqual({
      valor: "Fire Bolt==10",
      nome: "Lanças de Fogo nv. 10",
    });
  });

  it("item trocado na ficha por um que o simulador não conhece é ignorado e listado; slot só com o nome vira aviso", async () => {
    const ficha = await ctx.prisma.personagem.findUniqueOrThrow({ where: { id: personagemId } });
    const equipamentos = ficha.equipamentos as Record<string, object>;
    await ctx.prisma.personagem.update({
      where: { id: personagemId },
      data: {
        equipamentos: {
          ...equipamentos,
          acessorio1: { id: 7508, nome: "Anel da Allysia" },
          topo: "Chapéu antigo",
        },
      },
    });
    const r = await simular({ personagemId, alvo: await alvoDe(1865) }).expect(200);
    expect(r.body.ignorados).toEqual([
      expect.objectContaining({
        slot: "Acessório 1",
        tipo: "EQUIPAMENTO",
        id: 7508,
        nome: "Anel da Allysia",
      }),
    ]);
    expect(r.body.avisos.join(" ")).toContain("Chapéu antigo");
    expect(r.body.dano).toEqual({ minimo: 493, maximo: 796 });
    await ctx.prisma.personagem.update({ where: { id: personagemId }, data: { equipamentos } });
  });

  it("ficha sem a build importada calcula pela classe do grupo e pelos itens com ID", async () => {
    const feiticeiro = await ctx.prisma.classe.findUniqueOrThrow({ where: { nomeOficial: "Feiticeiro" } });
    const criada = await enviar("post", "/api/vinculo/personagens", {
      nome: "Ana-Manual",
      classeId: feiticeiro.id,
      nivelBase: 105,
      build: "",
      equipamentos: { arma: { id: 540031, nome: "Livro Feiticeiro do Éden" } },
    }).expect(201);
    const r = await simular({ personagemId: criada.body.id, alvo: await alvoDe(1865) }).expect(200);
    expect(r.body.classe).toEqual({ id: 8, nome: "Feiticeiro" });
    expect(r.body.itens.map((item: { nome: string }) => item.nome)).toEqual(["Livro Feiticeiro do Éden"]);
    expect(r.body.dano.maximo).toBeGreaterThan(0);
  });

  it("exige sessão, só aceita personagem do próprio membro e recusa entradas inválidas", async () => {
    const alvo = await alvoDe(1865);
    await ctx.http().post("/api/simulador/simular-build").set("Origin", ORIGEM).send({}).expect(401);
    await simular({ personagemId, alvo }, outro).expect(404);
    await simular({ personagemId: "nao-e-uuid", alvo }).expect(400);
    await simular({ personagemId, alvo: { ...alvo, raca: "ELFO" } }).expect(400);
    await simular({ personagemId, alvo: { ...alvo, tamanho: "ENORME" } }).expect(400);
    await simular({ personagemId, alvo, bonus: { matkEquipamento: -1 }, tipo: "MAGICO" }).expect(400);
  });

  it("recusa na ficha um token de build inválido", async () => {
    const feiticeiro = await ctx.prisma.classe.findUniqueOrThrow({ where: { nomeOficial: "Feiticeiro" } });
    const ficha = { nome: "Ana-Token", classeId: feiticeiro.id, nivelBase: 105, build: "" };
    await enviar("post", "/api/vinculo/personagens", { ...ficha, atributos: { token: "<script>" } }).expect(
      400,
    );
    await enviar("post", "/api/vinculo/personagens", {
      ...ficha,
      atributos: { token: "a".repeat(16 * 1024 + 1) },
    }).expect(400);
  });

  describe("build na interface do simulador (D61)", () => {
    let hubId: string;
    const urlDaBuild = () => `/api/simulador/personagens/${hubId}/build`;
    const abrir = (cookie = membro) => ctx.http().get(urlDaBuild()).set("Cookie", cookie);
    const fichaDoHub = async () => {
      const situacao = (await ctx.http().get("/api/vinculo").set("Cookie", membro).expect(200)).body;
      return situacao.jogador.personagens.find((p: { id: string }) => p.id === hubId);
    };

    beforeAll(async () => {
      const importada = (
        await enviar("post", "/api/vinculo/build-simulador", {
          link: `https://simulador.latam-tools.com.br/s/${TOKEN_FEITICEIRO}/`,
        }).expect(200)
      ).body;
      const equipamentos = Object.fromEntries(
        Object.entries(importada.equipamentos as Record<string, { id: number; nome: string | null }>).map(
          ([slot, item]) => [slot, { ...item, nome: item.nome ?? `Item ${item.id}` }],
        ),
      );
      const criada = await enviar("post", "/api/vinculo/personagens", {
        nome: "Ana-Hub",
        classeId: importada.classeId,
        nivelBase: importada.nivelBase,
        build: "anotação da Ana",
        equipamentos,
        atributos: importada.atributos,
      }).expect(201);
      hubId = criada.body.id;
    });

    it("abre a build da ficha inteira: os dez slots e o que só o link guarda", async () => {
      const r = await abrir().expect(200);
      expect(r.body.personagem).toEqual({ id: hubId, nome: "Ana-Hub" });
      expect(r.body.avisos).toEqual([]);
      expect(r.body.build).toMatchObject({
        class: 8,
        level: 105,
        jobLevel: 50,
        weapon: 540031,
        shadowWeapon: 24705,
      });
    });

    it("grava na ficha a build mudada no simulador, e ela volta igual ao abrir de novo", async () => {
      const { build } = (await abrir().expect(200)).body;
      const mudada = { ...build, level: 110, weaponRefine: 9, shadowWeapon: 0, foraDoModelo: "x" };
      const r = await enviar("post", urlDaBuild(), { build: mudada }).expect(200);
      expect(r.body).toMatchObject({
        personagem: { id: hubId, nome: "Ana-Hub", nivelBase: 110, classe: "Feiticeiro" },
        buildInteira: true,
        avisos: [],
      });
      const ficha = await fichaDoHub();
      expect(ficha.nivelBase).toBe(110);
      expect(ficha.build).toBe("anotação da Ana");
      expect(ficha.equipamentos.arma).toMatchObject({
        id: 540031,
        nome: "Livro Feiticeiro do Éden",
        refino: 9,
      });
      expect(ficha.atributos.classeSimulador).toBe(8);
      const reaberta = (await abrir().expect(200)).body.build;
      expect(reaberta).toMatchObject({ class: 8, level: 110, weapon: 540031, weaponRefine: 9 });
      expect(reaberta.shadowWeapon).toBeUndefined();
      expect(reaberta.foraDoModelo).toBeUndefined();
      const simulada = await simular({ personagemId: hubId, alvo: await alvoDe(21067) }).expect(200);
      expect(simulada.body.nivelBase).toBe(110);
    });

    it("classe do simulador que o grupo não tem não muda a classe da ficha, e avisa", async () => {
      const { build } = (await abrir().expect(200)).body;
      await ctx.prisma.classe.update({ where: { nomeOficial: "Animista" }, data: { ativa: false } });
      const r = await enviar("post", urlDaBuild(), { build: { ...build, class: 4308 } }).expect(200);
      await ctx.prisma.classe.update({ where: { nomeOficial: "Animista" }, data: { ativa: true } });
      expect(r.body.personagem.classe).toBe("Feiticeiro");
      expect(r.body.avisos).toEqual([expect.stringContaining("Animista")]);
    });

    it("exige sessão, só aceita personagem do próprio membro e recusa o que não é uma build", async () => {
      await ctx.http().get(urlDaBuild()).expect(401);
      await abrir(outro).expect(404);
      const { build } = (await abrir().expect(200)).body;
      await enviar("post", urlDaBuild(), { build }, outro).expect(404);
      await enviar("post", urlDaBuild(), {}).expect(400);
      await enviar("post", urlDaBuild(), { build: [1] }).expect(400);
      await enviar("post", urlDaBuild(), { build: { level: 99 } }).expect(400);
      await enviar("post", "/api/simulador/personagens/nao-e-uuid/build", { build }).expect(400);
    });

    it("ficha sem a build importada abre só com o que ela mostra, e avisa", async () => {
      const feiticeiro = await ctx.prisma.classe.findUniqueOrThrow({ where: { nomeOficial: "Feiticeiro" } });
      const criada = await enviar("post", "/api/vinculo/personagens", {
        nome: "Ana-Simples",
        classeId: feiticeiro.id,
        nivelBase: 90,
        build: "",
        equipamentos: {
          arma: { id: 540031, nome: "Livro Feiticeiro do Éden", refino: 4 },
          capa: "Manto velho",
        },
      }).expect(201);
      const url = `/api/simulador/personagens/${criada.body.id}/build`;
      const r = await ctx.http().get(url).set("Cookie", membro).expect(200);
      expect(r.body.build).toEqual({ class: 8, level: 90, weapon: 540031, weaponRefine: 4 });
      expect(r.body.avisos).toEqual([
        expect.stringContaining("Manto velho"),
        expect.stringContaining("não guarda a build inteira"),
      ]);
      const salva = await enviar("post", url, { build: { ...r.body.build, level: 91 } }).expect(200);
      expect(salva.body).toMatchObject({
        personagem: { nivelBase: 91 },
        equipamentos: 2,
        buildInteira: true,
      });
      const situacao = (await ctx.http().get("/api/vinculo").set("Cookie", membro).expect(200)).body;
      const ficha = situacao.jogador.personagens.find((p: { id: string }) => p.id === criada.body.id);
      expect(ficha.equipamentos.capa).toBe("Manto velho");
      expect(ficha.atributos.token).toEqual(expect.any(String));
    });

    it("os alvos dizem quais chefes o simulador conhece", async () => {
      const alvos = (await ctx.http().get("/api/simulador/alvos").set("Cookie", membro).expect(200)).body;
      const chefes = alvos.instancias.flatMap((i: { chefes: { noSimulador: boolean }[] }) => i.chefes);
      expect(chefes.length).toBeGreaterThan(0);
      expect(chefes.every((chefe: { noSimulador: unknown }) => typeof chefe.noSimulador === "boolean")).toBe(
        true,
      );
    });
  });
});
