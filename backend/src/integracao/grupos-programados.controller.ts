import { createHash } from "node:crypto";
import { Controller, Get, Inject, Module } from "@nestjs/common";
import { Integracao } from "../auth/decoradores.js";
import { CONFIGURACAO, type Configuracao } from "../configuracao.js";
import { lerVagas, type Vaga } from "../instancias/grupos-instancia.controller.js";
import { PrismaService } from "../prisma/prisma.service.js";

/** Grupos que começaram há menos que isto ainda saem na lista, para o chamador encerrar o aviso. */
export const JANELA_PASSADO_MS = 24 * 60 * 60 * 1000;
/** Mesmo teto da lista de instâncias programadas do site. */
const LIMITE_GRUPOS = 100;

/**
 * ABERTO recebe inscrições até `agendadoEm`; FECHADO foi fechado pelo gestor; INDISPONIVEL tem a
 * instância desativada e por isso sumiu da página de inscrição.
 */
export type SituacaoGrupo = "ABERTO" | "FECHADO" | "INDISPONIVEL";

export interface OcupanteIntegracao {
  personagem: string;
  jogador: string;
  /** null quando o jogador não tem conta do Discord vinculada. */
  discordId: string | null;
  /** Nome de exibição no Discord (global name, senão o username). */
  nomeDiscord: string | null;
}

export interface VagaIntegracao {
  posicao: number;
  tipo: Vaga["tipo"];
  classe: string | null;
  importancia: number | null;
  ocupada: boolean;
  /** null em vaga livre, ou ocupada por um personagem que não existe mais. */
  ocupante: OcupanteIntegracao | null;
}

export interface GrupoIntegracao {
  id: string;
  instancia: { id: string; nome: string };
  agendadoEm: string;
  fechadoEm: string | null;
  situacao: SituacaoGrupo;
  inscricoesAbertas: boolean;
  /** Muda sempre que algo visível do grupo muda; igual, nada a redesenhar. */
  versao: string;
  vagas: VagaIntegracao[];
}

export interface RespostaGruposProgramados {
  geradoEm: string;
  /** Página do site onde o membro se inscreve. */
  urlInscricao: string;
  grupos: GrupoIntegracao[];
}

/** Hash curto do conteúdo do grupo: troca de vaga, de nome de personagem ou de situação muda a versão. */
function versaoDe(grupo: Omit<GrupoIntegracao, "versao">): string {
  return createHash("sha256").update(JSON.stringify(grupo)).digest("hex").slice(0, 16);
}

/**
 * Leitura das instâncias programadas para o bot do Discord publicar e manter um quadro por grupo.
 * Só leitura: a inscrição continua sendo feita no site.
 */
@Integracao()
@Controller("integracao/grupos-programados")
export class GruposProgramadosIntegracaoController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONFIGURACAO) private readonly config: Configuracao,
  ) {}

  /**
   * Grupos agendados a partir de 24 h atrás (os próximos e os que acabaram de começar), em ordem de
   * horário, com cada vaga resolvida para classe e ocupante.
   */
  @Get()
  async listar(): Promise<RespostaGruposProgramados> {
    const agora = new Date();
    const grupos = await this.prisma.grupoInstancia.findMany({
      where: { agendadoEm: { gte: new Date(+agora - JANELA_PASSADO_MS) } },
      select: {
        id: true,
        agendadoEm: true,
        fechadoEm: true,
        vagas: true,
        instancia: { select: { id: true, nome: true, ativa: true } },
      },
      orderBy: { agendadoEm: "asc" },
      take: LIMITE_GRUPOS,
    });
    const vagasPorGrupo = new Map(grupos.map((grupo) => [grupo.id, lerVagas(grupo.vagas)]));
    const todas = [...vagasPorGrupo.values()].flat();
    const classeIds = [...new Set(todas.flatMap((vaga) => (vaga.classeId ? [vaga.classeId] : [])))];
    const personagemIds = [
      ...new Set(todas.flatMap((vaga) => (vaga.personagemId ? [vaga.personagemId] : []))),
    ];
    const [classes, personagens] = await Promise.all([
      this.prisma.classe.findMany({
        where: { id: { in: classeIds } },
        select: { id: true, nomeOficial: true },
      }),
      this.prisma.personagem.findMany({
        where: { id: { in: personagemIds } },
        select: {
          id: true,
          nome: true,
          jogador: {
            select: {
              apelido: true,
              usuario: { select: { discordId: true, discordUsername: true, globalName: true } },
            },
          },
        },
      }),
    ]);
    const nomesClasse = new Map(classes.map((classe) => [classe.id, classe.nomeOficial]));
    const ocupantes = new Map<string, OcupanteIntegracao>(
      personagens.map(({ id, nome, jogador }) => [
        id,
        {
          personagem: nome,
          jogador: jogador.apelido,
          discordId: jogador.usuario?.discordId ?? null,
          nomeDiscord: jogador.usuario
            ? (jogador.usuario.globalName ?? jogador.usuario.discordUsername)
            : null,
        },
      ]),
    );

    return {
      geradoEm: agora.toISOString(),
      urlInscricao: `${this.config.appOrigin}${this.config.caminhoBase}/instancias-programadas`,
      grupos: grupos.map(({ id, agendadoEm, fechadoEm, instancia }) => {
        const situacao: SituacaoGrupo = fechadoEm ? "FECHADO" : instancia.ativa ? "ABERTO" : "INDISPONIVEL";
        const grupo: Omit<GrupoIntegracao, "versao"> = {
          id,
          instancia: { id: instancia.id, nome: instancia.nome },
          agendadoEm: agendadoEm.toISOString(),
          fechadoEm: fechadoEm?.toISOString() ?? null,
          situacao,
          inscricoesAbertas: situacao === "ABERTO" && agendadoEm > agora,
          vagas: (vagasPorGrupo.get(id) ?? []).map((vaga, indice) => ({
            posicao: indice + 1,
            tipo: vaga.tipo,
            classe: vaga.classeId ? (nomesClasse.get(vaga.classeId) ?? null) : null,
            importancia: vaga.importancia,
            ocupada: vaga.personagemId !== null,
            ocupante: vaga.personagemId ? (ocupantes.get(vaga.personagemId) ?? null) : null,
          })),
        };
        return { ...grupo, versao: versaoDe(grupo) };
      }),
    };
  }
}

@Module({ controllers: [GruposProgramadosIntegracaoController] })
export class GruposProgramadosIntegracaoModule {}
