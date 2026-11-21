import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type { Compra, ItemCatalogoLoja, ItemOfertavel, Oferta, Vitrine } from "./loja.modelos";

/** Chamadas HTTP da loja (diretrizes §4.5): devolvem o que o servidor enviou, tipado. */
@Injectable({ providedIn: "root" })
export class LojaApi {
  private readonly http = inject(HttpClient);

  /** Catálogo público: itens em estoque e preço. */
  catalogo(): Promise<ItemCatalogoLoja[]> {
    return firstValueFrom(this.http.get<ItemCatalogoLoja[]>("/api/loja/catalogo"));
  }

  /** Vitrine do membro vinculado: saldo, disponibilidade e limites por item. */
  vitrine(): Promise<Vitrine> {
    return firstValueFrom(this.http.get<Vitrine>("/api/loja"));
  }

  comprar(pedido: { itemId: string; quantidade: number; precoEsperado: number }): Promise<unknown> {
    return firstValueFrom(this.http.post("/api/loja/compras", pedido));
  }

  minhasCompras(): Promise<Compra[]> {
    return firstValueFrom(this.http.get<Compra[]>("/api/loja/compras"));
  }

  cancelarCompra(id: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`/api/loja/compras/${id}/cancelar`, {}));
  }

  minhasOfertas(): Promise<Oferta[]> {
    return firstValueFrom(this.http.get<Oferta[]>("/api/loja/ofertas"));
  }

  itensOfertaveis(): Promise<ItemOfertavel[]> {
    return firstValueFrom(this.http.get<ItemOfertavel[]>("/api/loja/ofertas/itens"));
  }

  ofertar(pedido: { itemId: string; quantidade: number }): Promise<unknown> {
    return firstValueFrom(this.http.post("/api/loja/ofertas", pedido));
  }

  retirarOferta(id: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`/api/loja/ofertas/${id}/retirar`, {}));
  }
}
