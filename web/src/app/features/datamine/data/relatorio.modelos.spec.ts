import { RELATORIO_EXEMPLO } from "./relatorio.exemplo";
import {
  emTexto,
  formatarBytes,
  mapearRelatorio,
  relatorioVazio,
  rotuloDoCampo,
  rotuloDoTipoGrf,
} from "./relatorio.modelos";

describe("mapearRelatorio", () => {
  it("entrada vazia, nula ou de tipo errado vira um relatório vazio, sem lançar", () => {
    for (const bruto of [undefined, null, 42, "x", [], {}, { items: 3, grf: "não", lua: {}, meta: [] }]) {
      const r = mapearRelatorio(bruto);
      expect(relatorioVazio(r)).toBeTrue();
      expect(r.meta.titulo).toBe("");
      expect(r.meta.patches).toEqual([]);
      expect([r.meta.ragexeNovo, r.meta.grfReempacotado]).toEqual([false, false]);
      expect([r.meta.grfAntes, r.meta.snapshotAntes, r.meta.pastas]).toEqual([null, null, []]);
    }
  });

  it("registros quebrados dentro das listas viram linhas neutras, sem lançar", () => {
    const r = mapearRelatorio({
      items: { added: [null, 7, { id: "12", desc: "uma\nduas" }], changed: [{}] },
      packages: { added: [{ rows: [null, { prob: "x" }] }] },
      grf: { added: [null, [], ["só o caminho"]], summary: ["x"] },
      lua: [null, { diff: [null] }],
      text: [{ lines: "a\nb" }],
    });
    expect(r.itensNovos.map((i) => [i.id, i.descricao.length])).toEqual([
      [0, 0],
      [0, 0],
      [12, 2],
    ]);
    expect(r.itensAlterados[0]?.campos).toEqual([]);
    expect(r.caixas[0]?.linhas.length).toBe(2);
    expect(r.arquivosGrf.map((a) => a.caminho)).toEqual(["", "", "só o caminho"]);
    expect(r.tabelasLua[1]?.mudancas).toEqual([{ op: "chg", caminho: "", antes: "", depois: "" }]);
    expect(r.textos[0]?.linhas).toEqual(["a", "b"]);
  });

  it("meta: título, patches, snapshots, Ragexe novo pelo sha1 e GRF reempacotado pelo tbl_off", () => {
    const { meta } = mapearRelatorio(RELATORIO_EXEMPLO);
    expect(meta.titulo).toBe("Patch LATAM 2026-11-24");
    expect(meta.patches.length).toBe(3);
    expect(meta.snapshotAntes).toEqual({ tirado: "2026-11-23 21:48:42", rotulo: "" });
    expect(meta.snapshotDepois).toEqual({ tirado: "2026-11-23 22:43:13", rotulo: "post" });
    expect(meta.ragexeNovo).toBeTrue();
    expect([meta.ragexeAntes?.tamanho, meta.ragexeDepois?.tamanho]).toEqual([21916168, 21993480]);
    expect(meta.grfReempacotado).toBeTrue();
    expect(meta.grfAntes).toEqual({ tamanho: 4630153990, entradas: 280173 });
    expect(meta.grfDepois).toEqual({ tamanho: 4630153990, entradas: 281129 });
    expect(meta.pastas).toEqual([
      { nome: "System", novos: [], alterados: ["iteminfo_new.lub", "mapInfo_ptBR.lub"], removidos: [] },
      {
        nome: "grf_text",
        novos: ["data\\luafiles514\\lua files\\effecttool\\1@vrcas.lub"],
        alterados: ["data\\buyingstoreitemlist.txt"],
        removidos: [],
      },
    ]);
  });

  it("meta: sha1 e tbl_off iguais, ou um lado ausente, não contam como mudança", () => {
    const igual = mapearRelatorio({
      meta: {
        ragexe: { old: { sha1: "a" }, new: { sha1: "a" } },
        grf: { old: { tbl_off: 7 }, new: { tbl_off: 7 } },
      },
    }).meta;
    expect([igual.ragexeNovo, igual.grfReempacotado]).toEqual([false, false]);
    const semAntes = mapearRelatorio({
      meta: { ragexe: { new: { sha1: "b" } }, grf: { new: { tbl_off: 7 } } },
    }).meta;
    expect([semAntes.ragexeNovo, semAntes.grfReempacotado]).toEqual([false, false]);
  });

  it("itens: campos, categoria pela faixa de ID e texto de busca sem cor, atalho nem acento", () => {
    const r = mapearRelatorio(RELATORIO_EXEMPLO);
    expect(r.itensNovos.map((i) => [i.id, i.categoria])).toEqual([
      [9178, "pet"],
      [24816, "sombrio"],
      [31588, "visual"],
      [108642, "caixa"],
      [311500, "encanto"],
      [450200, "armadura"],
      [550010, "arma"],
      [1000855, "material"],
      [32245, "outro"],
    ]);
    const tiara = r.itensNovos.find((i) => i.id === 31588)!;
    expect([tiara.traje, tiara.visual, tiara.efeito, tiara.slots]).toEqual([true, 2100, 1186, 0]);
    expect(r.itensNovos.find((i) => i.id === 550010)?.slots).toBe(2);
    expect(r.itensNovos.find((i) => i.id === 9178)?.efeito).toBeNull();

    const pedra = r.itensNovos.find((i) => i.id === 1000855)!;
    expect(pedra.descricao[0]).toContain("<NAVI>");
    expect(pedra.busca).toContain("[trocador de lembrancas especiais] (prt_elib 29,50)");
    expect(pedra.busca).toContain("crit + 10 em malha do palacio");
    expect(pedra.busca).not.toContain("^");
    expect(r.itensRemovidos.map((i) => i.id)).toEqual([999]);
  });

  it("itens alterados guardam o antes, o depois e os campos; a busca acha o nome antigo", () => {
    const [capelo, pocao] = mapearRelatorio(RELATORIO_EXEMPLO).itensAlterados;
    expect(capelo?.campos).toEqual(["identifiedDescriptionName"]);
    expect([capelo?.antes.descricao.length, capelo?.depois.descricao.length]).toEqual([4, 5]);
    expect(pocao?.antes.nome).toBe("Poção Gelada");
    expect(pocao?.depois.nome).toBe("Poção Invernal");
    expect(pocao?.busca).toContain("pocao gelada");
    expect(pocao?.busca).toContain("pocao invernal");
    expect(pocao?.categoria).toBe("visual");
  });

  it("caixas: peso zero é bônus garantido; sem pct, a chance sai do peso; o anterior só quando veio", () => {
    const { caixas } = mapearRelatorio(RELATORIO_EXEMPLO);
    expect(caixas.map((c) => [c.id, c.situacao, c.linhasAntes === null])).toEqual([
      [108642, "novo", true],
      [101161, "alterado", false],
    ]);
    expect(caixas[0]?.linhas.map((l) => [l.id, l.pct, l.garantido])).toEqual([
      [6635, 0.3, false],
      [31588, 50, false],
      [23548, 49.7, false],
      [25303, 0, true],
    ]);
    expect(caixas[1]?.linhas.map((l) => l.pct)).toEqual([3, 50, 47]);
    expect(caixas[0]?.busca).toContain("bombom gelado");
  });

  it("monstros, skills, mapas e quests: novos soltos e alterados em {old, new}", () => {
    const r = mapearRelatorio(RELATORIO_EXEMPLO);
    expect(r.monstros.map((m) => [m.id, m.situacao, m.sprite, m.antes?.sprite ?? null])).toEqual([
      [10509, "novo", "4_vr_book_fairy", null],
      [21633, "novo", "vr_agnes", null],
      [1002, "alterado", "poring_winter", "poring"],
    ]);

    const [nova, alterada] = r.skills;
    expect([nova?.id, nova?.situacao, nova?.nivelMaximo, nova?.descricaoAntes]).toEqual([
      5501,
      "novo",
      5,
      null,
    ]);
    expect(nova?.info).toContain('"MaxLv": 5');
    expect(nova?.mudancas).toEqual([]);
    expect([alterada?.id, alterada?.nome, alterada?.situacao]).toEqual([
      2419,
      "Poema de Niflheim",
      "alterado",
    ]);
    expect(alterada?.descricaoAntes).toEqual(["Poema do Submundo", "Prende os alvos por 8 segundos."]);
    expect(alterada?.mudancas).toEqual([
      "/info/SkillName: Poema do Submundo → Poema de Niflheim",
      "/name: Poema do Submundo → Poema de Niflheim",
    ]);

    expect(r.mapas.map((m) => [m.mapa, m.situacao, m.antes?.nome ?? null])).toEqual([
      ["1@vrcas.rsw", "novo", null],
      ["prt_elib.rsw", "alterado", "Biblioteca de Prontera"],
    ]);
    expect(r.mapas[0]?.placa).toBe("Palácio Lilium / Livro de Ilusões - 001");

    expect(r.quests.map((q) => [q.id, q.situacao, q.titulo, q.antes?.titulo ?? null])).toEqual([
      [8806, "novo", "Criei uma planta", null],
      [3460, "alterado", "[Espera] Investigar a Ilha da Tartaruga", "[Espera] Investigar a Tartaruga"],
    ]);
    expect(r.quests[1]?.busca).toContain("[orian] (tur_d03_i 125,186)");
  });

  it("GRF: novos, alterados (tamanho antes e depois) e removidos, em tupla ou só o caminho", () => {
    const r = mapearRelatorio(RELATORIO_EXEMPLO);
    expect(r.arquivosGrf.map((a) => [a.situacao, a.caminho, a.tamanho, a.tamanhoAntes, a.tipo])).toEqual([
      ["novo", "data\\1@vrcas.rsw", 471971, null, "map"],
      ["novo", "data\\sprite\\로브\\겨울날개\\남\\초보자_남.spr", 20480, null, "garment sprite"],
      ["alterado", "data\\alberta.gnd", 2638686, 2575926, "map"],
      ["removido", "data\\sprite\\velho.spr", 512, null, "item sprite"],
      ["removido", "data\\solto.txt", 0, null, ""],
    ]);
    expect(r.arquivosGrf[1]?.busca).toContain("sprite de capa");
    expect(r.resumoGrf).toEqual([
      { tipo: "garment sprite", novos: 1, alterados: 0, removidos: 0 },
      { tipo: "map", novos: 1, alterados: 1, removidos: 0 },
      { tipo: "item sprite", novos: 0, alterados: 0, removidos: 1 },
    ]);
  });

  it("tabelas Lua: situação, total de mudanças mesmo cortado e valores em texto", () => {
    const { tabelasLua } = mapearRelatorio(RELATORIO_EXEMPLO);
    expect(tabelasLua.map((t) => [t.situacao, t.quantidade, t.mudancas.length, t.truncado, t.erro])).toEqual([
      ["alterado", 3, 3, false, ""],
      ["alterado", 2510, 1, true, ""],
      ["novo", 0, 0, false, ""],
      ["erro", 0, 0, false, "unexpected symbol near '<eof>'"],
    ]);
    const [adicao, troca, remocao] = tabelasLua[0]!.mudancas;
    expect([adicao?.op, adicao?.caminho, adicao?.antes]).toEqual(["add", "/mapTbl/1@vrcas.rsw", ""]);
    expect(adicao?.depois).toContain('"backgroundBmp": "village"');
    expect(troca).toEqual({
      op: "chg",
      caminho: "/mapTbl/prt_elib.rsw/notifyEnter",
      antes: "false",
      depois: "true",
    });
    expect(remocao).toEqual({ op: "del", caminho: "/mapTbl/velho.rsw", antes: "Mapa antigo", depois: "" });
    expect(tabelasLua[0]?.busca).toContain("maptbl_data");
  });

  it("textos: diff unificado como veio, com as contagens", () => {
    const [mapas] = mapearRelatorio(RELATORIO_EXEMPLO).textos;
    expect(mapas?.arquivo).toBe("grf_text\\data\\mapnametable.txt");
    expect([mapas?.situacao, mapas?.adicionadas, mapas?.removidas, mapas?.truncado]).toEqual([
      "alterado",
      1,
      1,
      false,
    ]);
    expect(mapas?.linhas.length).toBe(6);
  });

  it("o exemplo não é vazio", () => {
    expect(relatorioVazio(mapearRelatorio(RELATORIO_EXEMPLO))).toBeFalse();
  });
});

describe("apoio do relatório", () => {
  it("emTexto aceita qualquer valor", () => {
    expect(emTexto(null)).toBe("");
    expect(emTexto(undefined)).toBe("");
    expect(emTexto(3)).toBe("3");
    expect(emTexto(false)).toBe("false");
    expect(emTexto("como veio")).toBe("como veio");
    expect(emTexto({ a: 1 })).toBe('{\n "a": 1\n}');
  });

  it("formatarBytes em pt-BR", () => {
    expect(formatarBytes(512)).toBe("512 B");
    expect(formatarBytes(1536)).toBe("1,5 KB");
    expect(formatarBytes(3_355_443)).toBe("3,2 MB");
    expect(formatarBytes(250 * 1024)).toBe("250 KB");
    expect(formatarBytes(4_630_153_990)).toBe("4,3 GB");
    expect(formatarBytes(-1)).toBe("");
  });

  it("rótulos conhecidos em pt-BR e os desconhecidos como vieram", () => {
    expect(rotuloDoTipoGrf("monster sprite")).toBe("Sprite de monstro");
    expect(rotuloDoTipoGrf("garment sprite")).toBe("Sprite de capa");
    expect(rotuloDoTipoGrf("palette")).toBe("palette");
    expect(rotuloDoTipoGrf("")).toBe("Sem tipo");
    expect(rotuloDoCampo("unidentifiedDescriptionName")).toBe("Descrição não identificada");
    expect(rotuloDoCampo("weight")).toBe("weight");
  });
});
