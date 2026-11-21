// D60: chefes e recompensas de cada instância do catálogo, tirados da página dela na browiki
// (campos "instachefe" e "itemreward" do quadro da instância; consulta em 2026-11-21). Os IDs são os
// do jogo. Instância cuja página não nomeia o chefe fica sem chefes: o gestor cadastra pelo ID.
// Arquivo gerado: não edite à mão.

export interface LootBrowiki {
  /** Página da instância na browiki. */
  fonte: string;
  /** MVPs da instância: ID do monstro no jogo e nome. */
  chefes: readonly (readonly [idMonstro: number, nome: string])[];
  /** Itens que a instância entrega (moeda ou prêmio dela): ID do item no jogo e nome. */
  recompensas: readonly (readonly [idItem: number, nome: string])[];
}

/** Pelo `codigo` da instância no catálogo. */
// prettier-ignore
export const LOOT_BROWIKI: Readonly<Record<string, LootBrowiki>> = {
  BROWIKI_ALTAR_DO_SELO: {
    fonte: "https://browiki.org/wiki/Altar_do_Selo",
    chefes: [[1929, "Bafomé Selado"]],
    recompensas: [],
  },
  BROWIKI_AOS_PES_DO_REI: {
    fonte: "https://browiki.org/wiki/Aos_Pés_do_Rei",
    chefes: [[3124, "Charleston 03"]],
    recompensas: [[25627, "Carta Dourada"], [6752, "Componente de Charleston"]],
  },
  BROWIKI_ARENA_NOTURNA: {
    fonte: "https://browiki.org/wiki/Arena_Noturna",
    chefes: [[20872, "Fenris Fenrir"]],
    recompensas: [[1000316, "Moeda Noturna de Geffen"]],
  },
  BROWIKI_BASE_MILITAR: {
    fonte: "https://browiki.org/wiki/Base_Militar",
    chefes: [[3628, "Malícia"]],
    recompensas: [],
  },
  BROWIKI_BATALHA_DE_SIMULACAO: {
    fonte: "https://browiki.org/wiki/Batalha_de_Simulação",
    chefes: [[21533, "Juncea de Simulação"]],
    recompensas: [[1000608, "Pétala de Flor Invernal"], [1000811, "Minério Mágico da Flor de Neve"]],
  },
  BROWIKI_BATALHA_DOS_ORCS: {
    fonte: "https://browiki.org/wiki/Batalha_dos_Orcs",
    chefes: [[3901, "Orc Falso"]],
    recompensas: [],
  },
  BROWIKI_CAVERNA_DE_BUWAYA: {
    fonte: "https://browiki.org/wiki/Caverna_de_Buwaya",
    chefes: [[2319, "Buwaya"]],
    recompensas: [[6497, "Amuletos Menores"]],
  },
  BROWIKI_CAVERNA_DE_MORS: {
    fonte: "https://browiki.org/wiki/Caverna_de_Mors",
    chefes: [[3000, "Necromante de Morroc"]],
    recompensas: [[6684, "Marca do Herói"]],
  },
  BROWIKI_CAVERNA_DO_POLVO: {
    fonte: "https://browiki.org/wiki/Caverna_do_Polvo",
    chefes: [[2194, "Polvo Gigante"]],
    recompensas: [],
  },
  BROWIKI_COVIL_DE_VERMES: {
    fonte: "https://browiki.org/wiki/Covil_de_Vermes",
    chefes: [[2529, "Rainha Verme"]],
    recompensas: [[20717, "Pele da Rainha Verme"]],
  },
  BROWIKI_CRIPTA: {
    fonte: "https://browiki.org/wiki/Cripta",
    chefes: [],
    recompensas: [[23142, "Poção Menor de EXP"], [23143, "Poção Menor de Classe"]],
  },
  BROWIKI_DUELO_COM_SWEETY: {
    fonte: "https://browiki.org/wiki/Duelo_com_Sweety",
    chefes: [[20642, "Sweety"]],
    recompensas: [[1000103, "Vale Varmida"]],
  },
  BROWIKI_EDDA_DO_BIOLABORATORIO: {
    fonte: "https://browiki.org/wiki/Edda_do_Biolaboratório",
    chefes: [[20536, "Espadachim Anônima"]],
    recompensas: [[25786, "Arquivos de Biopesquisa"], [25787, "Fragmento de Experimento"]],
  },
  BROWIKI_ESGOTOS_DE_MALANGDO: {
    fonte: "https://browiki.org/wiki/Esgotos_de_Malangdo",
    chefes: [[2187, "Celacanto Sombrio"], [2189, "Celacanto Mutante"], [2188, "Celacanto Cruel"], [2190, "Celacanto Violento"]],
    recompensas: [],
  },
  BROWIKI_FAZENDA_DE_PITAYAS: {
    fonte: "https://browiki.org/wiki/Fazenda_de_Pitayas",
    chefes: [[20659, "Árvore de Pitaya"]],
    recompensas: [[1000103, "Vale Varmida"]],
  },
  BROWIKI_FORTALEZA_VOADORA: {
    fonte: "https://browiki.org/wiki/Fortaleza_Voadora",
    chefes: [[3473, "Jack Wolf"]],
    recompensas: [],
  },
  BROWIKI_FABRICA_DO_TERROR: {
    fonte: "https://browiki.org/wiki/Fábrica_do_Terror",
    chefes: [[2996, "Celine Kimi"]],
    recompensas: [],
  },
  BROWIKI_GLASTHEIM_INFANTIL: {
    fonte: "https://browiki.org/wiki/Glastheim_Infantil",
    chefes: [],
    recompensas: [[6608, "Manas Coaguladas"]],
  },
  BROWIKI_GLASTHEIM_INFERNAL: {
    fonte: "https://browiki.org/wiki/Glastheim_Infernal",
    chefes: [[20573, "Miragem de Amdarais"], [20572, "Miragem de Himmelmez"]],
    recompensas: [[25867, "Fragmento Temporal"]],
  },
  BROWIKI_GLASTHEIM_SOMBRIA: {
    fonte: "https://browiki.org/wiki/Glastheim_Sombria",
    chefes: [[3151, "Origem da Escuridão"], [3150, "Amdarais Sombrio"]],
    recompensas: [[6607, "Cristais do Tempo"], [6608, "Manas Coaguladas"], [6755, "Manas Sombrias"]],
  },
  BROWIKI_ILHA_BIOS: {
    fonte: "https://browiki.org/wiki/Ilha_Bios",
    chefes: [[3029, "Ceifador Ankou"]],
    recompensas: [[6684, "Marca do Herói"]],
  },
  BROWIKI_INVASAO_AO_AEROPLANO: {
    fonte: "https://browiki.org/wiki/Invasão_ao_Aeroplano",
    chefes: [[3181, "Capitão Ferlock"]],
    recompensas: [],
  },
  BROWIKI_JARDIM_SECRETO: {
    fonte: "https://browiki.org/wiki/Jardim_Secreto",
    chefes: [[20620, "Kappa"], [20621, "Lambda"]],
    recompensas: [],
  },
  BROWIKI_LABIRINTO_DA_NEBLINA: {
    fonte: "https://browiki.org/wiki/Labirinto_da_Neblina",
    chefes: [[2131, "Dragão Púrpura"]],
    recompensas: [],
  },
  BROWIKI_LABORATORIO_WERNER: {
    fonte: "https://browiki.org/wiki/Laboratório_Werner",
    chefes: [[3621, "Fofinho"], [3826, "Cobaia YSF01"]],
    recompensas: [],
  },
  BROWIKI_LAGO_DE_BAKONAWA: {
    fonte: "https://browiki.org/wiki/Lago_de_Bakonawa",
    chefes: [[2322, "Bakonawa"]],
    recompensas: [],
  },
  BROWIKI_MALDICAO_DE_GLASTHEIM: {
    fonte: "https://browiki.org/wiki/Maldição_de_Glastheim",
    chefes: [[2475, "Origem da Maldição"], [2476, "Amdarais"]],
    recompensas: [[6607, "Cristais do Tempo"], [6608, "Manas Coaguladas"]],
  },
  BROWIKI_MANSAO_DA_DESILUSAO: {
    fonte: "https://browiki.org/wiki/Mansão_da_Desilusão",
    chefes: [[21317, "Demi Freya"], [21316, "Schulang"]],
    recompensas: [[1000405, "Fragmento de Ametista"]],
  },
  BROWIKI_MAUSOLEU_DAS_MAGOAS: {
    fonte: "https://browiki.org/wiki/Mausoléu_das_Mágoas",
    chefes: [[20893, "Princesa Tiara"], [20892, "Sakray Amaldiçoado"]],
    recompensas: [[1000367, "Mineas"]],
  },
  BROWIKI_MEMORIAL_COR: {
    fonte: "https://browiki.org/wiki/Memorial_COR",
    chefes: [[20340, "EL-A17T"]],
    recompensas: [[25668, "Arma Danificada"], [25723, "Núcleo COR"], [25669, "Chip Misterioso"]],
  },
  BROWIKI_MEMORIAS_DE_SARAH: {
    fonte: "https://browiki.org/wiki/Memórias_de_Sarah",
    chefes: [[2542, "Lorde Irine"]],
    recompensas: [],
  },
  BROWIKI_MEMORIAS_DE_THANATOS: {
    fonte: "https://browiki.org/wiki/Memórias_de_Thanatos",
    chefes: [[20785, "Fragmento de Thanatos"]],
    recompensas: [],
  },
  BROWIKI_MISSAO_OS: {
    fonte: "https://browiki.org/wiki/Missão_OS",
    chefes: [[20346, "Miguel"]],
    recompensas: [[25668, "Arma Danificada"], [25723, "Núcleo COR"], [25669, "Chip Misterioso"]],
  },
  BROWIKI_NINHO_DE_NIDHOGG: {
    fonte: "https://browiki.org/wiki/Ninho_de_Nidhogg",
    chefes: [[2022, "Sombra de Nidhogg"]],
    recompensas: [],
  },
  BROWIKI_OPERACAO_DESTRUICAO: {
    fonte: "https://browiki.org/wiki/Operação_Destruição",
    chefes: [[21531, "Aquila"]],
    recompensas: [[1000608, "Pétala de Flor Invernal"]],
  },
  BROWIKI_ORTUS_AQUA: {
    fonte: "https://browiki.org/wiki/Ortus_Aqua",
    chefes: [[20667, "Papilia Violeta"], [20668, "Papilia Rubra"]],
    recompensas: [[1000103, "Vale Varmida"]],
  },
  BROWIKI_PALACIO_DAS_MAGOAS: {
    fonte: "https://browiki.org/wiki/Palácio_das_Mágoas",
    chefes: [[2959, "Angústia Torturante"]],
    recompensas: [[6672, "Fragmento de Cinzas"]],
  },
  BROWIKI_PATRULHA_DA_AGUIA: {
    fonte: "https://browiki.org/wiki/Patrulha_da_Águia",
    chefes: [],
    recompensas: [[1000608, "Pétala de Flor Invernal"]],
  },
  BROWIKI_PURIFICACAO_DO_SANTUARIO: {
    fonte: "https://browiki.org/wiki/Purificação_do_Santuário",
    chefes: [],
    recompensas: [[1000405, "Fragmentos de Ametistas"]],
  },
  BROWIKI_QUEDA_DE_GLASTHEIM: {
    fonte: "https://browiki.org/wiki/Queda_de_Glastheim",
    chefes: [[20387, "Schmidt Corrompido"]],
    recompensas: [[25740, "Gema Corrompida"]],
  },
  BROWIKI_QUEDA_DO_AEROPLANO: {
    fonte: "https://browiki.org/wiki/Queda_do_Aeroplano",
    chefes: [[20891, "Criatura Desconhecida"]],
    recompensas: [[1000363, "Fragmento de Ymir"]],
  },
  BROWIKI_RUINA_DE_GLASTHEIM: {
    fonte: "https://browiki.org/wiki/Ruína_de_Glastheim",
    chefes: [[20386, "Schmidt Corrompido"]],
    recompensas: [[25739, "Cristal Corrompido"]],
  },
  BROWIKI_SALA_FINAL: {
    fonte: "https://browiki.org/wiki/Sala_Final",
    chefes: [[3254, "T_W_O"]],
    recompensas: [[6827, "Peça Intacta"], [6828, "Aparelho Gravitacional"]],
  },
  BROWIKI_SALAO_DE_YMIR: {
    fonte: "https://browiki.org/wiki/Salão_de_Ymir",
    chefes: [[3450, "Bijou"]],
    recompensas: [[6919, "Marcas de Honra"]],
  },
  BROWIKI_SARAH_VS_FENRIR: {
    fonte: "https://browiki.org/wiki/Sarah_vs_Fenrir",
    chefes: [[3190, "Sara Irine"]],
    recompensas: [[607, "Fruto de Yggdrasil"], [608, "Semente de Yggdrasil"], [28311, "Brincos de Locomoção"], [28310, "Brincos de Regeneração"]],
  },
  BROWIKI_SONHO_SOMBRIO: {
    fonte: "https://browiki.org/wiki/Sonho_Sombrio",
    chefes: [[3073, "Grand Pere"]],
    recompensas: [],
  },
  BROWIKI_TEMPLO_DO_DEMONIO_REI: {
    fonte: "https://browiki.org/wiki/Templo_do_Demônio_Rei",
    chefes: [[3097, "Deus Morroc"]],
    recompensas: [[22567, "Prêmios de Esquadrão"]],
  },
  BROWIKI_TORNEIO_DE_MAGIA: {
    fonte: "https://browiki.org/wiki/Torneio_de_Magia",
    chefes: [[2564, "Fenris Fenrir"]],
    recompensas: [[6671, "Moedas Mágicas de Geffen"]],
  },
  BROWIKI_TORRE_SUBMERSA: {
    fonte: "https://browiki.org/wiki/Torre_Submersa",
    chefes: [],
    recompensas: [[1000372, "Pó de Meteorito"]],
  },
  TORRE_CONSTELACAO: {
    fonte: "https://browiki.org/wiki/Torre_da_Constelação",
    chefes: [[20994, "Betelgeuse"], [20996, "Naght Sieger"]],
    recompensas: [],
  },
  BROWIKI_TORRE_DO_DEMONIO: {
    fonte: "https://browiki.org/wiki/Torre_do_Demônio",
    chefes: [[2942, "Fanático das Trevas"]],
    recompensas: [],
  },
  BROWIKI_TUMULO_DO_MONARCA: {
    fonte: "https://browiki.org/wiki/Túmulo_do_Monarca",
    chefes: [[3658, "Monarca Lich"]],
    recompensas: [[25235, "Pedra Bruta"]],
  },
  BROWIKI_VILA_DOS_PORINGS: {
    fonte: "https://browiki.org/wiki/Vila_dos_Porings",
    chefes: [[3810, "Rei Poring"]],
    recompensas: [[23302, "Baú Poring"]],
  },
};
