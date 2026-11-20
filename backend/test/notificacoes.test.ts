// Notificações por DM para o nag4eyes: caixa de saída gravada com a mudança de negócio e a fila
// de entrega em /api/integracao/notificacoes (reservar e confirmar).
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AuditoriaService } from "../src/auditoria/auditoria.service.js";
import { SeedService } from "../src/cadastros/seed.service.js";
import { MAXIMO_TENTATIVAS } from "../src/notificacoes/notificacoes.service.js";
import {
  ADMIN_DISCORD_ID,
  type Contexto,
  criarApp,
  ORIGEM,
  TOKEN_INTEGRACAO,
} from "./suporte/app-de-teste.js";

interface Reservada {
  id: string;
  discordId: string;
  tipo: string;
  dados: Record<string, unknown>;
  criadaEm: string;
  tentativa: number;
}

describe("Notificações para o nag4eyes", () => {
  let ctx: Contexto;
  let admin: string;
  let adminId: string;
  const jogador: Record<string, string> = {};
  const cookie: Record<string, string> = {};
  const personagem: Record<string, string> = {};
  const funcao: Record<string, string> = {};
  let alma: string;

  const enviar = (url: string, corpo: object, c = admin) =>
    ctx.http().post(url).set("Cookie", c).set("Origin", ORIGEM).send(corpo);
  const integracao = (url: string, corpo?: object) =>
    ctx
      .http()
      .post(`/api/integracao/notificacoes/${url}`)
      .set("Authorization", `Bearer ${TOKEN_INTEGRACAO}`)
      .send(corpo);

  async function reservar(limite?: number): Promise<Reservada[]> {
    const r = await integracao("reservar", limite === undefined ? undefined : { limite }).expect(200);
    return r.body.notificacoes as Reservada[];
  }
  /** Notificações gravadas, sem passar pela fila (para conferir o que cada ação gerou). */
  async function gravadas() {
    return ctx.prisma.notificacao.findMany({ orderBy: [{ criadaEm: "asc" }, { tipo: "asc" }] });
  }
  async function creditar(jogadorId: string, valor: number) {
    await ctx.prisma.lancamentoPontos.create({
      data: { jogadorId, valor, tipo: "AJUSTE_ADMIN", criadoPorId: adminId, observacao: "teste" },
    });
  }
  /** Membro com usuário e jogador vinculados; `personagens` ganham id em `personagem`. */
  async function membro(discordId: string, apelido: string, personagens: string[] = []) {
    cookie[apelido] = await ctx.login(discordId, apelido.toLowerCase());
    const u = await ctx.prisma.usuario.findUniqueOrThrow({ where: { discordId } });
    const j = await ctx.prisma.jogador.create({
      data: { apelido, usuarioId: u.id, personagens: { create: personagens.map((nome) => ({ nome })) } },
      include: { personagens: true },
    });
    jogador[apelido] = j.id;
    for (const p of j.personagens) personagem[p.nome] = p.id;
  }
  const run = (participantes: object[]) => ({
    data: "2026-11-20",
    chefe: "NAGHT_25",
    status: "CONCLUIDA",
    participantes,
    drops: [],
  });

  beforeAll(async () => {
    ctx = await criarApp({ tokenIntegracao: TOKEN_INTEGRACAO });
  });
  afterAll(async () => {
    await ctx.fechar();
  });
  beforeEach(async () => {
    vi.restoreAllMocks();
    await ctx.limparBanco();
    await ctx.app.get(SeedService).aplicar();
    admin = await ctx.login(ADMIN_DISCORD_ID, "admin");
    adminId = (await ctx.prisma.usuario.findUniqueOrThrow({ where: { discordId: ADMIN_DISCORD_ID } })).id;
    await membro("9001", "Ana", ["Ana-MTK"]);
    await membro("9002", "Bia", ["Bia-GX"]);
    const semUsuario = await ctx.prisma.jogador.create({
      data: { apelido: "Caio", personagens: { create: [{ nome: "Caio-GX" }] } },
      include: { personagens: true },
    });
    jogador["Caio"] = semUsuario.id;
    personagem["Caio-GX"] = semUsuario.personagens[0]!.id;
    for (const c of await ctx.prisma.classe.findMany({ include: { funcoes: true } })) {
      if (c.funcoes.length === 1) funcao[c.apelidoGrupo!] = c.funcoes[0]!.id;
    }
    alma = (await ctx.prisma.itemCatalogo.findUniqueOrThrow({ where: { nome: "Alma de Betelgeuse" } })).id;
    await ctx.prisma.itemCatalogo.update({
      where: { id: alma },
      data: { negociavel: true, vinculadoConta: false },
    });
  });

  describe("eventos gravados com a mudança de negócio", () => {
    it("run registrada: cada jogador com usuário recebe o líquido da run, com participação e empréstimos", async () => {
      await enviar(
        "/api/runs",
        run([
          {
            personagemId: personagem["Bia-GX"],
            funcaoId: funcao["GX"],
            emprestimos: [{ credorJogadorId: jogador["Ana"], categoria: "ESSENCIAL", itemDescricao: "Arma" }],
          },
          { personagemId: personagem["Caio-GX"], funcaoId: funcao["GX"] },
        ]),
      ).expect(201);
      const lista = await gravadas();
      expect(lista.map((n) => [n.discordId, n.tipo])).toEqual(
        expect.arrayContaining([
          ["9001", "RUN_PONTOS"],
          ["9002", "RUN_PONTOS"],
        ]),
      );
      expect(lista).toHaveLength(2); // Caio não tem usuário
      const bia = lista.find((n) => n.discordId === "9002")!.dados;
      expect(bia).toMatchObject({
        instancia: "Torre da Constelação",
        encontro: expect.any(String),
        data: "2026-11-20",
        status: "CONCLUIDA",
        participacao: 200,
        emprestimosPagos: 40,
        emprestimosRecebidos: 0,
        pontos: 160,
      });
      const ana = lista.find((n) => n.discordId === "9001")!.dados;
      expect(ana).toMatchObject({
        participacao: 0,
        emprestimosPagos: 0,
        emprestimosRecebidos: 40,
        pontos: 40,
      });
    });

    it("correção da run: só quem teve o saldo alterado recebe RUN_CORRIGIDA, com antes e depois", async () => {
      const r = await enviar(
        "/api/runs",
        run([
          { personagemId: personagem["Ana-MTK"], funcaoId: funcao["MTK"] },
          { personagemId: personagem["Bia-GX"], funcaoId: funcao["GX"] },
        ]),
      ).expect(201);
      await ctx.prisma.notificacao.deleteMany();
      const nova = await enviar(`/api/runs/${r.body.runId}/corrigir`, {
        motivo: "Ana saiu na metade",
        run: run([
          { personagemId: personagem["Ana-MTK"], funcaoId: funcao["MTK"], fracaoCentesimos: 50 },
          { personagemId: personagem["Bia-GX"], funcaoId: funcao["GX"] },
        ]),
      }).expect(201);
      const lista = await gravadas();
      expect(lista).toHaveLength(1);
      expect(lista[0]).toMatchObject({ discordId: "9001", tipo: "RUN_CORRIGIDA" });
      expect(lista[0]!.dados).toMatchObject({
        runOriginalId: r.body.runId,
        runId: nova.body.runId,
        pontosAntes: 300,
        pontosDepois: 150,
      });
    });

    it("transferência: o destinatário recebe; quem enviou não", async () => {
      await creditar(jogador["Ana"]!, 100);
      await enviar(
        "/api/carteira/transferencias",
        { id: "6f9c1a7e-6a59-4c55-9d0c-1f6f7f0b2a10", destinatarioId: jogador["Bia"], pontos: 30 },
        cookie["Ana"],
      ).expect(201);
      const lista = await gravadas();
      expect(lista).toHaveLength(1);
      expect(lista[0]).toMatchObject({
        discordId: "9002",
        tipo: "TRANSFERENCIA_RECEBIDA",
        dados: { transferenciaId: "6f9c1a7e-6a59-4c55-9d0c-1f6f7f0b2a10", pontos: 30, remetente: "Ana" },
      });
    });

    describe("loja", () => {
      async function compraDaAna(quantidade: number, consignadoDaBia = false): Promise<string> {
        await enviar("/api/loja/precos", { itemId: alma, precoPontos: 100 }).expect(201);
        if (consignadoDaBia) {
          const oferta = await ctx.prisma.ofertaVenda.create({
            data: { jogadorId: jogador["Bia"]!, itemId: alma, quantidade, status: "APROVADA" },
          });
          const lote = await ctx.prisma.loteEstoque.create({
            data: {
              itemId: alma,
              donoJogadorId: jogador["Bia"]!,
              origem: "OFERTA",
              ofertaId: oferta.id,
              criadoPorId: adminId,
            },
          });
          await ctx.prisma.movimentoEstoque.create({
            data: { loteId: lote.id, quantidade, tipo: "ENTRADA", criadoPorId: adminId },
          });
        } else {
          await enviar("/api/estoque/entradas", { itemId: alma, quantidade }).expect(201);
        }
        await creditar(jogador["Ana"]!, 1000);
        const r = await enviar("/api/loja/compras", { itemId: alma, quantidade }, cookie["Ana"]).expect(201);
        expect(await gravadas()).toHaveLength(0); // a própria compra não gera DM
        return r.body.compraId as string;
      }

      it("entrega: o comprador recebe COMPRA_ENTREGUE e o dono do consignado, VENDA_CREDITADA", async () => {
        const compraId = await compraDaAna(2, true);
        await enviar(`/api/compras/${compraId}/entregar`, {}).expect(200);
        const lista = await gravadas();
        expect(lista.map((n) => ({ discordId: n.discordId, tipo: n.tipo, dados: n.dados }))).toEqual(
          expect.arrayContaining([
            {
              discordId: "9001",
              tipo: "COMPRA_ENTREGUE",
              dados: { compraId, item: "Alma de Betelgeuse", quantidade: 2, total: 200 },
            },
            {
              discordId: "9002",
              tipo: "VENDA_CREDITADA",
              dados: { compraId, item: "Alma de Betelgeuse", quantidade: 2, pontos: 200 },
            },
          ]),
        );
        expect(lista).toHaveLength(2);
      });

      it("cancelamento pelo próprio membro não gera DM; pelo admin gera COMPRA_CANCELADA com o motivo", async () => {
        const propria = await compraDaAna(1);
        await enviar(`/api/loja/compras/${propria}/cancelar`, {}, cookie["Ana"]).expect(200);
        expect(await gravadas()).toHaveLength(0);

        const r = await enviar("/api/loja/compras", { itemId: alma, quantidade: 1 }, cookie["Ana"]).expect(
          201,
        );
        await enviar(`/api/compras/${r.body.compraId}/cancelar`, { motivo: "Item acabou no jogo" }).expect(
          200,
        );
        const lista = await gravadas();
        expect(lista).toHaveLength(1);
        expect(lista[0]).toMatchObject({
          discordId: "9001",
          tipo: "COMPRA_CANCELADA",
          dados: {
            compraId: r.body.compraId,
            item: "Alma de Betelgeuse",
            quantidade: 1,
            total: 100,
            motivo: "Item acabou no jogo",
          },
        });
      });

      it("oferta aprovada e oferta rejeitada avisam o vendedor", async () => {
        const [a, b] = await Promise.all(
          [3, 4].map((quantidade) =>
            ctx.prisma.ofertaVenda.create({ data: { jogadorId: jogador["Bia"]!, itemId: alma, quantidade } }),
          ),
        );
        await enviar(`/api/ofertas/${a!.id}/aprovar`, {}).expect(200);
        await enviar(`/api/ofertas/${b!.id}/rejeitar`, { motivo: "Preço errado" }).expect(200);
        const lista = await gravadas();
        expect(lista.map((n) => ({ tipo: n.tipo, discordId: n.discordId, dados: n.dados }))).toEqual([
          {
            tipo: "OFERTA_APROVADA",
            discordId: "9002",
            dados: { ofertaId: a!.id, item: "Alma de Betelgeuse", quantidade: 3 },
          },
          {
            tipo: "OFERTA_REJEITADA",
            discordId: "9002",
            dados: { ofertaId: b!.id, item: "Alma de Betelgeuse", quantidade: 4, motivo: "Preço errado" },
          },
        ]);
      });

      it("se a transação falha depois de gravar, a notificação é desfeita junto", async () => {
        const compraId = await compraDaAna(1);
        vi.spyOn(ctx.app.get(AuditoriaService), "registrar").mockRejectedValueOnce(
          new Error("falha simulada"),
        );
        await enviar(`/api/compras/${compraId}/entregar`, {}).expect(500);
        expect(await gravadas()).toHaveLength(0);
        const compra = await ctx.prisma.compra.findUniqueOrThrow({ where: { id: compraId } });
        expect(compra.status).toBe("PENDENTE_ENTREGA");
      });
    });

    it("vínculo aprovado e vínculo rejeitado avisam quem pediu", async () => {
      const dani = await ctx.login("9004", "dani");
      const pedido = await enviar(
        "/api/vinculo/solicitacoes",
        { apelidoProposto: "Dani", personagensNovos: ["Dani-MTK"] },
        dani,
      ).expect(201);
      await enviar(`/api/vinculo/solicitacoes/${pedido.body.id}/aprovar`, {}).expect(200);

      const edu = await ctx.login("9005", "edu");
      const outro = await enviar(
        "/api/vinculo/solicitacoes",
        { apelidoProposto: "Edu", personagensNovos: ["Edu-MTK"] },
        edu,
      ).expect(201);
      await enviar(`/api/vinculo/solicitacoes/${outro.body.id}/rejeitar`, { motivo: "Não é do clã" }).expect(
        200,
      );

      const lista = await gravadas();
      expect(lista.map((n) => ({ discordId: n.discordId, tipo: n.tipo, dados: n.dados }))).toEqual([
        {
          discordId: "9004",
          tipo: "VINCULO_APROVADO",
          dados: { solicitacaoId: pedido.body.id, jogador: "Dani", personagens: ["Dani-MTK"] },
        },
        {
          discordId: "9005",
          tipo: "VINCULO_REJEITADO",
          dados: { solicitacaoId: outro.body.id, motivo: "Não é do clã" },
        },
      ]);
    });

    it("Nebula: entrega e rejeição pelo admin avisam; cancelamento pelo próprio membro não", async () => {
      const receita = await ctx.prisma.receita.findUniqueOrThrow({
        where: { nome: "Armadura Nebulosa POD" },
      });
      const preco = await ctx.prisma.precoReceita.create({
        data: { receitaId: receita.id, versao: 1, precoComPeca: 800, precoTrazendoPeca: 500 },
      });
      const nova = () =>
        ctx.prisma.solicitacaoNebula.create({
          data: {
            jogadorId: jogador["Ana"]!,
            receitaId: receita.id,
            trazPeca: true,
            preco: 500,
            precoReceitaId: preco.id,
          },
        });
      const [entregue, rejeitada, cancelada] = [await nova(), await nova(), await nova()];
      await enviar(`/api/nebula/solicitacoes/${entregue.id}/entregar`, {}).expect(200);
      await enviar(`/api/nebula/solicitacoes/${rejeitada.id}/rejeitar`, { motivo: "Sem material" }).expect(
        200,
      );
      await enviar(`/api/nebula/solicitacoes/${cancelada.id}/cancelar`, {}, cookie["Ana"]).expect(200);
      const lista = await gravadas();
      expect(lista.map((n) => ({ discordId: n.discordId, tipo: n.tipo, dados: n.dados }))).toEqual([
        {
          discordId: "9001",
          tipo: "NEBULA_ENTREGUE",
          dados: { solicitacaoId: entregue.id, receita: "Armadura Nebulosa POD" },
        },
        {
          discordId: "9001",
          tipo: "NEBULA_REJEITADA",
          dados: {
            solicitacaoId: rejeitada.id,
            receita: "Armadura Nebulosa POD",
            pontos: 500,
            motivo: "Sem material",
          },
        },
      ]);
    });

    it("usuário desativado não recebe notificação", async () => {
      await ctx.prisma.usuario.update({ where: { discordId: "9002" }, data: { ativo: false } });
      await creditar(jogador["Ana"]!, 100);
      await enviar(
        "/api/carteira/transferencias",
        { id: "0a7f3b0e-2d7c-4c1e-8f5e-6a3d9b1c2e40", destinatarioId: jogador["Bia"], pontos: 10 },
        cookie["Ana"],
      ).expect(404); // destinatário sem vínculo ativo
      await ctx.prisma.usuario.update({ where: { discordId: "9002" }, data: { ativo: true } });
      const oferta = await ctx.prisma.ofertaVenda.create({
        data: { jogadorId: jogador["Bia"]!, itemId: alma, quantidade: 1 },
      });
      await ctx.prisma.usuario.update({ where: { discordId: "9002" }, data: { ativo: false } });
      await enviar(`/api/ofertas/${oferta.id}/rejeitar`, { motivo: "Teste" }).expect(200);
      expect(await gravadas()).toHaveLength(0);
    });
  });

  describe("fila de entrega (/api/integracao/notificacoes)", () => {
    async function tres(): Promise<string[]> {
      const ids: string[] = [];
      for (const [i, discordId] of ["9001", "9002", "9003"].entries()) {
        const n = await ctx.prisma.notificacao.create({
          data: {
            discordId,
            tipo: "TRANSFERENCIA_RECEBIDA",
            dados: { transferenciaId: `t${i}`, pontos: i + 1, remetente: "Ana" },
            criadaEm: new Date(Date.now() - (10 - i) * 1000),
          },
        });
        ids.push(n.id);
      }
      return ids;
    }

    it("reserva em ordem de criação, respeita o limite e não devolve o que está reservado", async () => {
      const ids = await tres();
      const primeiro = await reservar(2);
      expect(primeiro.map((n) => n.id)).toEqual(ids.slice(0, 2));
      expect(primeiro[0]).toMatchObject({
        discordId: "9001",
        tipo: "TRANSFERENCIA_RECEBIDA",
        dados: { transferenciaId: "t0", pontos: 1, remetente: "Ana" },
        tentativa: 1,
      });
      expect(Date.parse(primeiro[0]!.criadaEm)).not.toBeNaN();
      expect((await reservar()).map((n) => n.id)).toEqual([ids[2]]);
      expect(await reservar()).toEqual([]);
    });

    it("sem confirmação, volta quando a reserva vence, com a tentativa seguinte", async () => {
      const [id] = await tres();
      await reservar(1);
      await ctx.prisma.notificacao.update({
        where: { id: id! },
        data: { reservadaAte: new Date(Date.now() - 1000) },
      });
      const de_novo = await reservar(1);
      expect(de_novo).toEqual([expect.objectContaining({ id, tentativa: 2 })]);
    });

    it("confirmadas não voltam; repetir a confirmação ou confirmar ID desconhecido é ignorado", async () => {
      const [a, b, c] = await tres();
      await reservar();
      const r = await integracao("confirmar", {
        resultados: [
          { id: a, status: "ENTREGUE" },
          { id: b, status: "FALHOU", motivo: "DMs fechadas" },
        ],
      }).expect(200);
      expect(r.body).toEqual({ confirmadas: 2, ignoradas: [] });
      const salvas = await ctx.prisma.notificacao.findMany({ where: { id: { in: [a!, b!] } } });
      expect(salvas.find((n) => n.id === b)).toMatchObject({ status: "FALHOU", motivoFalha: "DMs fechadas" });
      expect(salvas.find((n) => n.id === a)).toMatchObject({ status: "ENTREGUE", motivoFalha: null });
      expect(salvas.every((n) => n.confirmadaEm !== null && n.reservadaAte === null)).toBe(true);

      await ctx.prisma.notificacao.updateMany({ data: { reservadaAte: new Date(Date.now() - 1000) } });
      expect((await reservar()).map((n) => n.id)).toEqual([c]);

      const desconhecido = "11111111-2222-4333-8444-555555555555";
      const repetida = await integracao("confirmar", {
        resultados: [
          { id: a, status: "FALHOU" },
          { id: desconhecido, status: "ENTREGUE" },
        ],
      }).expect(200);
      expect(repetida.body).toEqual({ confirmadas: 0, ignoradas: [a, desconhecido] });
      expect((await ctx.prisma.notificacao.findUniqueOrThrow({ where: { id: a! } })).status).toBe("ENTREGUE");
    });

    it("confirmar valida o corpo (400)", async () => {
      await integracao("confirmar", {}).expect(400);
      await integracao("confirmar", { resultados: [] }).expect(400);
      await integracao("confirmar", { resultados: [{ id: "x", status: "ENTREGUE" }] }).expect(400);
      await integracao("confirmar", {
        resultados: [{ id: "11111111-2222-4333-8444-555555555555", status: "PENDENTE" }],
      }).expect(400);
      await integracao("confirmar", {
        resultados: Array.from({ length: 101 }, () => ({
          id: "11111111-2222-4333-8444-555555555555",
          status: "ENTREGUE",
        })),
      }).expect(400);
      await integracao("reservar", { limite: 0 }).expect(400);
      await integracao("reservar", { limite: 101 }).expect(400);
    });

    it("retenção: pendente velha expira, a que esgotou as tentativas falha e confirmada antiga é apagada", async () => {
      const dia = 86_400_000;
      const base = {
        discordId: "9001",
        tipo: "NEBULA_ENTREGUE",
        dados: { solicitacaoId: "s", receita: "r" },
      };
      const velha = await ctx.prisma.notificacao.create({
        data: { ...base, criadaEm: new Date(Date.now() - 8 * dia) },
      });
      const esgotada = await ctx.prisma.notificacao.create({
        data: { ...base, tentativas: MAXIMO_TENTATIVAS, reservadaAte: new Date(Date.now() - 1000) },
      });
      const antiga = await ctx.prisma.notificacao.create({
        data: { ...base, status: "ENTREGUE", confirmadaEm: new Date(Date.now() - 31 * dia) },
      });
      const recente = await ctx.prisma.notificacao.create({
        data: { ...base, status: "FALHOU", confirmadaEm: new Date(Date.now() - 29 * dia) },
      });
      expect(await reservar()).toEqual([]);
      const restantes = await ctx.prisma.notificacao.findMany();
      expect(restantes.map((n) => n.id).sort()).toEqual([velha.id, esgotada.id, recente.id].sort());
      expect(restantes.find((n) => n.id === velha.id)).toMatchObject({
        status: "FALHOU",
        motivoFalha: "expirada",
      });
      expect(restantes.find((n) => n.id === esgotada.id)).toMatchObject({
        status: "FALHOU",
        motivoFalha: "sem confirmação",
      });
      expect(restantes.some((n) => n.id === antiga.id)).toBe(false);
    });

    it("exige o token de integração; sessão de usuário não vale", async () => {
      await ctx.http().post("/api/integracao/notificacoes/reservar").expect(401);
      await ctx
        .http()
        .post("/api/integracao/notificacoes/reservar")
        .set("Cookie", admin)
        .set("Origin", ORIGEM)
        .expect(401);
    });
  });
});

describe("Notificações com a integração desligada", () => {
  let ctx: Contexto;

  beforeAll(async () => {
    ctx = await criarApp();
  });
  afterAll(async () => {
    await ctx.fechar();
  });

  it("sem INTEGRACAO_TOKEN nada é gravado e a fila responde 503", async () => {
    await ctx.limparBanco();
    await ctx.app.get(SeedService).aplicar();
    const admin = await ctx.login(ADMIN_DISCORD_ID, "admin");
    const edu = await ctx.login("9005", "edu");
    const pedido = await ctx
      .http()
      .post("/api/vinculo/solicitacoes")
      .set("Cookie", edu)
      .set("Origin", ORIGEM)
      .send({ apelidoProposto: "Edu", personagensNovos: ["Edu-MTK"] })
      .expect(201);
    await ctx
      .http()
      .post(`/api/vinculo/solicitacoes/${pedido.body.id}/aprovar`)
      .set("Cookie", admin)
      .set("Origin", ORIGEM)
      .expect(200);
    expect(await ctx.prisma.notificacao.count()).toBe(0);
    await ctx
      .http()
      .post("/api/integracao/notificacoes/reservar")
      .set("Authorization", `Bearer ${TOKEN_INTEGRACAO}`)
      .expect(503);
  });
});
