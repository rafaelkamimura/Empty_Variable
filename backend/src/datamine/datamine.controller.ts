import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Module,
  NotFoundException,
  Param,
  Post,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { Integracao } from "../auth/decoradores.js";
import { objeto, texto, uuid } from "../comum/validacao.js";
import { CONFIGURACAO, type Configuracao } from "../configuracao.js";
import { type Arquivo, DatamineService, type EntradaPatch, type PatchResumido } from "./datamine.service.js";

/** Até onde um relatório pode crescer (o de 2026-11-24 tem 1,4 MB de HTML e 1,3 MB de JSON). */
const MAXIMO_ARQUIVO = 16 * 1024 * 1024;
const MAXIMO_PATCHES = 500;
const CHAVE = /^[A-Za-z0-9._-]{8,160}$/;
const DATA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Política do relatório emoldurado (D63): ele roda em `sandbox` (origem opaca, sem cookies nem
 * storage do sistema), só com o script e o estilo embutidos pelo rolatam-dm e as fontes do Google
 * que ele pede, e só pode ser emoldurado por páginas deste domínio. O snippet do nginx do host deixa
 * esta rota sem os cabeçalhos gerais (que proíbem iframe) justamente para estes valerem.
 */
export const CSP_RELATORIO = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src data:",
  "connect-src 'none'",
  "frame-ancestors 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "sandbox allow-scripts",
].join("; ");

function textoGrande(valor: unknown, campo: string): string {
  if (typeof valor !== "string" || valor.length === 0)
    throw new BadRequestException(`${campo} é obrigatório.`);
  if (Buffer.byteLength(valor, "utf8") > MAXIMO_ARQUIVO) {
    throw new BadRequestException(`${campo} passa de ${MAXIMO_ARQUIVO / 1024 / 1024} MB.`);
  }
  return valor;
}

/** Lê e valida o corpo de `POST /api/integracao/datamine/patches`. */
export function lerEntrada(corpo: unknown): EntradaPatch {
  const b = objeto(corpo);
  const chave = texto(b["chave"], "chave", 8, 160);
  if (!CHAVE.test(chave)) throw new BadRequestException("chave deve ser um nome de arquivo do patch.txt.");
  const dataPatch = texto(b["dataPatch"], "dataPatch", 10, 10);
  if (!DATA.test(dataPatch)) throw new BadRequestException("dataPatch deve estar no formato AAAA-MM-DD.");
  const patches = b["patches"];
  if (
    !Array.isArray(patches) ||
    patches.length > MAXIMO_PATCHES ||
    patches.some((p) => typeof p !== "string" || p.length === 0 || p.length > 200)
  ) {
    throw new BadRequestException(`patches deve ser uma lista de até ${MAXIMO_PATCHES} nomes de arquivo.`);
  }
  const resumo = objeto(b["resumo"]);
  const relatorioJson = textoGrande(b["relatorioJson"], "relatorioJson");
  let dados: unknown;
  try {
    dados = JSON.parse(relatorioJson);
  } catch {
    throw new BadRequestException("relatorioJson não é um JSON válido.");
  }
  if (dados === null || typeof dados !== "object" || Array.isArray(dados)) {
    throw new BadRequestException("relatorioJson deve ser um objeto JSON.");
  }
  return {
    chave,
    titulo: texto(b["titulo"], "titulo", 3, 120),
    dataPatch,
    patches: patches as string[],
    resumo,
    relatorioHtml: textoGrande(b["relatorioHtml"], "relatorioHtml"),
    relatorioJson,
  };
}

/**
 * D63: publicação pelo rolatam-dm (`publish.py`), autenticada pelo INTEGRACAO_TOKEN. Pela internet
 * a rota não existe (o nginx do host responde 404 para /api/integracao); a máquina que minera chega
 * por um túnel SSH até o contêiner web, ou, na fase 2, pela rede interna do Docker.
 */
@Integracao()
@Controller("integracao/datamine")
export class DatamineIntegracaoController {
  constructor(
    private readonly datamine: DatamineService,
    @Inject(CONFIGURACAO) private readonly config: Configuracao,
  ) {}

  /** Cria ou substitui (mesma chave) um patch. Devolve o id e o endereço da tela. */
  @Post("patches")
  @HttpCode(200)
  async publicar(@Body() corpo: unknown): Promise<{ id: string; criado: boolean; url: string }> {
    const { id, criado } = await this.datamine.publicar(lerEntrada(corpo));
    return { id, criado, url: `${this.config.appOrigin}${this.config.caminhoBase}/datamine/${id}` };
  }
}

/** Leitura pelos membros (sessão, como o resto do sistema). */
@Controller("datamine")
export class DatamineController {
  constructor(private readonly datamine: DatamineService) {}

  @Get("patches")
  listar(): Promise<PatchResumido[]> {
    return this.datamine.listar();
  }

  @Get("patches/:id")
  async obter(@Param("id") idBruto: string): Promise<PatchResumido> {
    const patch = await this.datamine.obter(uuid(idBruto, "id"));
    if (patch === null) throw new NotFoundException("Patch não encontrado.");
    return patch;
  }

  /** O report.html gerado pelo rolatam-dm, para o iframe da tela do patch. */
  @Get("patches/:id/relatorio")
  async relatorio(@Param("id") idBruto: string, @Res() res: Response): Promise<void> {
    const caminho = await this.arquivo(idBruto, "html");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Security-Policy", CSP_RELATORIO);
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "private, max-age=300");
    await enviar(res, caminho);
  }

  /** O report.json inteiro (itens com descrições, GRF, tabelas Lua), para quem quiser os dados. */
  @Get("patches/:id/dados")
  async dados(@Param("id") idBruto: string, @Res() res: Response): Promise<void> {
    const caminho = await this.arquivo(idBruto, "json");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, max-age=300");
    await enviar(res, caminho);
  }

  private async arquivo(idBruto: string, tipo: Arquivo): Promise<string> {
    const caminho = await this.datamine.caminhoDoArquivo(uuid(idBruto, "id"), tipo);
    if (caminho === null) throw new NotFoundException("Relatório não encontrado.");
    return caminho;
  }
}

function enviar(res: Response, caminho: string): Promise<void> {
  return new Promise((resolver, rejeitar) => {
    res.sendFile(caminho, (erro) => (erro ? rejeitar(erro) : resolver()));
  });
}

@Module({
  controllers: [DatamineIntegracaoController, DatamineController],
  providers: [DatamineService],
})
export class DatamineModule {}
