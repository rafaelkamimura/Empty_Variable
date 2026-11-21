// D57: simulação de dano — alvos (chefes das instâncias e monstros pelo ID) e o cálculo pela API.
import {
  BONUS_FISICO_ZERADO,
  BONUS_MAGICO_ZERADO,
  contraHp,
  simularFisico,
  simularMagico,
} from "@betel/simulador";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SeedService } from "../src/cadastros/seed.service.js";
import { BUSCAS_POR_HORA, lerMonstroDivinePride } from "../src/simulador/monstros.service.js";
import { ADMIN_DISCORD_ID, type Contexto, criarApp, ORIGEM } from "./suporte/app-de-teste.js";

/** Resposta no formato da documentação pública da Divine Pride: campos soltos, com texto. */
const PORING = {
  id: 1002,
  name: "Poring",
  level: 1,
  race: "Plant",
  element: "Water",
  elementLevel: 1,
  size: "Medium",
  type: "Normal",
  health: 50,
  def: 0,
  mDef: 5,
  region: "bRO",
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

describe("leitura do monstro da Divine Pride", () => {
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

    it("alvos: a Torre já vem com os dois chefes de referência e a fonte de cada um", async () => {
      const r = await ler("/api/simulador/alvos").expect(200);
      expect(r.body.divinePride).toBe(false);
      const t = await torre();
      expect(t.chefes.map((c: { nome: string }) => c.nome)).toEqual(["Betelgeuse", "Naght Sieger"]);
      expect(t.chefes[1]).toMatchObject({
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
      expect(t.chefes[0].monstro).toMatchObject({
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
      const instancia = await ctx.prisma.instancia.create({ data: { nome: "Covil de Vermes" } });
      const url = `/api/simulador/instancias/${instancia.id}/chefes`;
      await enviar("post", url, membro, { idMonstro: 2529, nome: "Rainha Verme" }).expect(403);
      await enviar("post", url, admin, { idMonstro: 2529 }).expect(400);
      await enviar("post", url, admin, { idMonstro: 0, nome: "X" }).expect(400);
      await enviar("post", `/api/simulador/instancias/${crypto.randomUUID()}/chefes`, admin, {
        idMonstro: 2529,
        nome: "Rainha Verme",
      }).expect(404);
      const criado = await enviar("post", url, admin, {
        idMonstro: 2529,
        nome: "Rainha Verme",
        observacao: "Último andar",
      }).expect(201);
      expect(criado.body).toEqual({
        idMonstro: 2529,
        nome: "Rainha Verme",
        observacao: "Último andar",
        fonte: null,
        monstro: null,
      });
      const lista = (await ler("/api/simulador/alvos").expect(200)).body.instancias;
      expect(lista.find((i: { id: string }) => i.id === instancia.id).chefes).toEqual([criado.body]);
    });

    it("chefe removido não volta com o seed, e pode ser cadastrado de novo", async () => {
      const t = await torre();
      const url = `/api/simulador/instancias/${t.id}/chefes`;
      await enviar("delete", `${url}/20996`, membro).expect(403);
      await enviar("delete", `${url}/20996`, admin).expect(204);
      await enviar("delete", `${url}/20996`, admin).expect(404);
      expect((await ctx.app.get(SeedService).aplicar()).chefes).toBe(false);
      expect((await torre()).chefes.map((c: { idMonstro: number }) => c.idMonstro)).toEqual([20994]);
      await enviar("post", url, admin, { idMonstro: 20996 }).expect(201);
      expect((await torre()).chefes).toHaveLength(2);
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
      const chefe = (await torre()).chefes[1].monstro;
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

    it("a resposta da API substitui a referência, mantendo o que só a referência tem", async () => {
      ctx.divinePride.monstros.set(20996, {
        status: 200,
        corpo: {
          ...PORING,
          id: 20996,
          name: "Naght Sieger Mutante",
          level: 250,
          health: 2_000_000_000,
          def: 400,
        },
      });
      const r = await ler("/api/simulador/monstros/20996").expect(200);
      expect(r.body).toMatchObject({
        nome: "Naght Sieger Mutante",
        origem: "DIVINE_PRIDE",
        hp: 2_000_000_000,
        def: 400,
        vit: 90,
        res: 300,
        mres: 200,
        danoRecebidoPct: 100,
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
        monstro: { origem: "DIVINE_PRIDE", hp: 2_000_000_000, raca: "DRAGAO", danoRecebidoPct: 1 },
      });
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
