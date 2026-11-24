// Um report.json pequeno, no formato que o rolatam-dm publica (recortes do patch de 24/11/2026), com
// um caso de cada seção. Só os specs importam este arquivo: ele não entra no pacote da aplicação.

const item = (id: number, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  res: "recurso",
  uname: name,
  desc: [`Descrição de ${name}.`],
  udesc: [`Descrição de ${name}.`],
  slots: 0,
  cls: 0,
  costume: false,
  effect: null,
  ...extra,
});

export const RELATORIO_EXEMPLO = {
  meta: {
    old: { dir: "snapshots/20261123-214842_baseline", taken: "2026-11-23 21:48:42", label: "" },
    new: { dir: "snapshots/20261123-224313_post", taken: "2026-11-23 22:43:13", label: "post" },
    generated: "2026-11-23 23:10:38",
    patches: [
      "//1600 2026-11-24_Raghash_1795262353.rgz",
      "1601 2026-11-24_live_client_2168_2168_1795478972.gpf",
      "1604 2026-11-24_live_client_2170_2171_1795480754.rgz",
    ],
    ragexe: {
      old: { size: 21916168, mtime: 1794310772, sha1: "1512e85e22c47bb846f8785e0b6bf413b579db5d" },
      new: { size: 21993480, mtime: 1795484519, sha1: "fdd8be98768039539ef2d33f6c1b6ded5af689e3" },
    },
    grf: {
      old: { size: 4630153990, mtime: 1794310776, tbl_off: 2172949320, tbl_csz: 6224750, entries: 280173 },
      new: { size: 4630153990, mtime: 1795484525, tbl_off: 2221239332, tbl_csz: 6248147, entries: 281129 },
    },
    title: "Patch LATAM 2026-11-24",
  },
  files: {
    System: { added: [], removed: [], changed: ["iteminfo_new.lub", "mapInfo_ptBR.lub"] },
    grf_text: {
      added: ["data\\luafiles514\\lua files\\effecttool\\1@vrcas.lub"],
      removed: [],
      changed: ["data\\buyingstoreitemlist.txt"],
    },
  },
  items: {
    added: [
      item(9178, "Ovo de Marionete Demoníaca", {
        res: "염속성알",
        desc: [
          "Um ovo que contém uma Marionete Demoníaca de estimação. Pode ser chocado usando uma [Incubadora].",
          "",
          "Tipo: ^777777Ovo de Monstro^000000",
        ],
        udesc: [
          "Um ovo que contém uma Marionete Demoníaca de estimação. Pode ser chocado usando uma [Incubadora].",
          "",
          "Tipo: ^777777Ovo de Monstro^000000",
        ],
      }),
      item(24816, "Malha Magistral dos Cardeais", {
        uname: "Equip. Sombrio",
        desc: ["Tipo: ^777777Equip. Sombrio^000000", "Equipa em: ^777777Armadura^000000"],
        udesc: ["Item desconhecido. Pode ser identificado com uma [Lupa]."],
      }),
      item(31588, "[Visual] Tiara da Nevasca", {
        uname: "Visual",
        desc: ["Tipo: ^777777Visual^000000", "Equipa em: ^777777Topo^000000"],
        udesc: ["Item desconhecido. Pode ser identificado com uma [Lupa]."],
        cls: 2100,
        costume: true,
        effect: 1186,
      }),
      item(108642, "Artefato Oval Invernal", {
        desc: [
          "Um ovo que guarda prêmios de inverno.",
          "--------------------------",
          "<URL>[Concede 1 item aleatório]<INFO>https://ro.gnjoylatam.com/news/probability</INFO></URL>",
          "--------------------------",
          "Peso: ^7777771^000000",
        ],
      }),
      item(311500, "Pedra do Inverno (Topo)"),
      item(450200, "Malha do Palácio", {
        slots: 1,
        uname: "Armadura",
        udesc: ["Uma armadura por identificar."],
      }),
      item(550010, "Adaga do Palácio", { slots: 2 }),
      item(1000855, "Pedra de CRÍT +10 (Dual)", {
        desc: [
          "Troque com ^ffffff<NAVI>^4D4DFF[Trocador de Lembranças Especiais]^000000<INFO>prt_elib,29,50,0,100,0,0</INFO></NAVI>^000000.",
          "^0000FFCRÍT + 10^000000 em <ITEM>Malha do Palácio<INFO>450200</INFO></ITEM>.",
        ],
      }),
      item(32245, "Anel dos Esquecidos"),
    ],
    removed: [item(999, "Bilhete Antigo")],
    changed: [
      {
        old: item(5012, "Capelo", {
          res: "학사모",
          uname: "Equip. para Cabeça",
          desc: [
            "Chapéu especial usado por estudantes nas solenidades de graduação em universidades.É sólido o suficiente para proteger a cabeça.",
            "-------------------------",
            "Tipo: ^777777Equip. para Cabeça^000000",
            "DEF: ^7777775^000000 DEFM: ^7777770^000000",
          ],
          udesc: ["Item desconhecido. Pode ser identificado com uma [Lupa]."],
          cls: 98,
        }),
        new: item(5012, "Capelo", {
          res: "학사모",
          uname: "Equip. para Cabeça",
          desc: [
            "Chapéu especial usado por estudantes nas solenidades de graduação em universidades.",
            "É sólido o suficiente para proteger a cabeça.",
            "-------------------------",
            "Tipo: ^777777Equip. para Cabeça^000000",
            "DEF: ^7777775^000000 DEFM: ^7777770^000000",
          ],
          udesc: ["Item desconhecido. Pode ser identificado com uma [Lupa]."],
          cls: 98,
        }),
        fields: ["identifiedDescriptionName"],
      },
      {
        old: item(12345, "Poção Gelada", { costume: false }),
        new: item(12345, "Poção Invernal", { costume: true, slots: 1 }),
        fields: ["identifiedDisplayName", "unidentifiedDisplayName", "costume", "slotCount"],
      },
    ],
  },
  packages: {
    added: [
      {
        id: 108642,
        name: "Artefato Oval Invernal",
        desc: ["Um ovo que guarda prêmios de inverno.", "Peso: ^7777771^000000"],
        rows: [
          { id: 6635, name: "Bênção do Ferreiro 3", group: 6, prob: 3, pct: 0.3 },
          { id: 31588, name: "[Visual] Tiara da Nevasca", group: 6, prob: 500, pct: 50 },
          { id: 23548, name: "Bombom Gelado", group: 6, prob: 497, pct: 49.7 },
          { id: 25303, name: "Pedra de Mortal 4 (Capa)", group: 0, prob: 0, pct: 0 },
        ],
      },
    ],
    changed: [
      {
        id: 101161,
        name: "Prêmio de Dezembro",
        desc: ["Caixa de Recompensa de Neve", "Peso: ^7777770^000000"],
        rows: [
          { id: 6635, name: "Bênção do Ferreiro 3", group: 6, prob: 3 },
          { id: 31887, name: "[Visual] Cachecol do Boneco de Neve", group: 6, prob: 50 },
          { id: 31588, name: "[Visual] Tiara da Nevasca", group: 6, prob: 47 },
        ],
        old_rows: [
          { id: 31390, name: "[Visual] Chapéu da Nevasca", group: 6, prob: 50, pct: 50 },
          { id: 31588, name: "[Visual] Tiara da Nevasca", group: 6, prob: 50, pct: 50 },
        ],
      },
    ],
  },
  monsters: {
    added: [
      { id: 10509, const: "JT_4_VR_BOOK_FAIRY", sprite: "4_vr_book_fairy" },
      { id: 21633, const: "JT_VR_AGNES", sprite: "vr_agnes" },
    ],
    removed: [],
    changed: [
      {
        old: { id: 1002, const: "JT_PORING", sprite: "poring" },
        new: { id: 1002, const: "JT_PORING", sprite: "poring_winter" },
      },
    ],
  },
  skills: {
    added: [
      {
        id: 5501,
        const: "AG_FROST",
        name: "Geada de Agnes",
        maxlv: 5,
        desc: ["Geada de Agnes", "Causa dano de ^0000FFÁgua^000000 em área."],
        info: { "1": "AG_FROST", MaxLv: 5, SpAmount: { "1": 40 } },
      },
    ],
    removed: [],
    changed: [
      {
        old: {
          id: 2419,
          const: "WM_POEMOFNETHERWORLD",
          name: "Poema do Submundo",
          maxlv: 5,
          desc: ["Poema do Submundo", "Prende os alvos por 8 segundos."],
          info: { SkillName: "Poema do Submundo", MaxLv: 5 },
        },
        new: {
          id: 2419,
          const: "WM_POEMOFNETHERWORLD",
          name: "Poema de Niflheim",
          maxlv: 5,
          desc: ["Poema de Niflheim", "Prende os alvos por 8 segundos."],
          info: { SkillName: "Poema de Niflheim", MaxLv: 5 },
        },
        diff: [
          {
            op: "chg",
            path: "/desc",
            old: ["Poema do Submundo", "Prende os alvos por 8 segundos."],
            new: ["Poema de Niflheim", "Prende os alvos por 8 segundos."],
          },
          { op: "chg", path: "/info/SkillName", old: "Poema do Submundo", new: "Poema de Niflheim" },
          { op: "chg", path: "/name", old: "Poema do Submundo", new: "Poema de Niflheim" },
        ],
      },
    ],
  },
  maps: {
    added: [
      {
        map: "1@vrcas.rsw",
        name: "Livro de Ilusões - Palácio Lilium",
        sign: "Palácio Lilium / Livro de Ilusões - 001",
      },
    ],
    removed: [],
    changed: [
      {
        old: { map: "prt_elib.rsw", name: "Biblioteca de Prontera", sign: "Biblioteca" },
        new: { map: "prt_elib.rsw", name: "Biblioteca Leste de Prontera", sign: "Biblioteca Leste" },
      },
    ],
  },
  quests: {
    added: [
      {
        id: 8806,
        title: "Criei uma planta",
        summary: "",
        desc: ["De um jeito ou de outro, concluí o cultivo de uma planta."],
        icon: "",
      },
    ],
    removed: [],
    changed: [
      {
        old: {
          id: 3460,
          title: "[Espera] Investigar a Tartaruga",
          summary: "Reseta 4 da manhã",
          desc: ["<NAVI>[Orian]<INFO>tur_d03_i,125,86,0,101,0</INFO></NAVI> aguardará você voltar amanhã."],
          icon: "",
        },
        new: {
          id: 3460,
          title: "[Espera] Investigar a Ilha da Tartaruga",
          summary: "Reseta 4 da manhã",
          desc: ["<NAVI>[Orian]<INFO>tur_d03_i,125,186,0,101,0</INFO></NAVI> aguardará você voltar amanhã."],
          icon: "",
        },
      },
    ],
  },
  grf: {
    added: [
      ["data\\1@vrcas.rsw", 471971, "map"],
      ["data\\sprite\\로브\\겨울날개\\남\\초보자_남.spr", 20480, "garment sprite"],
    ],
    removed: [["data\\sprite\\velho.spr", 512, "item sprite"], "data\\solto.txt"],
    changed: [["data\\alberta.gnd", 2575926, 2638686, "map"]],
    summary: [
      ["garment sprite", 1, 0, 0],
      ["map", 1, 1, 0],
      ["item sprite", 0, 0, 1],
    ],
  },
  lua: [
    {
      file: "System\\mapInfo_data.lub",
      status: "changed",
      globals: ["mapTbl", "mapTbl_data"],
      count: 3,
      diff: [
        {
          op: "add",
          path: "/mapTbl/1@vrcas.rsw",
          new: { backgroundBmp: "village", displayName: "Livro de Ilusões - Palácio Lilium" },
        },
        { op: "chg", path: "/mapTbl/prt_elib.rsw/notifyEnter", old: false, new: true },
        { op: "del", path: "/mapTbl/velho.rsw", old: "Mapa antigo" },
      ],
      truncated: false,
    },
    {
      file: "grf_text\\data\\luafiles514\\lua files\\itemdbnametbl.lub",
      status: "changed",
      globals: ["ItemDBNameTbl"],
      count: 2510,
      diff: [{ op: "add", path: "/ItemDBNameTbl/Winter_Egg", new: 108642 }],
      truncated: true,
    },
    {
      file: "grf_text\\data\\luafiles514\\lua files\\effecttool\\1@vrgen.lub",
      status: "added",
      globals: [],
      count: 0,
      diff: [],
      truncated: false,
    },
    { file: "System\\quebrada.lub", status: "error", error: "unexpected symbol near '<eof>'" },
  ],
  text: [
    {
      file: "grf_text\\data\\mapnametable.txt",
      status: "changed",
      lines: [
        "--- old",
        "+++ new",
        "@@ -2256 +2256,3 @@",
        " icas_in.rsw##",
        "+1@vrcas.rsw##",
        "-velho.rsw##",
      ],
      truncated: false,
      added: 1,
      removed: 1,
    },
  ],
};
