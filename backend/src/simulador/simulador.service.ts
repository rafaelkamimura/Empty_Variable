import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Usuario } from "@prisma/client";
import {
  contraHp,
  type EntradaFisica,
  type EntradaMagica,
  simularFisico,
  simularMagico,
} from "@betel/simulador";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { MonstrosService } from "./monstros.service.js";

export type EntradaSimulacao = ({ tipo: "FISICO" } & EntradaFisica) | ({ tipo: "MAGICO" } & EntradaMagica);

export interface NovoChefe {
  idMonstro: number;
  nome?: string;
  observacao?: string;
}

const SELECAO_CHEFE = { idMonstro: true, nome: true, observacao: true, fonte: true } as const;

/**
 * D57: alvos da simulação de dano (chefes das instâncias e monstros pelo ID do jogo) e o cálculo,
 * que é o de `packages/simulador`.
 */
@Injectable()
export class SimuladorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly monstros: MonstrosService,
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
        })),
      })),
    };
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
}
