import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type { Grupo, GrupoSalvo, OpcoesGrupos, Vaga } from "./grupos.modelos";
import type { AgendaProgramada } from "./programadas.modelos";

/** Chamadas HTTP dos grupos de instância (diretrizes §4.5): devolvem o que o servidor enviou. */
@Injectable({ providedIn: "root" })
export class GruposApi {
  private readonly http = inject(HttpClient);

  // Gestão (papel GESTOR)
  grupos(): Promise<Grupo[]> {
    return firstValueFrom(this.http.get<Grupo[]>("/api/gestao/grupos"));
  }
  opcoes(): Promise<OpcoesGrupos> {
    return firstValueFrom(this.http.get<OpcoesGrupos>("/api/gestao/grupos/opcoes"));
  }
  criar(corpo: {
    instanciaId: string;
    agendadoEm: string | null;
    vagas: readonly Vaga[];
  }): Promise<GrupoSalvo> {
    return firstValueFrom(this.http.post<GrupoSalvo>("/api/gestao/grupos", corpo));
  }
  salvarEscala(
    id: string,
    corpo: { vagas: readonly Vaga[]; fechar: boolean; ocupacaoAnterior: readonly (string | null)[] },
  ): Promise<GrupoSalvo> {
    return firstValueFrom(this.http.patch<GrupoSalvo>(`/api/gestao/grupos/${id}`, corpo));
  }

  // Membro
  agenda(): Promise<AgendaProgramada> {
    return firstValueFrom(this.http.get<AgendaProgramada>("/api/instancias-programadas"));
  }
  /** Entra na vaga (1 a 12) com o personagem. */
  participar(grupoId: string, vaga: number, personagemId: string): Promise<{ vaga: number }> {
    return firstValueFrom(
      this.http.post<{ vaga: number }>(`/api/instancias-programadas/${grupoId}/participar`, {
        personagemId,
        vaga,
      }),
    );
  }
}
