// D57: a ficha mostra refino, grau, cartas e encantamentos, e a tela de simulação parte da build.
// D59: com a build importada na ficha, a simulação calcula os efeitos dos itens e mostra o que foi
// aplicado e o que foi ignorado.
// D61: a tela do simulador completo troca a build e o alvo com a interface do simulador pelo
// armazenamento do navegador.
// D62: a tela abre no simulador a build de um link de compartilhamento do simulador público.
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { ActivatedRoute, convertToParamMap, provideRouter } from "@angular/router";
import { NAO_CONSIDERA } from "@betel/simulador";
import { atributoDaBuild, detalhesDoEquipamento, refinoEGrau, resumoDosAtributos } from "../core/build";
import { lerLinkColado } from "../core/link-simulador";
import type { AtributosBuild, ItemEquipamento, SituacaoVinculo } from "../core/modelos";
import {
  type AlvosSimulacao,
  type MonstroAlvo,
  type RespostaBuild,
  type RespostaSimulacao,
  SimuladorComponent,
} from "./simulador.component";
import {
  CHAVE_BUILD,
  CHAVE_MONSTRO,
  CHAVE_PERSONAGEM_ABERTO,
  enderecoDoSimulador,
  type InstanciaDoHub,
  SimuladorHubComponent,
} from "./simulador-hub.component";
import { VinculoComponent } from "./vinculo.component";

const esperar = () => new Promise((r) => setTimeout(r));
const texto = (f: ComponentFixture<unknown>) => (f.nativeElement as HTMLElement).textContent ?? "";

const ARMA: ItemEquipamento = {
  id: 600020,
  nome: "Espada de Duas Mãos",
  refino: 12,
  grau: "A",
  cartas: [
    { id: 4608, nome: "Carta Cavaleiro Branco" },
    { id: 4625, nome: null },
  ],
  encantamentos: [{ id: 4700, nome: "FOR+1" }],
};

const ATRIBUTOS: AtributosBuild = {
  nivelClasse: 55,
  base: { str: 130, agi: 90, dex: 60, luk: 50 },
  bonusClasse: { str: 12, dex: 6 },
  talentos: { pow: 100, con: 50, crt: 0 },
  habilidade: { nome: "Dragonic Breath", nivel: 10 },
  elementoAtaque: "FOGO",
};

const NAGHT: MonstroAlvo = {
  idJogo: 20996,
  nome: "Naght Sieger",
  origem: "REFERENCIA",
  servidor: null,
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
  chefe: true,
  danoRecebidoPct: 100,
};

const ALVOS: AlvosSimulacao = {
  divinePride: false,
  instancias: [
    { id: "i-covil", nome: "Covil de Vermes", nivelMinimo: 140, chefes: [] },
    {
      id: "i-torre",
      nome: "Torre da Constelação",
      nivelMinimo: 240,
      chefes: [
        {
          idMonstro: 20996,
          nome: "Naght Sieger",
          observacao: "Andar 25. Na instância o HP base é 300 milhões.",
          fonte: "https://browiki.org/wiki/Torre_da_Constelação",
          monstro: NAGHT,
        },
      ],
    },
  ],
};

const SITUACAO: SituacaoVinculo = {
  jogador: {
    id: "j1",
    apelido: "Ana",
    personagens: [
      { id: "p-antigo", nome: "Ana-Antiga", ativo: true, nivelBase: 200, equipamentos: { arma: "Faca" } },
      {
        id: "p-dk",
        nome: "Ana-DK",
        ativo: true,
        nivelBase: 250,
        equipamentos: { arma: ARMA },
        atributos: ATRIBUTOS,
      },
      {
        id: "p-sage",
        nome: "Ana-Sage",
        ativo: true,
        nivelBase: 105,
        equipamentos: { arma: { id: 540031, nome: "Livro Feiticeiro do Éden" } },
        atributos: {
          nivelClasse: 50,
          habilidade: { nome: "Fire Bolt", nivel: 10 },
          classeSimulador: 8,
          token: "N4Igzg1glgNjBiB7ATgWwK4",
        },
      },
    ],
  },
  solicitacao: null,
};

describe("Build da ficha (D57)", () => {
  it("descreve refino, grau, cartas e encantamentos; ficha antiga não tem detalhes", () => {
    expect(refinoEGrau(ARMA)).toBe("+12 · Grau A");
    expect(detalhesDoEquipamento(ARMA)).toEqual([
      "+12 · Grau A",
      "Cartas: Carta Cavaleiro Branco, Item 4625",
      "Encantamentos: FOR+1",
    ]);
    expect(detalhesDoEquipamento({ id: 5011, nome: "Antena", refino: 0 })).toEqual([]);
    expect(detalhesDoEquipamento({ id: 5011, nome: "Antena" })).toEqual([]);
    expect(detalhesDoEquipamento("Faca")).toEqual([]);
    expect(detalhesDoEquipamento(undefined)).toEqual([]);
  });

  it("resume os atributos e soma base com bônus de classe", () => {
    expect(resumoDosAtributos(ATRIBUTOS)).toEqual([
      "Nível de classe 55 · FOR 130+12 · AGI 90 · DES 60+6 · SOR 50",
      "POD 100 · CON 50",
      "Habilidade: Dragonic Breath nv. 10",
    ]);
    expect(resumoDosAtributos(undefined)).toEqual([]);
    expect(resumoDosAtributos({})).toEqual([]);
    expect(atributoDaBuild(ATRIBUTOS, "str")).toBe(142);
    expect(atributoDaBuild(ATRIBUTOS, "int")).toBe(0);
    expect(atributoDaBuild(undefined, "str")).toBe(0);
  });
});

describe("Ficha: importação da build completa (D57)", () => {
  it("guarda refino, grau, cartas, encantamentos e atributos, e envia tudo ao salvar", async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(VinculoComponent);
    f.detectChanges();
    http.expectOne("/api/vinculo").flush(SITUACAO);
    http.expectOne("/api/vinculo/classes").flush([]);
    await esperar();
    const c = f.componentInstance;
    const ficha = {
      nome: "Ana-DK",
      classeId: "dk",
      nivelBase: 250,
      build: "",
      equipamentos: { topo: { id: 5011, nome: "Antena" } },
    };
    c.editando.set(ficha);
    c.linkSimulador = "https://short.latam-tools.com.br/abc";
    const importacao = c.importarBuild(ficha);
    http.expectOne("/api/vinculo/build-simulador").flush({
      classeId: null,
      classeNome: null,
      nivelBase: 250,
      equipamentos: { arma: { ...ARMA, nome: null } },
      atributos: ATRIBUTOS,
    });
    http.expectOne("/equipamentos-latam.json").flush({ slots: { arma: [{ id: 600020, nome: ARMA.nome }] } });
    await importacao;
    expect(ficha as object).toEqual({
      nome: "Ana-DK",
      classeId: "dk",
      nivelBase: 250,
      build: "",
      equipamentos: { arma: ARMA },
      atributos: ATRIBUTOS,
    });
    expect(c.tituloDoSlot(ARMA)).toBe("Espada de Duas Mãos · +12 · Grau A");
    expect(c.tituloDoSlot(undefined)).toBeNull();

    c.editandoId = "p-dk";
    const envio = c.salvarFicha(ficha);
    const pedido = http.expectOne("/api/vinculo/personagens/p-dk");
    expect(pedido.request.body).toEqual(
      jasmine.objectContaining({ equipamentos: { arma: ARMA }, atributos: ATRIBUTOS }),
    );
    pedido.flush({});
    await esperar();
    http.expectOne("/api/vinculo").flush(SITUACAO);
    http.expectOne("/api/vinculo/classes").flush([]);
    await envio;
  });
});

describe("SimuladorComponent (D57)", () => {
  async function abrir(personagem: string | null = null) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(personagem ? { personagem } : {}) } },
        },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(SimuladorComponent);
    f.detectChanges();
    http.expectOne("/api/vinculo").flush(SITUACAO);
    http.expectOne("/api/simulador/alvos").flush(ALVOS);
    await esperar();
    f.detectChanges();
    return { f, c: f.componentInstance, http };
  }

  it("diz que é uma estimativa e lista o que fica de fora", async () => {
    const { f } = await abrir();
    const pagina = f.nativeElement as HTMLElement;
    expect(pagina.querySelector('[data-testid="aviso-estimativa"]')?.textContent).toContain("estimativa");
    const fora = pagina.querySelector('[data-testid="nao-considera"]')?.textContent ?? "";
    for (const linha of NAO_CONSIDERA) expect(fora).toContain(linha);
    expect(pagina.querySelector('[data-testid="resultado"]')).toBeNull();
  });

  it("parte da build do personagem pedido na URL", async () => {
    const { f, c } = await abrir("p-dk");
    expect(c.personagemId()).toBe("p-dk");
    expect(c.atacante).toEqual({
      nivelBase: 250,
      str: 142,
      dex: 66,
      int: 0,
      luk: 50,
      pow: 100,
      spl: 0,
      con: 50,
    });
    expect(c.arma.refino).toBe(12);
    expect(c.elementoAtaque).toBe("FOGO");
    expect(texto(f)).toContain("Arma: Espada de Duas Mãos +12 · Grau A.");
    expect(texto(f)).toContain("Habilidade da build: Dragonic Breath nv. 10.");
  });

  it("ficha antiga, sem atributos, só traz o nível e pede a importação", async () => {
    const { c } = await abrir("p-antigo");
    expect(c.atacante).toEqual({ nivelBase: 200, str: 0, dex: 0, int: 0, luk: 0, pow: 0, spl: 0, con: 0 });
    expect(c.arma.refino).toBe(0);
    expect(c.notaDaBuild()).toContain("não tem os atributos da build");
  });

  it("escolher instância e chefe preenche o alvo e mostra a fonte; instância sem chefes avisa", async () => {
    const { f, c } = await abrir();
    c.escolherInstancia("i-covil");
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector('[data-testid="sem-chefes"]')).not.toBeNull();
    c.escolherInstancia("i-torre");
    c.escolherChefe(20996);
    f.detectChanges();
    expect(c.alvo).toEqual({
      nome: "Naght Sieger",
      nivel: 250,
      hp: 300_000_000,
      def: 410,
      mdef: 80,
      vit: 90,
      int: 220,
      res: 300,
      mres: 200,
      tamanho: "GRANDE",
      elemento: "FANTASMA",
      nivelElemento: 3,
      danoRecebidoPct: 100,
      raca: "DEMONIO",
      chefe: true,
    });
    expect(c.idMonstro).toBe(20996);
    const nota =
      (f.nativeElement as HTMLElement).querySelector('[data-testid="nota-alvo"]')?.textContent ?? "";
    expect(nota).toContain("não conferidos no LATAM");
    expect(nota).toContain("Raça: Demônio.");
    expect(texto(f)).toContain("Andar 25.");
  });

  it("busca um monstro pelo ID e avisa o que a fonte não trouxe", async () => {
    const { c, http } = await abrir();
    c.idMonstro = 1002;
    const busca = c.buscarMonstro();
    http.expectOne("/api/simulador/monstros/1002").flush({
      ...NAGHT,
      idJogo: 1002,
      nome: "Poring",
      origem: "DIVINE_PRIDE",
      servidor: "LATAM",
      vit: null,
      int: null,
      res: null,
      mres: null,
      danoRecebidoPct: null,
    });
    await busca;
    expect(c.alvo).toEqual(
      jasmine.objectContaining({ nome: "Poring", vit: null, res: null, danoRecebidoPct: 100 }),
    );
    expect(c.notaDoAlvo()).toContain("Atributos da Divine Pride (servidor LATAM).");
    expect(c.notaDoAlvo()).toContain("A fonte não trouxe: VIT, INT, RES, RESM.");

    c.idMonstro = 5;
    const falha = c.buscarMonstro();
    http
      .expectOne("/api/simulador/monstros/5")
      .flush(
        { message: "Monstro não encontrado na Divine Pride." },
        { status: 404, statusText: "Not Found" },
      );
    await falha;
    expect(c.erro()).toContain("Monstro não encontrado");
  });

  it("envia a simulação com os campos em branco como zero e mostra o resultado", async () => {
    const { f, c, http } = await abrir("p-dk");
    c.escolherInstancia("i-torre");
    c.escolherChefe(20996);
    c.arma = { tipo: "ESPADA_DUAS_MAOS", ataque: 300, nivel: 4, refino: 12 };
    c.habilidade = { pct: 500, acertos: 3 };
    c.bonusFisico.racaPct = 20;
    c.alvo.vit = null;
    const envio = c.simular();
    const pedido = http.expectOne("/api/simulador/simular");
    expect(pedido.request.body).toEqual({
      tipo: "FISICO",
      atacante: { nivelBase: 250, str: 142, dex: 66, int: 0, luk: 50, pow: 100, spl: 0, con: 50 },
      arma: { tipo: "ESPADA_DUAS_MAOS", ataque: 300, nivel: 4, refino: 12 },
      elementoAtaque: "FOGO",
      bonus: jasmine.objectContaining({ racaPct: 20, atkPct: 0, ignoraPenalidadeDeTamanho: false }),
      habilidade: { pct: 500, acertos: 3 },
      alvo: {
        nivel: 250,
        def: 410,
        mdef: 80,
        vit: 0,
        int: 220,
        res: 300,
        mres: 200,
        tamanho: "GRANDE",
        elemento: "FANTASMA",
        nivelElemento: 3,
        danoRecebidoPct: 100,
        hp: 300_000_000,
      },
    });
    const resposta: RespostaSimulacao = {
      tipo: "FISICO",
      porAcerto: { minimo: 1000, maximo: 2000, medio: 1500 },
      total: { minimo: 3000, maximo: 6000, medio: 4500 },
      detalhe: {
        ataqueDeAtributos: 700,
        ataqueDaArma: { minimo: 500, maximo: 800 },
        amplificacao: 43,
        modificadorElementalPct: 100,
        penalidadeDeTamanhoPct: 100,
        defesa: 410,
        passaPelaDefesaPct: 54.44,
        defesaDeAtributos: 170,
        resistencia: 300,
        passaPelaResistenciaPct: 65.71,
      },
      contraHp: {
        hp: 300_000_000,
        pctMinimo: 0.001,
        pctMaximo: 0.002,
        usosMinimo: 50_000,
        usosMaximo: 100_000,
      },
    };
    pedido.flush(resposta);
    await envio;
    f.detectChanges();
    const resultado =
      (f.nativeElement as HTMLElement).querySelector('[data-testid="resultado"]')?.textContent ?? "";
    expect(resultado).toContain("Resultado estimado");
    expect(resultado.replace(/\s+/g, " ")).toMatch(/3[.,]000 a 6[.,]000/);
    expect(resultado).toContain("sem contar cura nem regeneração");
  });

  it("no dano mágico envia os bônus mágicos; erro da API aparece e limpa o resultado", async () => {
    const { c, http } = await abrir();
    c.tipo = "MAGICO";
    c.bonusMagico.matkPct = 30;
    const envio = c.simular();
    const pedido = http.expectOne("/api/simulador/simular");
    expect(pedido.request.body.bonus).toEqual(jasmine.objectContaining({ matkPct: 30, ignorarMdefPct: 0 }));
    expect(pedido.request.body.alvo.hp).toBeUndefined();
    pedido.flush(
      { message: "Nível do alvo deve ser um número inteiro entre 1 e 999." },
      { status: 400, statusText: "Bad Request" },
    );
    await envio;
    expect(c.erro()).toContain("Nível do alvo");
    expect(c.resultado()).toBeNull();
  });
});

describe("SimuladorComponent: efeitos dos equipamentos da build (D59)", () => {
  const RESPOSTA: RespostaBuild = {
    modo: "BUILD",
    personagem: { id: "p-sage", nome: "Ana-Sage" },
    classe: { id: 8, nome: "Feiticeiro" },
    nivelBase: 105,
    nivelClasse: 50,
    habilidade: {
      valor: "Fire Bolt==10",
      nome: "Lanças de Fogo",
      nivel: 10,
      tipo: "MAGICO",
      elemento: "FOGO",
      acertos: 10,
      pct: 100,
      precisaoPct: 100,
    },
    habilidadesDisponiveis: [
      { valor: "Fire Bolt==10", nome: "Lanças de Fogo nv. 10" },
      { valor: "Cold Bolt==10", nome: "Lanças de Gelo nv. 10" },
    ],
    dano: { minimo: 75, maximo: 185 },
    porUso: { minimo: 750, maximo: 1850, medio: 1300 },
    basico: { minimo: 1, maximo: 1, criticoMinimo: 1, criticoMaximo: 1 },
    atributos: {
      ataque: 33,
      ataqueMagico: 44,
      precisao: 304,
      critico: 3,
      velocidadeDeAtaque: 156,
      hpMaximo: 6454,
      spMaximo: 1324,
    },
    alvo: { nome: "Naght Sieger", reducaoPct: 0, multiplicadorDef: 1 },
    itens: [
      {
        slot: "Arma",
        tipo: "EQUIPAMENTO",
        id: 540031,
        nome: "Livro Feiticeiro do Éden",
        refino: 7,
        efeitos: [
          { rotulo: "ATQM", valor: 180 },
          { rotulo: "Dano mágico %", valor: 5 },
        ],
      },
      { slot: "Arma", tipo: "CARTA", id: 4040, nome: "Carta Poring", efeitos: [] },
    ],
    conjuntos: [{ item: "Manopla Sombria do Paraíso Mágico", com: ["Malha Sombria do Paraíso"] }],
    ignorados: [
      {
        slot: "Acessório 1",
        tipo: "EQUIPAMENTO",
        id: 7508,
        nome: "Anel da Allysia",
        motivo: "o simulador da latam-tools ainda não tem os efeitos deste item",
      },
    ],
    consumiveis: ["Poção de Guaraná"],
    habilidadesEBuffs: ["Proteger Terreno nv. 5"],
    bonusTotais: [{ rotulo: "ATQM", valor: 105 }],
    avisos: [],
    bonusNaoAplicados: ["ATQ de maestria"],
    contraHp: {
      hp: 300_000_000,
      pctMinimo: 0.0003,
      pctMaximo: 0.0006,
      usosMinimo: 162_163,
      usosMaximo: 400_000,
    },
    origem: { repositorio: "https://github.com/adsonpleal/latam-ro-calc", commit: "5c9afd71c02a73bd" },
  };

  async function abrir(personagem: string) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ personagem }) } },
        },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(SimuladorComponent);
    f.detectChanges();
    http.expectOne("/api/vinculo").flush(SITUACAO);
    http.expectOne("/api/simulador/alvos").flush(ALVOS);
    await esperar();
    f.detectChanges();
    return { f, c: f.componentInstance, http };
  }

  it("ficha com a build importada já parte com os efeitos ligados; sem ela, parte à mão", async () => {
    const { f, c } = await abrir("p-sage");
    expect(c.comEfeitos()).toBeTrue();
    expect(c.modoBuild()).toBeTrue();
    const pagina = f.nativeElement as HTMLElement;
    expect(pagina.querySelector('[data-testid="nota-efeitos"]')?.textContent).toContain("link importado");
    expect(pagina.querySelector('[data-testid="aviso-estimativa"]')?.textContent).toContain("estimativa");
    c.escolherPersonagem("p-dk");
    expect(c.comEfeitos()).toBeFalse();
    expect(c.modoBuild()).toBeFalse();
  });

  it("envia o personagem, o alvo com ID, raça e chefe e os bônus, e mostra o que foi aplicado e ignorado", async () => {
    const { f, c, http } = await abrir("p-sage");
    c.escolherInstancia("i-torre");
    c.escolherChefe(20996);
    c.tipo = "MAGICO";
    c.bonusMagico.matkPct = 10;
    const envio = c.simular();
    const pedido = http.expectOne("/api/simulador/simular-build");
    expect(pedido.request.body).toEqual({
      personagemId: "p-sage",
      tipo: "MAGICO",
      bonus: jasmine.objectContaining({ matkPct: 10, matkEquipamento: 0 }),
      alvo: {
        nivel: 250,
        def: 410,
        mdef: 80,
        vit: 90,
        int: 220,
        res: 300,
        mres: 200,
        tamanho: "GRANDE",
        elemento: "FANTASMA",
        nivelElemento: 3,
        danoRecebidoPct: 100,
        hp: 300_000_000,
        idMonstro: 20996,
        nome: "Naght Sieger",
        raca: "DEMONIO",
        chefe: true,
      },
    });
    pedido.flush(RESPOSTA);
    await envio;
    f.detectChanges();
    const pagina = f.nativeElement as HTMLElement;
    const limpo = (seletor: string) =>
      (pagina.querySelector(seletor)?.textContent ?? "").replace(/\s+/g, " ");
    expect(pagina.querySelector('[data-testid="resultado"]')).toBeNull();
    const resultado = limpo('[data-testid="resultado-build"]');
    expect(resultado).toContain("Ana-Sage · Feiticeiro 105/50 contra Naght Sieger");
    expect(resultado).toContain("Lanças de Fogo nv. 10 · Mágico · Fogo");
    expect(resultado).toContain("Por acerto (10 acertos)");
    expect(resultado).toMatch(/750 a 1[.,]850/);
    expect(resultado).toMatch(/média 1[.,]300/);
    const aplicados = limpo('[data-testid="aplicados"]');
    expect(aplicados).toContain("Arma: Livro Feiticeiro do Éden +7 — ATQM +180, Dano mágico % +5");
    expect(aplicados).toContain("Arma, carta: Carta Poring — nenhum efeito dele valeu nesta conta");
    expect(aplicados).toContain("Conjunto: Manopla Sombria do Paraíso Mágico com Malha Sombria do Paraíso");
    expect(aplicados).toContain("Consumíveis: Poção de Guaraná");
    expect(aplicados).toContain("Habilidades e buffs: Proteger Terreno nv. 5");
    const ignorados = limpo('[data-testid="ignorados"]');
    expect(ignorados).toContain("Acessório 1: Anel da Allysia (ID 7508)");
    expect(ignorados).toContain("ATQ de maestria não entra na conta com a build");
    expect(limpo('[data-testid="origem-motor"]')).toContain("licença MIT, versão 5c9afd7");
    expect(c.habilidades()).toEqual(RESPOSTA.habilidadesDisponiveis);

    c.habilidadeEscolhida = "Cold Bolt==10";
    const outra = c.simular();
    const segundo = http.expectOne("/api/simulador/simular-build");
    expect(segundo.request.body.habilidade).toBe("Cold Bolt==10");
    segundo.flush({ ...RESPOSTA, ignorados: [], bonusNaoAplicados: [] });
    await outra;
    f.detectChanges();
    expect(limpo('[data-testid="ignorados"]')).toContain("Nada: todos os itens da build foram lidos.");
  });

  it("desligar os efeitos volta para a simulação à mão; erro da API limpa o resultado da build", async () => {
    const { c, http } = await abrir("p-sage");
    const comErro = c.simular();
    http
      .expectOne("/api/simulador/simular-build")
      .flush({ message: "Nível do alvo inválido." }, { status: 400, statusText: "Bad Request" });
    await comErro;
    expect(c.erro()).toContain("Nível do alvo");
    expect(c.resultadoBuild()).toBeNull();
    c.comEfeitos.set(false);
    const envio = c.simular();
    const pedido = http.expectOne("/api/simulador/simular");
    expect(pedido.request.body.personagemId).toBeUndefined();
    pedido.flush({}, { status: 400, statusText: "Bad Request" });
    await envio;
  });
});

describe("SimuladorHubComponent (D61)", () => {
  const CHAVES = [CHAVE_BUILD, CHAVE_MONSTRO, CHAVE_PERSONAGEM_ABERTO, "ro-set-compare"];
  const INSTANCIAS: InstanciaDoHub[] = [
    { id: "i-covil", nome: "Covil de Vermes", nivelMinimo: 140, chefes: [] },
    {
      id: "i-torre",
      nome: "Torre da Constelação",
      nivelMinimo: 240,
      chefes: [
        {
          idMonstro: 990001,
          nome: "Rainha Verme",
          observacao: null,
          fonte: null,
          monstro: null,
          noSimulador: false,
        },
        {
          idMonstro: 20996,
          nome: "Naght Sieger",
          observacao: null,
          fonte: null,
          monstro: NAGHT,
          noSimulador: true,
        },
      ],
    },
  ];

  async function abrir(personagem: string | null = null) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(personagem ? { personagem } : {}) } },
        },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(SimuladorHubComponent);
    f.detectChanges();
    http.expectOne("/api/vinculo").flush(SITUACAO);
    http.expectOne("/api/simulador/alvos").flush({ divinePride: false, instancias: INSTANCIAS });
    http
      .match((pedido) => pedido.url.endsWith("simulador-latam/origem.json"))
      .forEach((p) => p.flush({ imagens: null }));
    await esperar();
    f.detectChanges();
    return { f, c: f.componentInstance, http };
  }

  beforeEach(() => CHAVES.forEach((chave) => localStorage.removeItem(chave)));
  afterEach(() => CHAVES.forEach((chave) => localStorage.removeItem(chave)));

  it("carrega o simulador servido pelo sistema e só lista instâncias com chefes", async () => {
    const { f, c } = await abrir();
    const quadro = (f.nativeElement as HTMLElement).querySelector("iframe");
    expect(quadro?.getAttribute("src")).toContain("simulador-latam/index.html");
    expect(c.instancias().map((i) => i.nome)).toEqual(["Torre da Constelação"]);
    expect(c.chefeId()).toBe(20996);
    expect(c.personagemId()).toBe("p-antigo");
    expect(texto(f)).toContain("licença MIT");
  });

  it("abre a build do personagem pedido na URL: grava o rascunho do simulador e limpa a comparação", async () => {
    localStorage.setItem("ro-set-compare", "{}");
    const { f, c, http } = await abrir("p-sage");
    http.expectOne("/api/simulador/personagens/p-sage/build").flush({
      personagem: { id: "p-sage", nome: "Ana-Sage" },
      build: { class: 8, level: 105 },
      avisos: ["aviso"],
    });
    await esperar();
    f.detectChanges();
    expect(JSON.parse(localStorage.getItem(CHAVE_BUILD) ?? "")).toEqual({ class: 8, level: 105 });
    expect(localStorage.getItem("ro-set-compare")).toBeNull();
    expect(localStorage.getItem(CHAVE_PERSONAGEM_ABERTO)).toBe("p-sage");
    expect(c.nota()).toBe("Build de Ana-Sage aberta no simulador.");
    expect(c.avisos()).toEqual(["aviso"]);
  });

  it("aponta o chefe como alvo do simulador; chefe fora do simulador não pode ser escolhido", async () => {
    const { c } = await abrir();
    c.usarAlvo();
    expect(localStorage.getItem(CHAVE_MONSTRO)).toBe("20996");
    expect(c.nota()).toBe("Alvo do simulador: Naght Sieger.");
    c.chefeId.set(990001);
    expect(c.chefeNoSimulador()).toBeFalse();
    c.usarAlvo();
    expect(localStorage.getItem(CHAVE_MONSTRO)).toBe("20996");
  });

  it("grava na ficha a build que está no simulador e pede confirmação se ela veio de outro personagem", async () => {
    const { c, http } = await abrir();
    await c.salvar();
    expect(c.erro()).toContain("ainda não tem uma build");

    localStorage.setItem(CHAVE_BUILD, JSON.stringify({ class: 8, level: 110 }));
    localStorage.setItem(CHAVE_PERSONAGEM_ABERTO, "p-dk");
    c.personagemId.set("p-sage");
    const confirmar = spyOn(window, "confirm").and.returnValue(false);
    await c.salvar();
    expect(confirmar).toHaveBeenCalledTimes(1);
    http.expectNone("/api/simulador/personagens/p-sage/build");

    confirmar.and.returnValue(true);
    const envio = c.salvar();
    const pedido = http.expectOne("/api/simulador/personagens/p-sage/build");
    expect(pedido.request.method).toBe("POST");
    expect(pedido.request.body).toEqual({ build: { class: 8, level: 110 } });
    pedido.flush({
      personagem: { id: "p-sage", nome: "Ana-Sage", nivelBase: 110, classe: "Feiticeiro" },
      equipamentos: 9,
      buildInteira: true,
      avisos: [],
    });
    await envio;
    expect(c.nota()).toBe("Ficha de Ana-Sage atualizada: Feiticeiro, nível 110, 9 equipamento(s).");
    expect(localStorage.getItem(CHAVE_PERSONAGEM_ABERTO)).toBe("p-sage");

    const falha = c.salvar();
    http
      .expectOne("/api/simulador/personagens/p-sage/build")
      .flush(
        { message: "O simulador não devolveu uma build válida." },
        { status: 400, statusText: "Bad Request" },
      );
    await falha;
    expect(c.erro()).toContain("não devolveu uma build válida");
  });

  describe("link do simulador público (D62)", () => {
    const TOKEN = "N4IgTokenDeTeste.-$";
    const LINK = `https://simulador.latam-tools.com.br/s/${TOKEN}/`;
    const IMPORTADA = JSON.stringify({ class: 8, level: 105 });
    /** Faz o papel da interface do simulador: grava o rascunho da build que abriu. */
    const interfaceGrava = () => setTimeout(() => localStorage.setItem(CHAVE_BUILD, IMPORTADA));

    it("reconhece o que foi colado: só os dois endereços do simulador passam", () => {
      expect(lerLinkColado(`  ${LINK}  `)).toEqual({ link: LINK });
      expect(lerLinkColado(`<${LINK}>`)).toEqual({ link: LINK });
      expect(lerLinkColado("short.latam-tools.com.br/Ukxuq4")).toEqual({
        link: "short.latam-tools.com.br/Ukxuq4",
      });
      expect(lerLinkColado("https://simulador.latam-tools.com.br/#/?b=abc")).toEqual({
        link: "https://simulador.latam-tools.com.br/#/?b=abc",
      });
      const vazio = lerLinkColado("   ");
      expect("erro" in vazio && vazio.erro).toContain("Cole o link");
      for (const fora of [
        "https://exemplo.com/s/abc/",
        "https://simulador.latam-tools.com.br.exemplo.com/s/abc/",
        "https://exemplo.com/?u=simulador.latam-tools.com.br",
        "isto não é um link",
      ]) {
        const lido = lerLinkColado(fora);
        expect("erro" in lido && lido.erro).toContain("não é do simulador");
      }
      const grande = lerLinkColado(`https://simulador.latam-tools.com.br/s/${"A".repeat(70_000)}/`);
      expect("erro" in grande && grande.erro).toContain("grande demais");
    });

    it("monta o endereço do quadro com o token depois do #, como a interface o lê, e sem ele na recarga comum", () => {
      const base = "https://ev.exemplo/emptyvariable/";
      expect(enderecoDoSimulador(base, 3)).toBe(
        "https://ev.exemplo/emptyvariable/simulador-latam/index.html?v=3",
      );
      expect(enderecoDoSimulador(base, 4, TOKEN)).toBe(
        `https://ev.exemplo/emptyvariable/simulador-latam/index.html?v=4#/?b=${TOKEN}`,
      );
    });

    it("mostra o campo com rótulo e dica", async () => {
      const { f } = await abrir();
      const raiz = f.nativeElement as HTMLElement;
      const campo = raiz.querySelector<HTMLInputElement>('[data-testid="simulador-link"]');
      expect(raiz.querySelector(`label[for="${campo?.id}"]`)?.textContent).toContain("Link do simulador");
      expect(campo?.getAttribute("aria-describedby")).toContain("simulador-link-dica");
      expect(raiz.querySelector("#simulador-link-dica")?.textContent).toContain(
        "entra no lugar da que está no simulador",
      );
      expect(raiz.querySelector('[data-testid="simulador-importar-link"]')?.textContent).toContain(
        "Abrir o link no simulador",
      );
    });

    it("recusa outro endereço junto do campo, sem chamar a API", async () => {
      const { f, c, http } = await abrir();
      c.link.set("https://exemplo.com/s/abc/");
      await c.importar();
      f.detectChanges();
      const raiz = f.nativeElement as HTMLElement;
      const erro = raiz.querySelector('[data-testid="simulador-link-erro"]');
      expect(erro?.getAttribute("role")).toBe("alert");
      expect(erro?.textContent).toContain("não é do simulador");
      expect(raiz.querySelector('[data-testid="simulador-link"]')?.getAttribute("aria-invalid")).toBe("true");
      http.expectNone("/api/simulador/link");
    });

    it("abre a build do link: a API confere, a interface recebe o token no endereço e a build fica sem ficha", async () => {
      localStorage.setItem(CHAVE_PERSONAGEM_ABERTO, "p-sage");
      localStorage.setItem("ro-set-compare", "{}");
      const { f, c, http } = await abrir();
      const confirmar = spyOn(window, "confirm").and.returnValue(true);
      c.link.set(` ${LINK} `);
      const importacao = c.importar();
      expect(c.ocupado()).toBeTrue();
      expect(c.importando()).toBeTrue();
      const pedido = http.expectOne("/api/simulador/link");
      expect(pedido.request.method).toBe("POST");
      expect(pedido.request.body).toEqual({ link: LINK });
      pedido.flush({ token: TOKEN, personalizados: true });
      interfaceGrava();
      await importacao;
      f.detectChanges();
      expect(confirmar).not.toHaveBeenCalled();
      expect(localStorage.getItem(CHAVE_BUILD)).toBe(IMPORTADA);
      expect(localStorage.getItem(CHAVE_PERSONAGEM_ABERTO)).toBeNull();
      expect(localStorage.getItem("ro-set-compare")).toBeNull();
      expect(c.link()).toBe("");
      expect(c.erroDoLink()).toBe("");
      expect(c.nota()).toContain("Build do link aberta no simulador.");
      expect(c.nota()).toContain("ainda não está em nenhuma ficha");
      expect(c.avisos()).toEqual([jasmine.stringContaining("itens personalizados")]);
      expect(c.ocupado()).toBeFalse();
    });

    it("grava a build importada numa ficha só depois da confirmação", async () => {
      const { c, http } = await abrir();
      c.link.set(LINK);
      const importacao = c.importar();
      http.expectOne("/api/simulador/link").flush({ token: TOKEN, personalizados: false });
      interfaceGrava();
      await importacao;
      c.personagemId.set("p-sage");
      const confirmar = spyOn(window, "confirm").and.returnValue(false);
      await c.salvar();
      expect(confirmar).toHaveBeenCalledTimes(1);
      expect(confirmar.calls.mostRecent().args[0]).toContain("não foi aberta da ficha de Ana-Sage");
      http.expectNone("/api/simulador/personagens/p-sage/build");
      confirmar.and.returnValue(true);
      const envio = c.salvar();
      const pedido = http.expectOne("/api/simulador/personagens/p-sage/build");
      expect(pedido.request.body).toEqual({ build: { class: 8, level: 105 } });
      pedido.flush({
        personagem: { id: "p-sage", nome: "Ana-Sage", nivelBase: 105, classe: "Feiticeiro" },
        equipamentos: 8,
        buildInteira: true,
        avisos: [],
      });
      await envio;
      expect(localStorage.getItem(CHAVE_PERSONAGEM_ABERTO)).toBe("p-sage");
    });

    it("pergunta antes de trocar um rascunho com trabalho não gravado; o inicial da interface e o importado trocam direto", async () => {
      const { c, http } = await abrir();
      const confirmar = spyOn(window, "confirm").and.returnValue(false);
      const mexida = JSON.stringify({ class: 8, level: 110 });
      localStorage.setItem(CHAVE_BUILD, mexida);
      c.link.set(LINK);
      await c.importar();
      expect(confirmar).toHaveBeenCalledTimes(1);
      expect(confirmar.calls.mostRecent().args[0]).toContain("o que não foi gravado numa ficha se perde");
      http.expectNone("/api/simulador/link");
      expect(localStorage.getItem(CHAVE_BUILD)).toBe(mexida);
      expect(c.link()).toBe(LINK);

      const inicial = JSON.stringify({ class: 1, level: 99 });
      localStorage.setItem(CHAVE_BUILD, inicial);
      window.dispatchEvent(
        new StorageEvent("storage", { key: CHAVE_BUILD, oldValue: null, newValue: inicial }),
      );
      let importacao = c.importar();
      http.expectOne("/api/simulador/link").flush({ token: TOKEN, personalizados: false });
      interfaceGrava();
      await importacao;
      expect(confirmar).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem(CHAVE_BUILD)).toBe(IMPORTADA);

      c.link.set(LINK);
      importacao = c.importar();
      http.expectOne("/api/simulador/link").flush({ token: TOKEN, personalizados: false });
      interfaceGrava();
      await importacao;
      expect(confirmar).toHaveBeenCalledTimes(1);
    });

    it("mostra o erro da API junto do campo e não mexe no rascunho", async () => {
      const { c, http } = await abrir();
      const rascunho = JSON.stringify({ class: 8, level: 110 });
      localStorage.setItem(CHAVE_BUILD, rascunho);
      localStorage.setItem(CHAVE_PERSONAGEM_ABERTO, "p-sage");
      spyOn(window, "confirm").and.returnValue(true);
      c.link.set("https://short.latam-tools.com.br/Ukxuq4");
      const importacao = c.importar();
      http
        .expectOne("/api/simulador/link")
        .flush(
          { message: "Não foi possível abrir o link curto agora. Tente o link completo." },
          { status: 502, statusText: "Bad Gateway" },
        );
      await importacao;
      expect(c.erroDoLink()).toBe("Não foi possível abrir o link curto agora. Tente o link completo.");
      expect(localStorage.getItem(CHAVE_BUILD)).toBe(rascunho);
      expect(localStorage.getItem(CHAVE_PERSONAGEM_ABERTO)).toBe("p-sage");
      expect(c.link()).toBe("https://short.latam-tools.com.br/Ukxuq4");
      expect(c.ocupado()).toBeFalse();
    });

    it("se a interface não abrir a build no prazo, devolve o rascunho que estava e avisa", async () => {
      const { c, http } = await abrir();
      const rascunho = JSON.stringify({ class: 8, level: 110 });
      localStorage.setItem(CHAVE_BUILD, rascunho);
      localStorage.setItem("ro-set-compare", "{}");
      localStorage.setItem(CHAVE_PERSONAGEM_ABERTO, "p-sage");
      spyOn(window, "confirm").and.returnValue(true);
      c.prazoDoQuadroMs = 0;
      c.link.set(LINK);
      const importacao = c.importar();
      http.expectOne("/api/simulador/link").flush({ token: TOKEN, personalizados: false });
      await importacao;
      expect(c.erroDoLink()).toContain("não abriu a build do link");
      expect(localStorage.getItem(CHAVE_BUILD)).toBe(rascunho);
      expect(localStorage.getItem("ro-set-compare")).toBe("{}");
      expect(localStorage.getItem(CHAVE_PERSONAGEM_ABERTO)).toBe("p-sage");
      expect(c.nota()).toBe("");
    });
  });
});
