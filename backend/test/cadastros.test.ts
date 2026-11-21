import { CLASSES_LATAM } from "../src/cadastros/classes-latam.js";
// M3: classes e funções (T-10, US-01), parâmetros versionados (T-11, US-02), itens (T-12, US-04) e seeds.
import { calcularParticipacao, CONFIG_V1 } from "@betel/scoring";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { paraConfigMotor, PARAMETROS_V1 } from "../src/cadastros/config-pontuacao.service.js";
import { SeedService } from "../src/cadastros/seed.service.js";
import { ADMIN_DISCORD_ID, type Contexto, criarApp, ORIGEM } from "./suporte/app-de-teste.js";

interface Funcao {
  id: string;
  nome: string;
  rank: number;
  padrao: boolean;
}
interface Classe {
  id: string;
  nomeOficial: string;
  apelidoGrupo: string | null;
  ativa: boolean;
  funcoes: Funcao[];
}

describe("Cadastros (M3)", () => {
  let ctx: Contexto;
  let admin: string;
  let membro: string;

  const enviar = (metodo: "post" | "patch" | "delete", url: string, cookie: string, corpo: object = {}) =>
    ctx.http()[metodo](url).set("Cookie", cookie).set("Origin", ORIGEM).send(corpo);
  const get = (url: string, cookie = admin) => ctx.http().get(url).set("Cookie", cookie);

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
    membro = await ctx.login("3001", "membro");
  });

  async function classes(): Promise<Classe[]> {
    return (await get("/api/classes").expect(200)).body as Classe[];
  }
  const porApelido = async (apelido: string) => (await classes()).find((c) => c.apelidoGrupo === apelido)!;

  interface TabelaTorre {
    encontros: { nome: string; multiplicadorCentesimos: number }[];
    funcoes: { classeId: string; nome: string; rank: number; padrao: boolean }[];
  }
  /** Tabela vigente da Torre, no formato do corpo de uma nova versão. */
  async function torre(): Promise<{ id: string; tabela: TabelaTorre }> {
    const lista = (await get("/api/instancias").expect(200)).body as {
      id: string;
      codigo: string | null;
      vigente: {
        encontros: { nome: string; multiplicadorCentesimos: number }[];
        funcoes: { nome: string; rank: number; padrao: boolean; classe: { id: string } }[];
      };
    }[];
    const t = lista.find((i) => i.codigo === "TORRE_CONSTELACAO")!;
    return {
      id: t.id,
      tabela: {
        encontros: t.vigente.encontros.map((e) => ({
          nome: e.nome,
          multiplicadorCentesimos: e.multiplicadorCentesimos,
        })),
        funcoes: t.vigente.funcoes.map((f) => ({
          classeId: f.classe.id,
          nome: f.nome,
          rank: f.rank,
          padrao: f.padrao,
        })),
      },
    };
  }
  /** Cria uma versão nova da Torre com a tabela alterada por `mudar`. */
  async function versaoTorre(mudar: (t: TabelaTorre) => TabelaTorre, status: number, cookie = admin) {
    const t = await torre();
    return enviar("post", `/api/instancias/${t.id}/versoes`, cookie, mudar(t.tabela)).expect(status);
  }

  describe("seeds", () => {
    it("inserem as classes e ranks aprovados (D6, D8, D16, C10)", async () => {
      const lista = await classes();
      const resumo = Object.fromEntries(
        lista
          .filter((c) => c.funcoes.length > 0)
          .map((c) => [c.apelidoGrupo, c.funcoes.map((f) => `${f.nome}:${f.rank}${f.padrao ? "*" : ""}`)]),
      );
      expect(resumo).toEqual({
        MTK: ["Padrão:5*"],
        Magus: ["Dano:5", "Suporte com Cometa:3"],
        Sorcerer: ["Defesa anti-dragão:4*"],
        GX: ["Garra Sombria:3*"],
        Asceta: ["Buff ao MTK:3*"],
        Cardeal: ["Buffs e cura:3*"],
        Cientista: ["Proteção:2*"],
        Engenheiro: ["Suporte:2*"],
        RG: ["Sustentação:2*"],
        "Demais classes": ["Padrão:1*"],
      });
    });

    it("inserem a config v1 com os parâmetros aprovados (D2, D3, D9)", async () => {
      const v = (await get("/api/config-pontuacao/vigente").expect(200)).body;
      expect(v.versao).toBe(1);
      expect(paraConfigMotor(v)).toEqual(CONFIG_V1);
    });

    it("inserem os itens confirmados, com negociabilidade desconhecida", async () => {
      const itens = (await get("/api/itens").expect(200)).body as {
        nome: string;
        idJogo: number | null;
        negociavel: unknown;
      }[];
      expect(itens).toHaveLength(20); // 11 do M3 + 3 peças Astrais + 6 Nebulosas (Épico III)
      expect(itens.find((i) => i.nome === "Alma de Betelgeuse")?.idJogo).toBe(1000397);
      expect(itens.every((i) => i.negociavel === null)).toBe(true);
    });

    it("não duplicam nem sobrescrevem alterações do admin ao rodar de novo", async () => {
      const gx = await porApelido("GX");
      await versaoTorre(
        (t) => ({
          ...t,
          funcoes: t.funcoes.map((f) => (f.classeId === gx.id ? { ...f, rank: 4 } : f)),
        }),
        201,
      );
      expect(await ctx.app.get(SeedService).aplicar()).toEqual({
        config: false,
        torre: false,
        classes: false,
        itens: false,
        configLoja: false,
        catalogoEpico3: false,
        receitas: false,
        instanciasBrowiki: false,
        chefes: false,
        monstrosLatamTools: false,
      });
      expect((await porApelido("GX")).funcoes[0]!.rank).toBe(4);
      expect(await ctx.prisma.classe.count()).toBe(CLASSES_LATAM.length + 1);
    });

    it("receitas: item da fonte fora do catálogo não derruba o boot; semeia quando volta", async () => {
      await ctx.prisma.receitaPeca.deleteMany();
      await ctx.prisma.receitaComponente.deleteMany();
      await ctx.prisma.receita.deleteMany();
      await ctx.prisma.itemCatalogo.updateMany({
        where: { nome: "Fragmento de Meteorito" },
        data: { nome: "Fragmento renomeado" },
      });
      expect((await ctx.app.get(SeedService).aplicar()).receitas).toBe(false);
      expect(await ctx.prisma.receita.count()).toBe(0);

      await ctx.prisma.itemCatalogo.updateMany({
        where: { nome: "Fragmento renomeado" },
        data: { nome: "Fragmento de Meteorito" },
      });
      expect((await ctx.app.get(SeedService).aplicar()).receitas).toBe(true);
      expect(await ctx.prisma.receita.count()).toBe(9);
    });
  });

  describe("classes (US-01) e funções por instância (D45)", () => {
    it("CT-56: rank 0, 6, −1, 2,5 ou texto é rejeitado na versão; 1 e 5 são aceitos", async () => {
      const outra = await porApelido("Demais classes");
      for (const rank of [0, 6, -1, 2.5, "3", null]) {
        await versaoTorre(
          (t) => ({
            ...t,
            funcoes: [
              ...t.funcoes,
              { classeId: outra.id, nome: `r${String(rank)}`, rank: rank as number, padrao: false },
            ],
          }),
          400,
        );
      }
      await versaoTorre(
        (t) => ({
          ...t,
          funcoes: [
            ...t.funcoes,
            { classeId: outra.id, nome: "Mínimo", rank: 1, padrao: false },
            { classeId: outra.id, nome: "Máximo", rank: 5, padrao: false },
          ],
        }),
        201,
      );
      expect((await porApelido("Demais classes")).funcoes.map((f) => f.nome)).toEqual(
        expect.arrayContaining(["Mínimo", "Máximo"]),
      );
    });

    it("CT-57: o Magus tem Dano (5) e Suporte (3) e nenhuma função padrão (D16)", async () => {
      const magus = await porApelido("Magus");
      expect(magus.funcoes.map((f) => [f.nome, f.rank])).toEqual([
        ["Dano", 5],
        ["Suporte com Cometa", 3],
      ]);
      expect(magus.funcoes.some((f) => f.padrao)).toBe(false);
    });

    it("cria classe (sem funções: elas são de cada instância); nome repetido dá 409", async () => {
      const r = await enviar("post", "/api/classes", admin, {
        nomeOficial: "Classe Experimental",
        apelidoGrupo: "Arqui",
      }).expect(201);
      expect(r.body).toMatchObject({ nomeOficial: "Classe Experimental", funcoes: [] });
      await enviar("post", "/api/classes", admin, { nomeOficial: "Classe Experimental" }).expect(409);
    });

    it("duas funções padrão na mesma classe, ou nome repetido, recusam a versão", async () => {
      const gx = await porApelido("GX");
      await versaoTorre(
        (t) => ({
          ...t,
          funcoes: [...t.funcoes, { classeId: gx.id, nome: "Dano", rank: 2, padrao: true }],
        }),
        400,
      );
      await versaoTorre(
        (t) => ({
          ...t,
          funcoes: [...t.funcoes, { classeId: gx.id, nome: "garra sombria", rank: 2, padrao: false }],
        }),
        400,
      );
    });

    it("trocar a função padrão é uma versão nova; a anterior fica no histórico", async () => {
      const gx = await porApelido("GX");
      await versaoTorre(
        (t) => ({
          ...t,
          funcoes: [
            ...t.funcoes.map((f) => (f.classeId === gx.id ? { ...f, padrao: false } : f)),
            { classeId: gx.id, nome: "Dano", rank: 2, padrao: true },
          ],
        }),
        201,
      );
      const funcoes = (await porApelido("GX")).funcoes;
      expect(funcoes.filter((f) => f.padrao).map((f) => f.nome)).toEqual(["Dano"]);
      const { id } = await torre();
      const historico = (await get(`/api/instancias/${id}/versoes`).expect(200)).body as { versao: number }[];
      expect(historico.map((v) => v.versao)).toEqual([2, 1]);
    });

    it("desativa classe", async () => {
      const outra = await porApelido("Demais classes");
      await enviar("patch", `/api/classes/${outra.id}`, admin, { ativa: false }).expect(200);
      expect((await porApelido("Demais classes")).ativa).toBe(false);
    });
  });

  describe("parâmetros versionados (US-02)", () => {
    it("CT-59: nova versão com B = 120 passa a valer; a v1 continua consultável e intacta", async () => {
      const r = await enviar("post", "/api/config-pontuacao", admin, { ...PARAMETROS_V1, base: 120 }).expect(
        201,
      );
      expect(r.body.versao).toBe(2);
      const vigente = (await get("/api/config-pontuacao/vigente").expect(200)).body;
      expect(vigente.versao).toBe(2);
      const historico = (await get("/api/config-pontuacao").expect(200)).body as {
        versao: number;
        base: number;
      }[];
      expect(historico.map((v) => [v.versao, v.base])).toEqual([
        [2, 120],
        [1, 100],
      ]);
      const mtk = {
        rank: 5,
        multiplicadorEncontroCentesimos: 100,
        status: "CONCLUIDA",
        fracaoCentesimos: 100,
      } as const;
      expect(calcularParticipacao(mtk, paraConfigMotor(vigente)).pontos).toBe(360);
      expect(calcularParticipacao(mtk, paraConfigMotor(historico[1] as never)).pontos).toBe(300);
    });

    it("CT-60: α = 1,0 em nova versão → Cardeal (r3) vale 300", async () => {
      await enviar("post", "/api/config-pontuacao", admin, { ...PARAMETROS_V1, alphaCentesimos: 100 }).expect(
        201,
      );
      const vigente = (await get("/api/config-pontuacao/vigente").expect(200)).body;
      const cardeal = {
        rank: 3,
        multiplicadorEncontroCentesimos: 100,
        status: "CONCLUIDA",
        fracaoCentesimos: 100,
      } as const;
      expect(calcularParticipacao(cardeal, paraConfigMotor(vigente)).pontos).toBe(300);
    });

    it("rejeita versão incompleta, negativa, fracionária ou com teto acima de 100%", async () => {
      const { base: _base, ...semBase } = PARAMETROS_V1;
      await enviar("post", "/api/config-pontuacao", admin, semBase).expect(400);
      await enviar("post", "/api/config-pontuacao", admin, { ...PARAMETROS_V1, alphaCentesimos: -1 }).expect(
        400,
      );
      await enviar("post", "/api/config-pontuacao", admin, { ...PARAMETROS_V1, base: 100.5 }).expect(400);
      await enviar("post", "/api/config-pontuacao", admin, {
        ...PARAMETROS_V1,
        tetoCredoresBp: 10_001,
      }).expect(400);
      expect(await ctx.prisma.configPontuacao.count()).toBe(1);
    });
  });

  describe("catálogo de itens (US-04)", () => {
    it("cria, altera negociabilidade (inclusive de volta para desconhecida) e desativa", async () => {
      const r = await enviar("post", "/api/itens", admin, {
        nome: "Carta Naght Sieger",
        tipo: "CARTA",
      }).expect(201);
      expect(r.body).toMatchObject({ idJogo: null, negociavel: null, vinculadoConta: null, ativo: true });
      await enviar("patch", `/api/itens/${r.body.id}`, admin, { negociavel: true, idJogo: 4999999 }).expect(
        200,
      );
      const d = await enviar("patch", `/api/itens/${r.body.id}`, admin, {
        negociavel: null,
        ativo: false,
      }).expect(200);
      expect(d.body).toMatchObject({ negociavel: null, ativo: false, idJogo: 4999999 });
    });

    it("nome ou ID repetido dá 409; tipo inválido dá 400", async () => {
      await enviar("post", "/api/itens", admin, { nome: "pó de meteorito", tipo: "MATERIAL" }).expect(409);
      await enviar("post", "/api/itens", admin, { nome: "Outro", tipo: "MATERIAL", idJogo: 1000372 }).expect(
        409,
      );
      await enviar("post", "/api/itens", admin, { nome: "Outro", tipo: "ARMA" }).expect(400);
    });
  });

  it("CT-70: membro recebe 403 ao alterar parâmetros, classes, funções e itens", async () => {
    await enviar("post", "/api/config-pontuacao", membro, { ...PARAMETROS_V1, base: 1 }).expect(403);
    await enviar("post", "/api/classes", membro, { nomeOficial: "Hack" }).expect(403);
    await versaoTorre((t) => t, 403, membro);
    await enviar("post", "/api/itens", membro, { nome: "X", tipo: "OUTRO" }).expect(403);
    await get("/api/classes", membro).expect(403);
    await get("/api/config-pontuacao/vigente", membro).expect(403);
    expect((await porApelido("GX")).funcoes[0]!.rank).toBe(3);
  });
});
