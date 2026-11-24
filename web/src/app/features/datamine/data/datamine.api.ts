import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type { PatchResumido } from "./datamine.modelos";

/** Chamadas HTTP do datamine de patches (diretrizes §4.5). Devolve o que a API mandou, sem transformar. */
@Injectable({ providedIn: "root" })
export class DatamineApi {
  private readonly http = inject(HttpClient);

  /** Todos os patches publicados, do mais recente para o mais antigo. */
  patches(): Promise<PatchResumido[]> {
    return firstValueFrom(this.http.get<PatchResumido[]>("/api/datamine/patches"));
  }

  patch(id: string): Promise<PatchResumido> {
    return firstValueFrom(this.http.get<PatchResumido>(`/api/datamine/patches/${encodeURIComponent(id)}`));
  }

  /**
   * O report.json inteiro do patch (pode passar de 1 MB). Vem de outra ferramenta, por isso sai
   * como `unknown`: quem lê é `mapearRelatorio`.
   */
  dados(id: string): Promise<unknown> {
    return firstValueFrom(this.http.get<unknown>(`/api/datamine/patches/${encodeURIComponent(id)}/dados`));
  }
}
