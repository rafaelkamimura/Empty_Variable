import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { Usuario } from "@prisma/client";
import {
  type AlvoMotor,
  type BonusExtrasMotor,
  type EquipamentoMotor,
  ErroDoMotor,
  fecharBuild,
  type FichaMotor,
  SLOTS_FICHA_MOTOR,
} from "@betel/motor-latam";
import {
  contraHp,
  type EntradaFisica,
  type EntradaMagica,
  simularFisico,
  simularMagico,
} from "@betel/simulador";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { CLASSES_SIMULADOR, decodificarBuild } from "../jogadores/build-simulador.js";
import type { AtributosFicha, EncaixeFicha, EquipamentoFicha } from "../jogadores/ficha-build.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { MonstrosService } from "./monstros.service.js";
import { MotorService } from "./motor.service.js";

export type EntradaSimulacao = ({ tipo: "FISICO" } & EntradaFisica) | ({ tipo: "MAGICO" } & EntradaMagica);

export interface NovoChefe {
  idMonstro: number;
  nome?: string;
  observacao?: string;
}

/** D59: pedido de simulação da build de um personagem, com os efeitos dos equipamentos. */
export interface SimulacaoDaBuild {
  personagemId: string;
  alvo: AlvoMotor;
  /** Habilidade no formato do simulador ("Nome==nível"), no lugar da que a ficha guarda. */
  habilidade?: string;
  /** Bônus digitados, somados aos efeitos lidos dos itens. */
  bonus: BonusExtrasMotor;
  /** Campos digitados que o motor não tem como somar. */
  bonusNaoAplicados: string[];
}

const semAcentos = (nome: string) =>
  nome
    .normalize("NFD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * Número da classe no simulador a partir do nome da classe do grupo, para fichas sem a build
 * importada. Devolve undefined se nenhum nome bater.
 * @param nome Nome oficial da classe
 */
function classeDoSimulador(nome: string | undefined): number | undefined {
  if (nome === undefined) return undefined;
  const chave = semAcentos(nome);
  const achada = Object.entries(CLASSES_SIMULADOR).find(([, classe]) => semAcentos(classe) === chave);
  return achada === undefined ? undefined : Number(achada[0]);
}

/**
 * Converte o que a ficha guarda no formato que o motor recebe. Slots só com o nome (fichas
 * antigas) não têm o ID do item e ficam de fora, citados nos avisos.
 * @param personagem Ficha do personagem
 */
function fichaDoMotor(personagem: {
  nivelBase: number | null;
  equipamentos: unknown;
  atributos: unknown;
  classe: { nomeOficial: string } | null;
}): { ficha: FichaMotor; token: string | undefined; avisos: string[] } {
  const atributos = (personagem.atributos ?? {}) as AtributosFicha;
  const guardados = (personagem.equipamentos ?? {}) as Record<string, string | EquipamentoFicha>;
  const avisos: string[] = [];
  const equipamentos: Partial<Record<(typeof SLOTS_FICHA_MOTOR)[number], EquipamentoMotor>> = {};
  for (const slot of SLOTS_FICHA_MOTOR) {
    const item = guardados[slot];
    if (item === undefined) continue;
    if (typeof item === "string") {
      avisos.push(`"${item}" está na ficha só pelo nome, sem o ID do jogo, e não entrou na conta.`);
      continue;
    }
    equipamentos[slot] = {
      id: item.id,
      ...(item.refino === undefined ? {} : { refino: item.refino }),
      ...(item.grau === undefined ? {} : { grau: item.grau }),
      ...(item.cartas === undefined ? {} : { cartas: item.cartas.map((carta) => carta.id) }),
      ...(item.encantamentos === undefined
        ? {}
        : { encantamentos: item.encantamentos.map((encantamento) => encantamento.id) }),
    };
  }
  const classe = atributos.classeSimulador ?? classeDoSimulador(personagem.classe?.nomeOficial);
  return {
    token: atributos.token,
    avisos,
    ficha: {
      ...(classe === undefined ? {} : { classe }),
      ...(personagem.nivelBase === null ? {} : { nivelBase: personagem.nivelBase }),
      ...(atributos.nivelClasse === undefined ? {} : { nivelClasse: atributos.nivelClasse }),
      ...(atributos.base === undefined ? {} : { base: atributos.base }),
      ...(atributos.talentos === undefined ? {} : { talentos: atributos.talentos }),
      ...(atributos.habilidade === undefined ? {} : { habilidade: atributos.habilidade }),
      ...(atributos.elementoAtaque === undefined ? {} : { elementoAtaque: atributos.elementoAtaque }),
      equipamentos,
    },
  };
}

/** Campos da ficha que a build do simulador lê e grava. */
const SELECAO_BUILD = {
  id: true,
  nome: true,
  nivelBase: true,
  classeId: true,
  equipamentos: true,
  atributos: true,
  classe: { select: { nomeOficial: true } },
} as const;

const SELECAO_CHEFE = { idMonstro: true, nome: true, observacao: true, fonte: true } as const;

/**
 * D57: alvos da simulação de dano (chefes das instâncias e monstros pelo ID do jogo) e o cálculo,
 * que é o de `packages/simulador`.
 */
@Injectable()
export class SimuladorService {
  private readonly log = new Logger(SimuladorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly monstros: MonstrosService,
    private readonly motor: MotorService,
  ) {}

  /** Instâncias do catálogo, cada uma com os chefes cadastrados e os atributos já guardados deles. */
  async alvos() {
    const instancias = await this.prisma.instancia.findMany({
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        nivelMinimo: true,
        chefes: { where: { ativo: true }, orderBy: { nome: "asc" }, select: SELECAO_CHEFE },
      },
    });
    const guardados = await this.monstros.guardados(
      instancias.flatMap((instancia) => instancia.chefes.map((chefe) => chefe.idMonstro)),
    );
    return {
      divinePride: this.monstros.configurada,
      instancias: instancias.map((instancia) => ({
        ...instancia,
        chefes: instancia.chefes.map((chefe) => ({
          ...chefe,
          monstro: guardados.get(chefe.idMonstro) ?? null,
          noSimulador: this.motor.obter().temMonstro(chefe.idMonstro),
        })),
      })),
    };
  }

  /** D58: monstros guardados cujo nome contém o texto. */
  buscarMonstros(texto: string) {
    return this.monstros.porNome(texto);
  }

  /** Atributos de um monstro pelo ID do jogo. */
  async monstro(idJogo: number) {
    const monstro = await this.monstros.porId(idJogo);
    if (monstro === null) {
      throw new NotFoundException(
        this.monstros.configurada
          ? "Monstro não encontrado na Divine Pride. Informe os atributos do alvo."
          : "A busca de monstros pelo ID está desligada (sem chave da Divine Pride). Informe os atributos do alvo.",
      );
    }
    return monstro;
  }

  /** Cadastra (ou reativa) um monstro como chefe de uma instância. O nome vem da Divine Pride se faltar. */
  async adicionarChefe(gestor: Usuario, instanciaId: string, novo: NovoChefe) {
    const instancia = await this.prisma.instancia.findUnique({ where: { id: instanciaId } });
    if (instancia === null) throw new NotFoundException("Instância não encontrada.");
    const monstro = await this.monstros.porId(novo.idMonstro);
    const nome = novo.nome ?? monstro?.nome ?? null;
    if (nome === null) {
      throw new BadRequestException("Informe o nome do chefe: não foi possível buscá-lo pelo ID.");
    }
    const dados = { nome, observacao: novo.observacao ?? null, ativo: true };
    const chefe = await this.prisma.$transaction(async (tx) => {
      const salvo = await tx.chefeInstancia.upsert({
        where: { instanciaId_idMonstro: { instanciaId, idMonstro: novo.idMonstro } },
        create: { instanciaId, idMonstro: novo.idMonstro, ...dados },
        update: dados,
        select: SELECAO_CHEFE,
      });
      await this.auditoria.registrar(
        {
          usuarioId: gestor.id,
          acao: "CHEFE_INSTANCIA_SALVO",
          entidade: "instancia",
          entidadeId: instanciaId,
          depois: salvo,
        },
        tx,
      );
      return salvo;
    });
    return { ...chefe, monstro };
  }

  /** Tira um chefe da instância. O registro fica desativado, para a referência inicial não voltar. */
  async removerChefe(gestor: Usuario, instanciaId: string, idMonstro: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.chefeInstancia.updateMany({
        where: { instanciaId, idMonstro, ativo: true },
        data: { ativo: false },
      });
      if (r.count === 0) throw new NotFoundException("Chefe não encontrado nesta instância.");
      await this.auditoria.registrar(
        {
          usuarioId: gestor.id,
          acao: "CHEFE_INSTANCIA_REMOVIDO",
          entidade: "instancia",
          entidadeId: instanciaId,
          depois: { idMonstro },
        },
        tx,
      );
    });
  }

  /** Roda o cálculo e, se o HP do alvo foi informado, compara o dano de um uso com ele. */
  simular(entrada: EntradaSimulacao, hp: number | null) {
    const resultado = entrada.tipo === "FISICO" ? simularFisico(entrada) : simularMagico(entrada);
    return {
      tipo: entrada.tipo,
      ...resultado,
      contraHp: hp === null ? null : { hp, ...contraHp(hp, resultado.total) },
    };
  }

  /**
   * D59: calcula o dano da build de um personagem do próprio membro com os efeitos dos
   * equipamentos, cartas, encantamentos e conjuntos, pelo motor do simulador da latam-tools. A
   * build parte do link guardado na ficha; o que a ficha mostra (nível, atributos, os dez slots)
   * vale por cima dele. Itens que o motor não conhece ficam de fora e voltam na lista de ignorados.
   */
  async simularBuild(usuario: Usuario, pedido: SimulacaoDaBuild) {
    const personagem = await this.prisma.personagem.findFirst({
      where: { id: pedido.personagemId, ativo: true, jogador: { usuarioId: usuario.id } },
      select: {
        id: true,
        nome: true,
        nivelBase: true,
        equipamentos: true,
        atributos: true,
        classe: { select: { nomeOficial: true } },
      },
    });
    if (personagem === null) throw new NotFoundException("Personagem não encontrado no seu vínculo.");
    const { ficha, token, avisos } = fichaDoMotor(personagem);
    const entrada = {
      ...(token === undefined ? {} : { token }),
      ficha: {
        ...ficha,
        ...(pedido.habilidade === undefined ? {} : { habilidade: { nome: pedido.habilidade } }),
      },
      bonus: pedido.bonus,
      alvo: pedido.alvo,
    };
    try {
      const resultado = this.motor.obter().simular(entrada);
      const hp = pedido.alvo.hp;
      return {
        modo: "BUILD" as const,
        personagem: { id: personagem.id, nome: personagem.nome },
        ...resultado,
        avisos: [...avisos, ...resultado.avisos],
        bonusNaoAplicados: pedido.bonusNaoAplicados,
        contraHp: hp === undefined ? null : { hp, ...contraHp(hp, resultado.porUso) },
      };
    } catch (erro) {
      if (erro instanceof ErroDoMotor) throw new BadRequestException(erro.message);
      this.log.warn(`Falha ao calcular a build do personagem ${personagem.id}: ${String(erro)}`);
      throw new UnprocessableEntityException(
        "Não foi possível calcular esta build. Preencha a simulação à mão.",
      );
    }
  }

  /**
   * D61: build de um personagem do próprio membro para abrir na interface do simulador. Parte do
   * link guardado na ficha (com sombrios, visuais, consumíveis, buffs e rotação) e aplica por cima o
   * que a ficha mostra, como na simulação da D59.
   */
  async abrirBuild(usuario: Usuario, personagemId: string) {
    const personagem = await this.prisma.personagem.findFirst({
      where: { id: personagemId, ativo: true, jogador: { usuarioId: usuario.id } },
      select: SELECAO_BUILD,
    });
    if (personagem === null) throw new NotFoundException("Personagem não encontrado no seu vínculo.");
    const { ficha, token, avisos } = fichaDoMotor(personagem);
    if (token === undefined) {
      avisos.push(
        "A ficha não guarda a build inteira: o simulador abriu só com os dez slots, o nível e os atributos. Salve por aqui para guardar o resto.",
      );
    }
    try {
      const build = this.motor.obter().buildDaFicha({ ...(token === undefined ? {} : { token }), ficha });
      if (typeof build["class"] !== "number") {
        avisos.push(
          "A classe da ficha não existe no simulador com esse nome: escolha a classe na tela do simulador.",
        );
      }
      return { personagem: { id: personagem.id, nome: personagem.nome }, build, avisos };
    } catch (erro) {
      if (erro instanceof ErroDoMotor) throw new BadRequestException(erro.message);
      throw erro;
    }
  }

  /**
   * D61: grava na ficha de um personagem do próprio membro a build montada na interface do
   * simulador: os dez slots (com refino, grau, cartas e encantamentos), nível, atributos, talentos,
   * habilidade e o token da build inteira. A classe só muda se o grupo tiver uma classe ativa com
   * o nome da classe do simulador. Slots que a ficha guarda só pelo nome continuam quando a build
   * os deixa vazios.
   * @param bruta Build como a interface do simulador guarda no navegador
   */
  async salvarBuild(usuario: Usuario, personagemId: string, bruta: unknown) {
    const fechada = fecharBuild(bruta);
    const build = fechada === null ? null : decodificarBuild(fechada.token);
    if (fechada === null || build === null) {
      throw new BadRequestException(
        "O simulador não devolveu uma build válida. Abra-o de novo e tente outra vez.",
      );
    }
    const motor = this.motor.obter();
    const avisos: string[] = [];
    if (fechada.personalizados) {
      avisos.push("A build traz itens personalizados do simulador, que não entram na conta do sistema.");
    }
    if (build.atributos.token === undefined) {
      avisos.push(
        "A build é grande demais para ser guardada inteira: a ficha ficou com os dez slots, o nível e os atributos, sem sombrios, visuais, consumíveis e buffs.",
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const atual = await tx.personagem.findFirst({
        where: { id: personagemId, ativo: true, jogador: { usuarioId: usuario.id } },
        select: SELECAO_BUILD,
      });
      if (atual === null) throw new NotFoundException("Personagem não encontrado no seu vínculo.");
      const anteriores = (atual.equipamentos ?? {}) as Record<string, string | EquipamentoFicha>;
      const nomeAnterior = new Map<number, string>();
      for (const item of Object.values(anteriores)) {
        if (typeof item !== "string") nomeAnterior.set(item.id, item.nome);
      }
      const encaixes = (ids: number[] | undefined): EncaixeFicha[] | undefined =>
        ids?.map((id) => ({ id, nome: motor.nomeDoItem(id) }));
      const equipamentos: Record<string, string | EquipamentoFicha> = {};
      for (const slot of SLOTS_FICHA_MOTOR) {
        const item = build.equipamentos[slot];
        const anterior = anteriores[slot];
        if (item === undefined) {
          if (typeof anterior === "string") equipamentos[slot] = anterior;
          continue;
        }
        const cartas = encaixes(item.cartas);
        const encantamentos = encaixes(item.encantamentos);
        equipamentos[slot] = {
          id: item.id,
          nome: (motor.nomeDoItem(item.id) ?? nomeAnterior.get(item.id) ?? `Item ${item.id}`).slice(0, 160),
          ...(item.refino === undefined ? {} : { refino: item.refino }),
          ...(item.grau === undefined ? {} : { grau: item.grau }),
          ...(cartas === undefined ? {} : { cartas }),
          ...(encantamentos === undefined ? {} : { encantamentos }),
        };
      }
      let classeId = atual.classeId;
      const nomeDaClasse = build.classe === null ? undefined : CLASSES_SIMULADOR[build.classe];
      if (
        nomeDaClasse !== undefined &&
        semAcentos(nomeDaClasse) !== semAcentos(atual.classe?.nomeOficial ?? "")
      ) {
        const classes = await tx.classe.findMany({
          where: { ativa: true },
          select: { id: true, nomeOficial: true },
        });
        const achada = classes.find((classe) => semAcentos(classe.nomeOficial) === semAcentos(nomeDaClasse));
        if (achada) classeId = achada.id;
        else {
          avisos.push(
            `A classe da build (${nomeDaClasse}) não está entre as classes ativas do grupo: a classe da ficha não mudou.`,
          );
        }
      }
      const salvo = await tx.personagem.update({
        where: { id: atual.id },
        data: {
          equipamentos,
          atributos: build.atributos,
          nivelBase: build.nivelBase ?? atual.nivelBase,
          classeId,
        },
        select: SELECAO_BUILD,
      });
      return {
        personagem: {
          id: salvo.id,
          nome: salvo.nome,
          nivelBase: salvo.nivelBase,
          classe: salvo.classe?.nomeOficial ?? null,
        },
        equipamentos: Object.keys(equipamentos).length,
        buildInteira: build.atributos.token !== undefined,
        avisos,
      };
    });
  }
}
