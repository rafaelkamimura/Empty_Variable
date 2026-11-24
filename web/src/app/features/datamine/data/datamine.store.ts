import { inject, Injectable, signal } from "@angular/core";
import { mensagemDeErro } from "../../../core/modelos";
import { type Carregavel, carregando, comErro, pronto } from "../../../shared/utils/carregavel";
import { DatamineApi } from "./datamine.api";
import { mapearRelatorio } from "./relatorio.mapear";
import type { RelatorioPatch } from "./relatorio.modelos";

/**
 * O relatório completo do patch aberto (diretrizes §4.5). O report.json passa de 1 MB, então só é
 * pedido quando a página do patch abre, e fica guardado enquanto a pessoa navega pelas abas ou
 * volta ao mesmo patch. Abrir outro patch troca o que está guardado.
 */
@Injectable({ providedIn: "root" })
export class DatamineStore {
  private readonly api = inject(DatamineApi);
  private readonly _relatorio = signal<Carregavel<RelatorioPatch>>(carregando());
  private idGuardado: string | null = null;

  /** O relatório do último patch pedido em `carregarRelatorio`. */
  readonly relatorio = this._relatorio.asReadonly();

  /**
   * Carrega o relatório do patch. Se ele já está guardado, não pede de novo, a menos que `forcar`
   * (o "Tentar novamente" do erro).
   *
   * @param id Identificador do patch (o da rota).
   * @param forcar Pede de novo mesmo com o relatório guardado.
   */
  async carregarRelatorio(id: string, forcar = false): Promise<void> {
    if (!forcar && this.idGuardado === id && this._relatorio().estado === "pronto") return;
    this.idGuardado = id;
    this._relatorio.set(carregando());
    try {
      const relatorio = mapearRelatorio(await this.api.dados(id));
      if (this.idGuardado === id) this._relatorio.set(pronto(relatorio));
    } catch (erro) {
      if (this.idGuardado === id) this._relatorio.set(comErro(mensagemDeErro(erro)));
    }
  }
}
