import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type { FiltroFila, SolicitacaoNebula, VitrineNebula } from "./nebula.modelos";

const API = "/api/nebula";

/** Chamadas HTTP da Nebula (diretrizes §4.5): devolvem o que o servidor enviou. */
@Injectable({ providedIn: "root" })
export class NebulaApi {
  private readonly http = inject(HttpClient);

  /** As Nebulosas abertas para o membro, com o saldo dele. */
  vitrine(): Promise<VitrineNebula> {
    return firstValueFrom(this.http.get<VitrineNebula>(API));
  }
  solicitar(receitaId: string, trazPeca: boolean): Promise<unknown> {
    return firstValueFrom(this.http.post(`${API}/solicitacoes`, { receitaId, trazPeca }));
  }
  minhas(): Promise<SolicitacaoNebula[]> {
    return firstValueFrom(this.http.get<SolicitacaoNebula[]>(`${API}/solicitacoes`));
  }
  cancelar(id: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${API}/solicitacoes/${id}/cancelar`, {}));
  }

  // ---- fila do admin (US-19) ----

  fila(status: FiltroFila): Promise<SolicitacaoNebula[]> {
    return firstValueFrom(this.http.get<SolicitacaoNebula[]>(`${API}/fila`, { params: { status } }));
  }
  entregar(id: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${API}/solicitacoes/${id}/entregar`, {}));
  }
  rejeitar(id: string, motivo: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${API}/solicitacoes/${id}/rejeitar`, { motivo }));
  }
}
