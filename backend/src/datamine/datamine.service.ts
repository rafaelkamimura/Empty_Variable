import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { mkdir, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CONFIGURACAO, type Configuracao } from "../configuracao.js";
import { PrismaService } from "../prisma/prisma.service.js";

/** O que o rolatam-dm envia ao publicar um patch (já validado pelo controller). */
export interface EntradaPatch {
  chave: string;
  titulo: string;
  /** AAAA-MM-DD */
  dataPatch: string;
  patches: string[];
  resumo: Record<string, unknown>;
  relatorioHtml: string;
  relatorioJson: string;
}

/** Um patch na lista e no detalhe (sem os arquivos). */
export interface PatchResumido {
  id: string;
  chave: string;
  titulo: string;
  /** AAAA-MM-DD */
  dataPatch: string;
  patches: string[];
  resumo: Record<string, unknown>;
  bytesHtml: number;
  bytesJson: number;
  publicadoEm: Date;
  atualizadoEm: Date;
}

export type Arquivo = "html" | "json";
const NOME_ARQUIVO: Record<Arquivo, string> = { html: "report.html", json: "report.json" };

/**
 * D63: patches do cliente minerados pelo rolatam-dm. O banco guarda a identificação e o resumo; o
 * relatório inteiro (report.html, que a tela emoldura, e report.json) fica em `datamineDir/<id>/`.
 * Publicar de novo a mesma chave substitui os arquivos e o resumo, para um patch nunca aparecer duas vezes.
 */
@Injectable()
export class DatamineService {
  private readonly log = new Logger(DatamineService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONFIGURACAO) private readonly config: Configuracao,
  ) {}

  async publicar(entrada: EntradaPatch): Promise<{ id: string; criado: boolean }> {
    const dados = {
      titulo: entrada.titulo,
      dataPatch: new Date(`${entrada.dataPatch}T00:00:00.000Z`),
      patches: entrada.patches as Prisma.InputJsonValue,
      resumo: entrada.resumo as Prisma.InputJsonValue,
      bytesHtml: Buffer.byteLength(entrada.relatorioHtml, "utf8"),
      bytesJson: Buffer.byteLength(entrada.relatorioJson, "utf8"),
    };
    const existente = await this.prisma.patchCliente.findUnique({ where: { chave: entrada.chave } });
    const registro =
      existente === null
        ? await this.prisma.patchCliente.create({ data: { chave: entrada.chave, ...dados } })
        : await this.prisma.patchCliente.update({ where: { id: existente.id }, data: dados });

    // Os arquivos entram depois do registro, com nome do próprio id; escrita em .tmp + rename, para
    // uma leitura concorrente nunca ver um relatório pela metade.
    const pasta = join(this.config.datamineDir, registro.id);
    await mkdir(pasta, { recursive: true });
    await this.gravar(join(pasta, NOME_ARQUIVO.html), entrada.relatorioHtml);
    await this.gravar(join(pasta, NOME_ARQUIVO.json), entrada.relatorioJson);
    this.log.log(
      `Patch ${entrada.chave} ${existente === null ? "publicado" : "atualizado"} (${registro.id}).`,
    );
    return { id: registro.id, criado: existente === null };
  }

  async listar(): Promise<PatchResumido[]> {
    const linhas = await this.prisma.patchCliente.findMany({
      orderBy: [{ dataPatch: "desc" }, { publicadoEm: "desc" }],
    });
    return linhas.map(resumir);
  }

  async obter(id: string): Promise<PatchResumido | null> {
    const linha = await this.prisma.patchCliente.findUnique({ where: { id } });
    return linha === null ? null : resumir(linha);
  }

  /** Caminho absoluto do arquivo guardado, ou null se o patch não existe ou o arquivo sumiu do disco. */
  async caminhoDoArquivo(id: string, arquivo: Arquivo): Promise<string | null> {
    const existe = await this.prisma.patchCliente.count({ where: { id } });
    if (existe === 0) return null;
    const caminho = join(this.config.datamineDir, id, NOME_ARQUIVO[arquivo]);
    try {
      const info = await stat(caminho);
      return info.isFile() ? caminho : null;
    } catch {
      this.log.warn(`Relatório do patch ${id} não está em ${caminho}.`);
      return null;
    }
  }

  private async gravar(caminho: string, conteudo: string): Promise<void> {
    const temporario = `${caminho}.tmp`;
    await writeFile(temporario, conteudo, "utf8");
    await rename(temporario, caminho);
  }
}

function resumir(linha: {
  id: string;
  chave: string;
  titulo: string;
  dataPatch: Date;
  patches: Prisma.JsonValue;
  resumo: Prisma.JsonValue;
  bytesHtml: number;
  bytesJson: number;
  publicadoEm: Date;
  atualizadoEm: Date;
}): PatchResumido {
  return {
    id: linha.id,
    chave: linha.chave,
    titulo: linha.titulo,
    dataPatch: linha.dataPatch.toISOString().slice(0, 10),
    patches: Array.isArray(linha.patches) ? linha.patches.map(String) : [],
    resumo:
      linha.resumo !== null && typeof linha.resumo === "object" && !Array.isArray(linha.resumo)
        ? linha.resumo
        : {},
    bytesHtml: linha.bytesHtml,
    bytesJson: linha.bytesJson,
    publicadoEm: linha.publicadoEm,
    atualizadoEm: linha.atualizadoEm,
  };
}
