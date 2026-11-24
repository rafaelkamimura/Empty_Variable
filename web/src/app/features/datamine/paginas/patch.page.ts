import { DatePipe, DecimalPipe } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { mensagemDeErro } from "../../../core/modelos";
import { type Carregavel, carregando, comErro, pronto } from "../../../shared/utils/carregavel";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { EstadoComponent, EstadoProntoDirective } from "../../../shared/ui/estado/estado.component";
import { PaginaComponent } from "../../../shared/ui/pagina/pagina.component";
import { ResumoComponent } from "../../../shared/ui/resumo/resumo.component";
import { ArquivosPatchComponent } from "../componentes/arquivos-patch.component";
import { RelatorioPatchComponent } from "../componentes/relatorio-patch.component";
import { DatamineApi } from "../data/datamine.api";
import { indicadoresDe, nomesDosPatches, type PatchResumido } from "../data/datamine.modelos";
import { DatamineStore } from "../data/datamine.store";
import { relatorioVazio } from "../data/relatorio.modelos";

/**
 * Um patch do cliente (D63): os números do resumo e o relatório completo em abas (itens, caixas,
 * monstros, skills, mapas, quests, arquivos do GRF, tabelas Lua e textos). O resumo chega primeiro;
 * o relatório, que é grande, é pedido em paralelo e tem o próprio estado de carregamento.
 */
@Component({
  selector: "app-patch-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    RouterLink,
    BadgeComponent,
    BotaoComponent,
    EstadoComponent,
    EstadoProntoDirective,
    PaginaComponent,
    ResumoComponent,
    ArquivosPatchComponent,
    RelatorioPatchComponent,
  ],
  providers: [DatePipe],
  template: `
    <ui-pagina [titulo]="titulo()" [subtitulo]="subtitulo()">
      <a uiBotao variante="fantasma" slot="acao" routerLink="/datamine">Todos os patches</a>
      <ui-estado [valor]="estado()" (tentarNovamente)="carregar()">
        <ng-template uiEstadoPronto [tipo]="estado()" let-patch>
          @if (selos().length > 0) {
            <ul class="selos" aria-label="Destaques do patch" data-testid="datamine-selos">
              @for (selo of selos(); track selo) {
                <li>
                  <ui-badge tom="acento">{{ selo }}</ui-badge>
                </li>
              }
            </ul>
          }
          @if (indicadores().length > 0) {
            <section class="indicadores" aria-label="Resumo do patch" data-testid="datamine-indicadores">
              @for (i of indicadores(); track i.chave) {
                <ui-resumo [rotulo]="i.rotulo" [valor]="(i.valor | number: '1.0-0') ?? ''" />
              }
            </section>
          }
          <app-arquivos-patch [patches]="nomes()" [meta]="meta()" />
          <section aria-label="Relatório completo" data-testid="datamine-relatorio">
            <ui-estado
              [valor]="relatorio()"
              formatoCarregando="tabela"
              [quantidadeCarregando]="6"
              textoCarregando="Carregando o relatório do patch"
              tituloErro="Não foi possível carregar o relatório do patch."
              mensagemVazio="O relatório deste patch veio sem nenhuma mudança para mostrar."
              [estaVazio]="vazio"
              (tentarNovamente)="recarregarRelatorio()"
            >
              <ng-template uiEstadoPronto [tipo]="relatorio()" let-dados>
                <app-relatorio-patch [relatorio]="dados" />
              </ng-template>
            </ui-estado>
          </section>
        </ng-template>
      </ui-estado>
    </ui-pagina>
  `,
  styles: `
    .selos {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .indicadores {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr));
      gap: var(--esp-3);
      margin-top: var(--esp-3);
    }
    app-arquivos-patch {
      margin-top: var(--esp-3);
    }
    section[data-testid="datamine-relatorio"] {
      margin-top: var(--esp-4);
      min-width: 0;
    }
  `,
})
export class PatchPage {
  private readonly api = inject(DatamineApi);
  private readonly store = inject(DatamineStore);
  private readonly data = inject(DatePipe);

  /** Vem da rota `datamine/:id` (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly estado = signal<Carregavel<PatchResumido>>(carregando());
  protected readonly relatorio = this.store.relatorio;
  protected readonly vazio = relatorioVazio;

  private readonly patch = computed(() => {
    const e = this.estado();
    return e.estado === "pronto" ? e.dados : null;
  });
  /** A meta do relatório, quando ele já carregou (os arquivos principais e os selos saem dela). */
  protected readonly meta = computed(() => {
    const r = this.relatorio();
    return r.estado === "pronto" ? r.dados.meta : null;
  });
  protected readonly titulo = computed(() => this.patch()?.titulo ?? "Patch do cliente");
  protected readonly subtitulo = computed(() => {
    const p = this.patch();
    if (p === null) return "O que esta atualização do RO LATAM trouxe.";
    return `Patch de ${this.data.transform(p.dataPatch, "dd/MM/yyyy")}: o que mudou no cliente do RO LATAM.`;
  });
  /** Destaques do cabeçalho. Valem o resumo publicado e, quando chega, a meta do relatório. */
  protected readonly selos = computed(() => {
    const resumo = this.patch()?.resumo;
    const meta = this.meta();
    const selos: string[] = [];
    if (resumo?.ragexe === true || meta?.ragexeNovo === true) selos.push("Ragexe novo");
    if (resumo?.grfReempacotado === true || meta?.grfReempacotado === true) selos.push("GRF reempacotado");
    return selos;
  });
  protected readonly indicadores = computed(() => indicadoresDe(this.patch()?.resumo));
  protected readonly nomes = computed(() => nomesDosPatches(this.patch()?.patches ?? []));

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => {
        void this.carregar();
        void this.store.carregarRelatorio(id);
      });
    });
  }

  async carregar(): Promise<void> {
    const id = this.id();
    this.estado.set(carregando());
    try {
      const patch = await this.api.patch(id);
      if (this.id() === id) this.estado.set(pronto(patch));
    } catch (erro) {
      if (this.id() === id) this.estado.set(comErro(mensagemDeErro(erro)));
    }
  }

  protected recarregarRelatorio(): void {
    void this.store.carregarRelatorio(this.id(), true);
  }
}
