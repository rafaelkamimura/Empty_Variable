import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type { Classe, ItemCatalogo, VersaoParametros } from "../../../shared/dominio/cadastros";
import type { Instancia } from "../../../shared/dominio/instancias";
import type { DetalheRun, ResultadoDropsRun, RunResumo } from "./detalhe-run.modelos";
import type { RascunhoNag4eyes, ResumoRascunhoNag4eyes } from "./nag4eyes.modelos";
import type { JogadorCadastro } from "./runs.modelos";

export interface FiltroRuns {
  dataDe?: string;
  dataAte?: string;
  instanciaId?: string;
  status?: string;
}

export interface RespostaRegistro {
  runId: string;
  avisosReducao: { personagemId: string; somaPercentuaisBp: number; tetoCredoresBp: number }[];
}

/** Destino do registro: run nova, correção (US-07) ou confirmação de um rascunho do nag4eyes. */
export type DestinoRegistro =
  | { tipo: "nova" }
  | { tipo: "correcao"; runId: string; motivo: string }
  | { tipo: "rascunho"; rascunhoId: string };

/** Chamadas HTTP das runs (diretrizes §4.5): devolvem o que o servidor enviou. */
@Injectable({ providedIn: "root" })
export class RunsApi {
  private readonly http = inject(HttpClient);

  runs(filtro: FiltroRuns): Promise<RunResumo[]> {
    const params = Object.fromEntries(Object.entries(filtro).filter(([, v]) => v !== undefined && v !== ""));
    return firstValueFrom(this.http.get<RunResumo[]>("/api/runs", { params }));
  }
  detalhe(id: string): Promise<DetalheRun> {
    return firstValueFrom(this.http.get<DetalheRun>(`/api/runs/${id}`));
  }
  /** D18: lança no estoque os drops ainda não lançados. */
  lancarDrops(id: string): Promise<ResultadoDropsRun> {
    return firstValueFrom(this.http.post<ResultadoDropsRun>(`/api/runs/${id}/estoque`, {}));
  }

  rascunhosPendentes(): Promise<ResumoRascunhoNag4eyes[]> {
    return firstValueFrom(
      this.http.get<ResumoRascunhoNag4eyes[]>("/api/rascunhos-run", { params: { status: "PENDENTE" } }),
    );
  }
  rascunho(id: string): Promise<RascunhoNag4eyes> {
    return firstValueFrom(this.http.get<RascunhoNag4eyes>(`/api/rascunhos-run/${id}`));
  }
  descartarRascunho(id: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`/api/rascunhos-run/${id}/descartar`, {}));
  }

  // ---- catálogos do assistente ----
  jogadores(): Promise<JogadorCadastro[]> {
    return firstValueFrom(this.http.get<JogadorCadastro[]>("/api/jogadores"));
  }
  instancias(): Promise<Instancia[]> {
    return firstValueFrom(this.http.get<Instancia[]>("/api/instancias"));
  }
  itens(): Promise<ItemCatalogo[]> {
    return firstValueFrom(this.http.get<ItemCatalogo[]>("/api/itens"));
  }
  versoesParametros(): Promise<VersaoParametros[]> {
    return firstValueFrom(this.http.get<VersaoParametros[]>("/api/config-pontuacao"));
  }
  /** D45: classes com as funções e os ranks da versão vigente da instância. */
  classes(instanciaId: string): Promise<Classe[]> {
    return firstValueFrom(this.http.get<Classe[]>("/api/classes", { params: { instanciaId } }));
  }

  registrar(destino: DestinoRegistro, corpo: unknown): Promise<RespostaRegistro> {
    switch (destino.tipo) {
      case "correcao":
        return firstValueFrom(
          this.http.post<RespostaRegistro>(`/api/runs/${destino.runId}/corrigir`, {
            motivo: destino.motivo,
            run: corpo,
          }),
        );
      case "rascunho":
        return firstValueFrom(
          this.http.post<RespostaRegistro>(`/api/rascunhos-run/${destino.rascunhoId}/confirmar`, corpo),
        );
      case "nova":
        return firstValueFrom(this.http.post<RespostaRegistro>("/api/runs", corpo));
    }
  }
}
