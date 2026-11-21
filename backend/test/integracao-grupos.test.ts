// GET /api/integracao/grupos-programados: o que o bot do Discord precisa para espelhar os grupos.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type Contexto, criarApp, ORIGEM, TOKEN_INTEGRACAO } from "./suporte/app-de-teste.js";

const HORA = 60 * 60 * 1000;
const ROTA = "/api/integracao/grupos-programados";
const DISCORD_ANA = "700000000000000101";

type Corpo = {
  geradoEm: string;
  urlInscricao: string;
  grupos: Array<{
    id: string;
    instancia: { id: string; nome: string };
    agendadoEm: string;
    fechadoEm: string | null;
    situacao: string;
    inscricoesAbertas: boolean;
    versao: string;
    vagas: Array<{
      posicao: number;
      tipo: string;
      classe: string | null;
      importancia: number | null;
      ocupada: boolean;
      ocupante: {
        personagem: string;
        jogador: string;
        discordId: string | null;
        nomeDiscord: string | null;
      } | null;
    }>;
  }>;
};

function vagas(classeId: string, personagemId: string | null = null) {
  return [
    { tipo: "OBRIGATORIA", classeId, importancia: 5, personagemId },
    { tipo: "SECUNDARIA", classeId, importancia: 2, personagemId: null },
    ...Array.from({ length: 10 }, () => ({
      tipo: "LIVRE",
      classeId: null,
      importancia: null,
      personagemId: null,
    })),
  ];
}

describe("Integração: grupos programados", () => {
  let ctx: Contexto;
  let desligada: Contexto;
  let classeId: string;
  let instanciaId: string;
  let personagemId: string;
  let criadorId: string;
  let cookieAna: string;

  const listar = async (contexto: Contexto = ctx): Promise<Corpo> =>
    (await contexto.http().get(ROTA).set("Authorization", `Bearer ${TOKEN_INTEGRACAO}`).expect(200))
      .body as Corpo;

  const criarGrupo = (agendadoEm: Date, extra: { fechadoEm?: Date; ocupante?: string } = {}) =>
    ctx.prisma.grupoInstancia.create({
      data: {
        instanciaId,
        agendadoEm,
        criadoPorId: criadorId,
        fechadoEm: extra.fechadoEm ?? null,
        vagas: vagas(classeId, extra.ocupante ?? null),
      },
    });

  beforeAll(async () => {
    ctx = await criarApp({ tokenIntegracao: TOKEN_INTEGRACAO, caminhoBase: "/emptyvariable" });
    desligada = await criarApp();
  });
  afterAll(async () => {
    await ctx.fechar();
    await desligada.fechar();
  });
  beforeEach(async () => {
    await ctx.limparBanco();
    cookieAna = await ctx.login(DISCORD_ANA, "ana.discord");
    const ana = await ctx.prisma.usuario.findUniqueOrThrow({ where: { discordId: DISCORD_ANA } });
    await ctx.prisma.usuario.update({ where: { id: ana.id }, data: { globalName: "Ana Global" } });
    criadorId = ana.id;
    classeId = (await ctx.prisma.classe.create({ data: { nomeOficial: "Mestre Taekwon" } })).id;
    instanciaId = (await ctx.prisma.instancia.create({ data: { nome: "Torre sem Fim", ativa: true } })).id;
    const jogador = await ctx.prisma.jogador.create({ data: { apelido: "Ana", usuarioId: ana.id } });
    personagemId = (
      await ctx.prisma.personagem.create({ data: { nome: "Ana-MTK", jogadorId: jogador.id, classeId } })
    ).id;
  });

  it("lista os grupos próximos com vagas resolvidas, ocupante e link de inscrição", async () => {
    const agendadoEm = new Date(Date.now() + 2 * HORA);
    const grupo = await criarGrupo(agendadoEm, { ocupante: personagemId });

    const corpo = await listar();

    expect(corpo.urlInscricao).toBe(`${ORIGEM}/emptyvariable/instancias-programadas`);
    expect(corpo.grupos).toHaveLength(1);
    const [item] = corpo.grupos;
    expect(item).toMatchObject({
      id: grupo.id,
      instancia: { id: instanciaId, nome: "Torre sem Fim" },
      agendadoEm: agendadoEm.toISOString(),
      fechadoEm: null,
      situacao: "ABERTO",
      inscricoesAbertas: true,
    });
    expect(item!.versao).toMatch(/^[0-9a-f]{16}$/);
    expect(item!.vagas).toHaveLength(12);
    expect(item!.vagas[0]).toEqual({
      posicao: 1,
      tipo: "OBRIGATORIA",
      classe: "Mestre Taekwon",
      importancia: 5,
      ocupada: true,
      ocupante: { personagem: "Ana-MTK", jogador: "Ana", discordId: DISCORD_ANA, nomeDiscord: "Ana Global" },
    });
    expect(item!.vagas[1]).toMatchObject({ posicao: 2, tipo: "SECUNDARIA", ocupada: false, ocupante: null });
    expect(item!.vagas[11]).toEqual({
      posicao: 12,
      tipo: "LIVRE",
      classe: null,
      importancia: null,
      ocupada: false,
      ocupante: null,
    });
  });

  it("a versão fica igual sem mudanças e muda quando alguém se inscreve pelo site", async () => {
    const grupo = await criarGrupo(new Date(Date.now() + 2 * HORA));
    const antes = (await listar()).grupos[0]!.versao;
    expect((await listar()).grupos[0]!.versao).toBe(antes);

    await ctx
      .http()
      .post(`/api/instancias-programadas/${grupo.id}/participar`)
      .set("Cookie", cookieAna)
      .set("Origin", ORIGEM)
      .send({ vaga: 1, personagemId })
      .expect(201);

    const depois = (await listar()).grupos[0]!;
    expect(depois.versao).not.toBe(antes);
    expect(depois.vagas[0]!.ocupante?.discordId).toBe(DISCORD_ANA);
  });

  it("renomear o personagem também muda a versão", async () => {
    await criarGrupo(new Date(Date.now() + 2 * HORA), { ocupante: personagemId });
    const antes = (await listar()).grupos[0]!.versao;
    await ctx.prisma.personagem.update({ where: { id: personagemId }, data: { nome: "Ana-Nova" } });
    const depois = (await listar()).grupos[0]!;
    expect(depois.versao).not.toBe(antes);
    expect(depois.vagas[0]!.ocupante?.personagem).toBe("Ana-Nova");
  });

  it("informa grupos fechados, recém-iniciados e de instância desativada; omite os antigos", async () => {
    const fechado = await criarGrupo(new Date(Date.now() + 3 * HORA), { fechadoEm: new Date() });
    const iniciado = await criarGrupo(new Date(Date.now() - 2 * HORA));
    await criarGrupo(new Date(Date.now() - 25 * HORA));

    let corpo = await listar();
    expect(corpo.grupos.map((g) => g.id)).toEqual([iniciado.id, fechado.id]);
    expect(corpo.grupos[0]).toMatchObject({ situacao: "ABERTO", inscricoesAbertas: false });
    expect(corpo.grupos[1]).toMatchObject({ situacao: "FECHADO", inscricoesAbertas: false });
    expect(corpo.grupos[1]!.fechadoEm).not.toBeNull();

    await ctx.prisma.instancia.update({ where: { id: instanciaId }, data: { ativa: false } });
    corpo = await listar();
    expect(corpo.grupos.map((g) => g.situacao)).toEqual(["INDISPONIVEL", "FECHADO"]);
  });

  it("jogador sem conta do Discord sai com discordId nulo", async () => {
    const semConta = await ctx.prisma.jogador.create({ data: { apelido: "Beto" } });
    const personagem = await ctx.prisma.personagem.create({
      data: { nome: "Beto-MTK", jogadorId: semConta.id, classeId },
    });
    await criarGrupo(new Date(Date.now() + HORA), { ocupante: personagem.id });
    const [vaga] = (await listar()).grupos[0]!.vagas;
    expect(vaga!.ocupante).toEqual({
      personagem: "Beto-MTK",
      jogador: "Beto",
      discordId: null,
      nomeDiscord: null,
    });
  });

  it("exige o token de integração; sessão de usuário não vale; desligada responde 503", async () => {
    await ctx.http().get(ROTA).expect(401);
    await ctx.http().get(ROTA).set("Cookie", cookieAna).expect(401);
    await desligada.http().get(ROTA).set("Authorization", `Bearer ${TOKEN_INTEGRACAO}`).expect(503);
  });

  it("a lista do site continua igual (sem dados de outros jogadores)", async () => {
    await criarGrupo(new Date(Date.now() + 2 * HORA), { ocupante: personagemId });
    const r = await ctx.http().get("/api/instancias-programadas").set("Cookie", cookieAna).expect(200);
    const [vaga] = (r.body as { grupos: Array<{ vagas: Array<Record<string, unknown>> }> }).grupos[0]!.vagas;
    expect(Object.keys(vaga!).sort()).toEqual(
      ["classe", "classeId", "importancia", "meuPersonagem", "ocupada", "tipo"].sort(),
    );
  });
});
