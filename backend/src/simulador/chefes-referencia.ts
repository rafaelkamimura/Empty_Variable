// D57: chefes de instância que já vêm cadastrados, com a fonte de cada dado. Só entram aqui os que
// têm o vínculo instância → monstro documentado; os chefes das outras instâncias o gestor cadastra
// pelo ID do monstro. Consulta em 2026-11-21.
//
// Vínculo com a instância e HP dentro dela: browiki, https://browiki.org/wiki/Torre_da_Constelação
// Atributos: páginas da Divine Pride (banco de dados do kRO), ainda NÃO conferidos no LATAM. Quando
// a chave da API está configurada, a resposta dela substitui estes valores.
import type { Elemento, Raca, Tamanho } from "@betel/simulador";

export interface ChefeDeReferencia {
  /** `codigo` da instância no catálogo. */
  instancia: string;
  idMonstro: number;
  nome: string;
  observacao: string;
  /** De onde vem o vínculo com a instância. */
  fonte: string;
  monstro: {
    /** De onde vêm os atributos. */
    fonte: string;
    nivel: number;
    hp: number;
    def: number;
    mdef: number;
    vit: number;
    int: number;
    res: number;
    mres: number;
    raca: Raca;
    tamanho: Tamanho;
    elemento: Elemento;
    nivelElemento: number;
    danoRecebidoPct: number;
  };
}

const BROWIKI_TORRE = "https://browiki.org/wiki/Torre_da_Constelação";

export const CHEFES_DE_REFERENCIA: readonly ChefeDeReferencia[] = [
  {
    instancia: "TORRE_CONSTELACAO",
    idMonstro: 20996,
    nome: "Naght Sieger",
    observacao:
      "Andar 25. Na instância o HP base é 300 milhões (browiki); o banco de dados lista 2 bilhões. " +
      "Regenera HP e invoca Espinhos que aumentam a redução de dano (Aliviar): nada disso entra na conta.",
    fonte: BROWIKI_TORRE,
    monstro: {
      fonte: "https://www.divine-pride.net/database/monster/20996",
      nivel: 250,
      hp: 300_000_000,
      def: 410,
      mdef: 80,
      vit: 90,
      int: 220,
      res: 300,
      mres: 200,
      raca: "DEMONIO",
      tamanho: "GRANDE",
      elemento: "FANTASMA",
      nivelElemento: 3,
      danoRecebidoPct: 100,
    },
  },
  {
    instancia: "TORRE_CONSTELACAO",
    idMonstro: 20994,
    nome: "Betelgeuse",
    observacao:
      "Andares 50 e 75. O HP depende das estrelas da Fonte da Deusa: 200 mi (selado), 500 mi, 800 mi, " +
      "1,1 bi, 1,4 bi e 1,7 bi de 1 a 5 estrelas (browiki); ajuste o HP do alvo. A Divine Pride diz que " +
      "ele recebe só 1% do dano e lista 2 bilhões de HP; não se sabe se o 1% vale junto com o HP da " +
      "instância, então confira com um dano real. Cura, armadilhas e Aliviar não entram na conta.",
    fonte: BROWIKI_TORRE,
    monstro: {
      fonte: "https://www.divine-pride.net/database/monster/20994",
      nivel: 250,
      hp: 1_100_000_000,
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
      danoRecebidoPct: 1,
    },
  },
];
