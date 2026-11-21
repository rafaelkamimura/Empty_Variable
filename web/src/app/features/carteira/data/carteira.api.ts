import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type { Destinatario, PedidoTransferencia } from "./carteira.modelos";
import type { Extrato } from "./extrato.modelos";

/** Chamadas HTTP da carteira (diretrizes §4.5). */
@Injectable({ providedIn: "root" })
export class CarteiraApi {
  private readonly http = inject(HttpClient);

  /** Extrato do jogador vinculado ao usuário logado. */
  meuExtrato(): Promise<Extrato> {
    return firstValueFrom(this.http.get<Extrato>("/api/extrato/me"));
  }

  /** Jogadores que podem receber uma transferência. */
  destinatarios(): Promise<Destinatario[]> {
    return firstValueFrom(this.http.get<Destinatario[]>("/api/carteira/transferencias/destinatarios"));
  }

  transferir(pedido: PedidoTransferencia): Promise<unknown> {
    return firstValueFrom(this.http.post("/api/carteira/transferencias", pedido));
  }
}
