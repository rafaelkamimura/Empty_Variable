import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type { ItemEquipamento } from "../../../shared/dominio/build";
import {
  type BuildImportada,
  type ClasseFicha,
  corpoDaFicha,
  type DestinoFicha,
  type Ficha,
  type SituacaoVinculo,
  type Solicitacao,
} from "./vinculo.modelos";

const API = "/api/vinculo";

/** Chamadas HTTP do vínculo (diretrizes §4.5): devolvem o que o servidor enviou. */
@Injectable({ providedIn: "root" })
export class VinculoApi {
  private readonly http = inject(HttpClient);

  situacao(): Promise<SituacaoVinculo> {
    return firstValueFrom(this.http.get<SituacaoVinculo>(API));
  }
  classes(): Promise<ClasseFicha[]> {
    return firstValueFrom(this.http.get<ClasseFicha[]>(`${API}/classes`));
  }

  /** Salva a ficha onde ela pertence: personagem vinculado, solicitação pendente ou nova solicitação. */
  salvarFicha(destino: DestinoFicha, ficha: Ficha): Promise<unknown> {
    const corpo = corpoDaFicha(ficha);
    switch (destino.tipo) {
      case "personagem":
        return firstValueFrom(this.http.patch(`${API}/personagens/${destino.id}`, corpo));
      case "novo-personagem":
        return firstValueFrom(this.http.post(`${API}/personagens`, corpo));
      case "solicitacao":
        return firstValueFrom(
          this.http.post(`${API}/solicitacoes/${destino.id}/personagens`, {
            ficha: corpo,
            ...(destino.nomeAnterior === null ? {} : { nomeAnterior: destino.nomeAnterior }),
          }),
        );
      case "nova-solicitacao":
        return firstValueFrom(this.http.post(`${API}/solicitacoes`, { fichas: [corpo] }));
    }
  }

  /** D55: lê a build de um link do simulador (não salva nada). */
  importarBuild(link: string): Promise<BuildImportada> {
    return firstValueFrom(this.http.post<BuildImportada>(`${API}/build-simulador`, { link }));
  }

  // ---- fila do admin ----

  pendentes(): Promise<Solicitacao[]> {
    return firstValueFrom(
      this.http.get<Solicitacao[]>(`${API}/solicitacoes`, { params: { status: "PENDENTE" } }),
    );
  }
  aprovar(id: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${API}/solicitacoes/${id}/aprovar`, {}));
  }
  rejeitar(id: string, motivo: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${API}/solicitacoes/${id}/rejeitar`, { motivo }));
  }

  /** Catálogo de equipamentos do RO LATAM por slot (arquivo estático). */
  equipamentos(): Promise<{ slots: Record<string, ItemEquipamento[]> }> {
    return firstValueFrom(
      this.http.get<{ slots: Record<string, ItemEquipamento[]> }>("/equipamentos-latam.json"),
    );
  }
}
