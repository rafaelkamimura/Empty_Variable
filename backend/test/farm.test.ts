// Diário de farm (D48–D54): cadastro pessoal, check-ins com recarga, totais, busca e importação.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ADMIN_DISCORD_ID, type Contexto, criarApp, ORIGEM } from "./suporte/app-de-teste.js";

const DIA_MS = 86_400_000;

describe("Diário de farm", () => {
  let ctx: Contexto;
  let ana: string;
  let beto: string;
  let semVinculo: string;
  let personagensAna: { id: string; nome: string }[];
  let personagemBeto: string;

  const enviar = (metodo: "post" | "patch" | "delete", url: string, cookie: string, corpo: object = {}) =>
    ctx.http()[metodo](url).set("Cookie", cookie).set("Origin", ORIGEM).send(corpo);
  const ler = (url: string, cookie: string) => ctx.http().get(url).set("Cookie", cookie);

  /** Jogador com personagens, vinculado ao usuário do Discord informado. */
  async function vincular(discordId: string, apelido: string, personagens: string[]) {
    const admin = await ctx.login(ADMIN_DISCORD_ID, "admin");
    const j = await enviar("post", "/api/jogadores", admin, { apelido, personagens }).expect(201);
    const usuario = await ctx.prisma.usuario.findUniqueOrThrow({ where: { discordId } });
    await ctx.prisma.jogador.update({ where: { id: j.body.id }, data: { usuarioId: usuario.id } });
    return ctx.prisma.personagem.findMany({ where: { jogadorId: j.body.id }, orderBy: { nome: "asc" } });
  }

  async function criarInstancia(cookie: string, corpo: object) {
    return (await enviar("post", "/api/farm/instancias", cookie, corpo).expect(201)).body as {
      id: string;
      personagemIds: string[];
    };
  }

  beforeAll(async () => {
    ctx = await criarApp();
  });
  afterAll(async () => {
    await ctx.fechar();
  });
  beforeEach(async () => {
    await ctx.limparBanco();
    ana = await ctx.login("3001", "ana");
    beto = await ctx.login("3002", "beto");
    semVinculo = await ctx.login("3003", "caio");
    personagensAna = await vincular("3001", "Ana", ["Ana-MTK", "Ana-Cardeal"]);
    personagemBeto = (await vincular("3002", "Beto", ["Beto-RG"]))[0]!.id;
  });

  describe("vínculo (D49)", () => {
    it("sem vínculo aprovado: lê o estado vazio, mas não cadastra", async () => {
      const r = await ler("/api/farm/estado", semVinculo).expect(200);
      expect(r.body).toMatchObject({ vinculado: false, personagens: [], instancias: [] });
      await enviar("post", "/api/farm/instancias", semVinculo, { nome: "Cripta", recarga: "DIARIA" }).expect(
        403,
      );
    });

    it("usa os personagens ativos do vínculo", async () => {
      await ctx.prisma.personagem.update({ where: { id: personagensAna[0]!.id }, data: { ativo: false } });
      const r = await ler("/api/farm/estado", ana).expect(200);
      expect(r.body.personagens.map((p: { nome: string }) => p.nome)).toEqual(["Ana-MTK"]);
    });

    it("exige sessão", async () => {
      await ctx.http().get("/api/farm/estado").expect(401);
    });
  });

  describe("cadastro (D50, D52)", () => {
    it("instância nova vale para todos os personagens; nome único sem diferenciar maiúsculas", async () => {
      const i = await criarInstancia(ana, { nome: "Cripta", recarga: "TRES_DIAS" });
      expect(i.personagemIds.sort()).toEqual(personagensAna.map((p) => p.id).sort());
      await enviar("post", "/api/farm/instancias", ana, { nome: "cripta", recarga: "DIARIA" }).expect(409);
      // Outro usuário pode ter o mesmo nome.
      await criarInstancia(beto, { nome: "Cripta", recarga: "DIARIA" });
    });

    it("não aceita personagem de outro jogador nem recarga desconhecida", async () => {
      await enviar("post", "/api/farm/instancias", ana, {
        nome: "Cripta",
        recarga: "DIARIA",
        personagemIds: [personagemBeto],
      }).expect(400);
      await enviar("post", "/api/farm/instancias", ana, { nome: "Cripta", recarga: "ANUAL" }).expect(400);
    });

    it("drops por nome reaproveitam o item; o preço é do item", async () => {
      const i = await criarInstancia(ana, { nome: "Cripta", recarga: "DIARIA" });
      const item = await enviar("post", `/api/farm/instancias/${i.id}/drops`, ana, {
        nome: "Oridecon",
        idJogo: 984,
      }).expect(201);
      const outra = await criarInstancia(ana, { nome: "Torre", recarga: "SEMANAL" });
      const mesmo = await enviar("post", `/api/farm/instancias/${outra.id}/drops`, ana, {
        nome: "oridecon",
        precoZeny: 12_000,
      }).expect(201);
      expect(mesmo.body).toMatchObject({
        id: item.body.id,
        nome: "Oridecon",
        idJogo: 984,
        precoZeny: 12_000,
      });
      await enviar("patch", `/api/farm/itens/${item.body.id}`, ana, { precoZeny: null }).expect(200);
      const estado = await ler("/api/farm/estado", ana).expect(200);
      expect(estado.body.itens).toEqual([
        { id: item.body.id, nome: "Oridecon", idJogo: 984, precoZeny: null },
      ]);
      expect(estado.body.instancias.map((x: { drops: string[] }) => x.drops)).toEqual([
        [item.body.id],
        [item.body.id],
      ]);
    });

    it("vários drops de uma vez: cria os itens que faltam e não repete os que já estão (D60)", async () => {
      const i = await criarInstancia(ana, { nome: "Torre", recarga: "SEMANAL" });
      await enviar("post", `/api/farm/instancias/${i.id}/drops`, ana, { nome: "Sombridecon" }).expect(201);
      const url = `/api/farm/instancias/${i.id}/drops/lote`;
      await enviar("post", url, ana, { itens: [] }).expect(400);
      await enviar("post", url, beto, { itens: [{ nome: "Sombridecon" }] }).expect(404);
      const r = await enviar("post", url, ana, {
        itens: [
          { nome: "Alma de Naght Sieger", idJogo: 1000396 },
          { nome: "sombridecon", idJogo: 25729 },
        ],
      }).expect(201);
      expect(r.body.map((item: { nome: string; idJogo: number }) => [item.nome, item.idJogo])).toEqual([
        ["Alma de Naght Sieger", 1000396],
        ["Sombridecon", 25729],
      ]);
      const estado = await ler("/api/farm/estado", ana);
      const torre = estado.body.instancias.find((x: { id: string }) => x.id === i.id);
      expect(torre.drops).toHaveLength(2);
    });

    it("excluir instância com histórico só desativa; recriar com o mesmo nome reativa", async () => {
      const i = await criarInstancia(ana, { nome: "Cripta", recarga: "DIARIA" });
      await enviar("post", "/api/farm/checkins", ana, {
        personagemId: personagensAna[0]!.id,
        farmInstanciaId: i.id,
      }).expect(201);
      await enviar("delete", `/api/farm/instancias/${i.id}`, ana).expect(204);
      expect((await ler("/api/farm/estado", ana)).body.instancias).toEqual([]);
      expect(await ctx.prisma.farmCheckin.count()).toBe(1);
      const deNovo = await criarInstancia(ana, { nome: "CRIPTA", recarga: "SEMANAL" });
      expect(deNovo.id).toBe(i.id);
    });
  });

  describe("check-in (D51)", () => {
    let cripta: { id: string };
    let ori: string;

    beforeEach(async () => {
      cripta = await criarInstancia(ana, { nome: "Cripta", recarga: "DIARIA" });
      ori = (
        await enviar("post", `/api/farm/instancias/${cripta.id}/drops`, ana, {
          nome: "Oridecon",
          precoZeny: 10_000,
        })
      ).body.id;
    });

    const checkin = (personagemId: string, drops: object[] = []) =>
      enviar("post", "/api/farm/checkins", ana, { personagemId, farmInstanciaId: cripta.id, drops });

    it("registra os drops; a mesma instância no mesmo dia é recusada; outro personagem pode", async () => {
      const r = await checkin(personagensAna[0]!.id, [{ farmItemId: ori, quantidade: 3 }]).expect(201);
      expect(r.body.drops).toEqual([{ farmItemId: ori, nome: "Oridecon", quantidade: 3 }]);
      const repetido = await checkin(personagensAna[0]!.id).expect(409);
      expect(repetido.body.message).toContain("Libera amanhã às 04:00");
      await checkin(personagensAna[1]!.id).expect(201);
      const estado = await ler("/api/farm/estado", ana).expect(200);
      expect(estado.body.checkinsRecentes).toHaveLength(2);
    });

    it("quantidade 0 não é gravada; item de outra pessoa é recusado", async () => {
      const r = await checkin(personagensAna[0]!.id, [{ farmItemId: ori, quantidade: 0 }]).expect(201);
      expect(r.body.drops).toEqual([]);
      const itemBeto = (await enviar("post", "/api/farm/itens", beto, { nome: "Elunium" }).expect(201)).body
        .id;
      await checkin(personagensAna[1]!.id, [{ farmItemId: itemBeto, quantidade: 1 }]).expect(400);
    });

    it("3 dias: libera no terceiro dia depois do check-in", async () => {
      await enviar("patch", `/api/farm/instancias/${cripta.id}`, ana, { recarga: "TRES_DIAS" }).expect(200);
      await checkin(personagensAna[0]!.id).expect(201);
      const c = await ctx.prisma.farmCheckin.findFirstOrThrow();
      await ctx.prisma.farmCheckin.update({
        where: { id: c.id },
        data: { feitoEm: new Date(Date.now() - 2 * DIA_MS) },
      });
      await checkin(personagensAna[0]!.id).expect(409);
      await ctx.prisma.farmCheckin.update({
        where: { id: c.id },
        data: { feitoEm: new Date(Date.now() - 3 * DIA_MS) },
      });
      await checkin(personagensAna[0]!.id).expect(201);
    });

    it("editar drops e desfazer (que libera de novo)", async () => {
      const r = await checkin(personagensAna[0]!.id, [{ farmItemId: ori, quantidade: 1 }]).expect(201);
      const editado = await enviar("patch", `/api/farm/checkins/${r.body.id}`, ana, {
        drops: [{ farmItemId: ori, quantidade: 5 }],
      }).expect(200);
      expect(editado.body.drops[0].quantidade).toBe(5);
      await enviar("delete", `/api/farm/checkins/${r.body.id}`, ana).expect(204);
      await checkin(personagensAna[0]!.id).expect(201);
    });

    it("item com check-in não é excluído", async () => {
      await checkin(personagensAna[0]!.id, [{ farmItemId: ori, quantidade: 1 }]).expect(201);
      await enviar("delete", `/api/farm/itens/${ori}`, ana).expect(409);
    });

    it("lista os check-ins de um período para os totais", async () => {
      await checkin(personagensAna[0]!.id, [{ farmItemId: ori, quantidade: 2 }]).expect(201);
      const de = new Date(Date.now() - DIA_MS).toISOString();
      const ate = new Date(Date.now() + DIA_MS).toISOString();
      const r = await ler(`/api/farm/checkins?de=${de}&ate=${ate}`, ana).expect(200);
      expect(r.body).toHaveLength(1);
      expect(r.body[0]).toMatchObject({ nomeInstancia: "Cripta", personagemId: personagensAna[0]!.id });
      await ler(`/api/farm/checkins?de=${ate}&ate=${de}`, ana).expect(400);
    });

    it("ninguém enxerga nem altera o farm de outra pessoa", async () => {
      const r = await checkin(personagensAna[0]!.id).expect(201);
      const estadoBeto = await ler("/api/farm/estado", beto).expect(200);
      expect(estadoBeto.body).toMatchObject({ instancias: [], itens: [], checkinsRecentes: [] });
      await enviar("patch", `/api/farm/instancias/${cripta.id}`, beto, { nome: "Minha" }).expect(404);
      await enviar("delete", `/api/farm/checkins/${r.body.id}`, beto).expect(404);
      await enviar("patch", `/api/farm/itens/${ori}`, beto, { precoZeny: 1 }).expect(404);
      await enviar("post", "/api/farm/checkins", beto, {
        personagemId: personagemBeto,
        farmInstanciaId: cripta.id,
      }).expect(404);
    });
  });

  describe("busca de itens (D53)", () => {
    it("por nome: meus itens e o catálogo do grupo, sem repetir", async () => {
      await enviar("post", "/api/farm/itens", ana, { nome: "Oridecon" }).expect(201);
      await ctx.prisma.itemCatalogo.createMany({
        data: [
          { nome: "Oridecon", idJogo: 984 },
          { nome: "Oridecon Bruto", idJogo: 756 },
        ],
      });
      const r = await ler("/api/farm/itens/busca?q=orid", ana).expect(200);
      expect(r.body.resultados.map((x: { nome: string; origem: string }) => [x.nome, x.origem])).toEqual([
        ["Oridecon", "meus-itens"],
        ["Oridecon Bruto", "catalogo"],
      ]);
      expect(r.body.divinePride).toBe(false);
      await ler("/api/farm/itens/busca?q=o", ana).expect(400);
    });

    it("por ID sem chave da Divine Pride: não sai para a internet", async () => {
      const r = await ler("/api/farm/itens/busca?q=984", ana).expect(200);
      expect(r.body.resultados).toEqual([]);
      expect(ctx.divinePride.chamadas).toEqual([]);
    });
  });

  describe("busca pelo ID na Divine Pride (D53)", () => {
    let dp: Contexto;
    let cookie: string;

    beforeAll(async () => {
      dp = await criarApp({ divinePride: { chave: "chave-secreta", servidor: "bRO" } });
    });
    afterAll(async () => {
      await dp.fechar();
    });
    beforeEach(async () => {
      await dp.limparBanco();
      dp.divinePride.chamadas.length = 0;
      dp.divinePride.servidores.length = 0;
      dp.divinePride.respostas.clear();
      cookie = await dp.login("3001", "ana");
    });

    it("busca o nome uma vez, guarda e passa a achar pelo nome", async () => {
      dp.divinePride.respostas.set(984, { status: 200, corpo: { id: 984, name: "Oridecon" } });
      const r = await dp.http().get("/api/farm/itens/busca?q=984").set("Cookie", cookie).expect(200);
      expect(r.body).toMatchObject({
        divinePride: true,
        resultados: [{ nome: "Oridecon", idJogo: 984, origem: "divine-pride", farmItemId: null }],
      });
      expect(dp.divinePride.chamadas).toEqual([
        "https://www.divine-pride.net/api/database/Item/984?apiKey=chave-secreta",
      ]);
      expect(dp.divinePride.servidores).toEqual(["bRO"]);
      await dp.http().get("/api/farm/itens/busca?q=984").set("Cookie", cookie).expect(200);
      expect(dp.divinePride.chamadas).toHaveLength(1);
      const porNome = await dp.http().get("/api/farm/itens/busca?q=ORIDE").set("Cookie", cookie).expect(200);
      expect(porNome.body.resultados[0]).toMatchObject({ nome: "Oridecon", idJogo: 984 });
    });

    it("ID desconhecido fica guardado; falha de rede não", async () => {
      await dp.http().get("/api/farm/itens/busca?q=999999").set("Cookie", cookie).expect(200);
      await dp.http().get("/api/farm/itens/busca?q=999999").set("Cookie", cookie).expect(200);
      expect(dp.divinePride.chamadas).toHaveLength(1);
      dp.divinePride.respostas.set(501, "falha");
      await dp.http().get("/api/farm/itens/busca?q=501").set("Cookie", cookie).expect(200);
      await dp.http().get("/api/farm/itens/busca?q=501").set("Cookie", cookie).expect(200);
      expect(dp.divinePride.chamadas).toHaveLength(3);
    });
  });

  describe("importação do artefato (D54)", () => {
    const feito = Date.now() - 10 * DIA_MS;
    const backup = {
      kind: "diario-instancias-backup",
      v: 1,
      exportadoEm: new Date().toISOString(),
      personagens: [
        { id: "c1", nome: "Ana-MTK", classe: "" },
        { id: "c2", nome: "Alt", classe: "" },
      ],
      instancias: [
        { id: "n1", nome: "Cripta", recarga: "TRES_DIAS", personagens: ["c1", "c2"], drops: ["i1"] },
      ],
      itens: [{ id: "i1", nome: "Oridecon", precoZeny: 12_000 }],
      checkins: [
        {
          id: "k1",
          personagem: "c1",
          instancia: "n1",
          nomeInstancia: "Cripta",
          feitoEm: feito,
          drops: [
            { item: "i1", quantidade: 2, nome: "Oridecon" },
            { item: "i9", quantidade: 1, nome: "Carta Rara" },
          ],
        },
        { id: "k2", personagem: "c2", instancia: "n1", nomeInstancia: "Cripta", feitoEm: feito, drops: [] },
        { id: "k3", personagem: "c1", instancia: "n7", nomeInstancia: "Antiga", feitoEm: feito, drops: [] },
      ],
    };

    it("importa com o mapa de personagens e não duplica ao repetir", async () => {
      const corpo = { backup, personagens: { c1: personagensAna[0]!.id, c2: null } };
      const r = await enviar("post", "/api/farm/importar", ana, corpo).expect(200);
      expect(r.body).toEqual({
        itensCriados: 2,
        instanciasCriadas: 1,
        checkinsImportados: 2,
        checkinsJaImportados: 0,
        checkinsSemPersonagem: 1,
      });
      const estado = await ler("/api/farm/estado", ana).expect(200);
      expect(
        estado.body.instancias.map((i: { nome: string; recarga: string }) => [i.nome, i.recarga]),
      ).toEqual([["Cripta", "TRES_DIAS"]]);
      expect(estado.body.itens.find((i: { nome: string }) => i.nome === "Oridecon").precoZeny).toBe(12_000);
      const drops = await ctx.prisma.farmCheckinDrop.findMany({ include: { farmItem: true } });
      expect(drops.map((d) => [d.farmItem.nome, d.quantidade]).sort()).toEqual([
        ["Carta Rara", 1],
        ["Oridecon", 2],
      ]);
      // A instância apagada no artefato volta desativada, só para o histórico.
      expect(await ctx.prisma.farmInstancia.count({ where: { nome: "Antiga", ativa: false } })).toBe(1);

      const deNovo = await enviar("post", "/api/farm/importar", ana, corpo).expect(200);
      expect(deNovo.body).toMatchObject({ itensCriados: 0, checkinsImportados: 0, checkinsJaImportados: 2 });
      expect(await ctx.prisma.farmCheckin.count()).toBe(2);
    });

    it("recusa arquivo que não é backup e personagem de outra pessoa", async () => {
      await enviar("post", "/api/farm/importar", ana, { backup: { kind: "outra-coisa" } }).expect(400);
      await enviar("post", "/api/farm/importar", ana, { backup, personagens: { c1: personagemBeto } }).expect(
        400,
      );
    });
  });
});
