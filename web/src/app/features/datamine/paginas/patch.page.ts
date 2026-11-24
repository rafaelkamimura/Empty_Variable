import { DatePipe, DecimalPipe, DOCUMENT } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from "@angular/core";
import { DomSanitizer, type SafeResourceUrl } from "@angular/platform-browser";
import { RouterLink } from "@angular/router";
import { mensagemDeErro } from "../../../core/modelos";
import { type Carregavel, carregando, comErro, pronto } from "../../../shared/utils/carregavel";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { EstadoComponent, EstadoProntoDirective } from "../../../shared/ui/estado/estado.component";
import { PaginaComponent } from "../../../shared/ui/pagina/pagina.component";
import { ResumoComponent } from "../../../shared/ui/resumo/resumo.component";
import { DatamineApi } from "../data/datamine.api";
import { indicadoresDe, nomesDosPatches, type PatchResumido, urlDoRelatorio } from "../data/datamine.modelos";

/**
 * Um patch do cliente (D63): os números do resumo e, embaixo, o relatório completo gerado pelo
 * rolatam-dm num iframe em `sandbox` (origem opaca: ele não enxerga a sessão nem o storage do
 * sistema). A API serve o HTML com a política que só permite emoldurá-lo por este domínio.
 */
@Component({
  selector: "app-patch-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    RouterLink,
    BotaoComponent,
    EstadoComponent,
    EstadoProntoDirective,
    PaginaComponent,
    ResumoComponent,
  ],
  providers: [DatePipe],
  template: `
    <ui-pagina [titulo]="titulo()" [subtitulo]="subtitulo()">
      <a uiBotao variante="fantasma" slot="acao" routerLink="/datamine">Todos os patches</a>
      <ui-estado [valor]="estado()" (tentarNovamente)="carregar()">
        <ng-template uiEstadoPronto [tipo]="estado()" let-patch>
          @if (indicadores().length) {
            <section class="indicadores" aria-label="Resumo do patch" data-testid="datamine-indicadores">
              @for (i of indicadores(); track i.chave) {
                <ui-resumo [rotulo]="i.rotulo" [valor]="(i.valor | number: '1.0-0') ?? ''" />
              }
            </section>
          }
          <details class="arquivos">
            <summary>{{ patch.patches.length }} arquivos do patch.txt aplicados</summary>
            <ul>
              @for (nome of nomes(); track nome) {
                <li>{{ nome }}</li>
              }
            </ul>
          </details>
          <section class="relatorio" aria-labelledby="titulo-relatorio">
            <h2 id="titulo-relatorio">Relatório completo</h2>
            <p class="dica">
              Itens com descrição, probabilidades das caixas, monstros, skills, mapas, quests, arquivos do GRF
              e tabelas Lua. As abas e a busca ficam dentro do quadro.
              <a [href]="urlRelatorio()" target="_blank" rel="noopener">Abrir em outra aba</a>.
            </p>
            <iframe
              class="quadro"
              [src]="urlSegura()"
              sandbox="allow-scripts"
              referrerpolicy="no-referrer"
              loading="lazy"
              [title]="'Relatório do ' + patch.titulo"
              data-testid="datamine-relatorio"
            ></iframe>
          </section>
        </ng-template>
      </ui-estado>
    </ui-pagina>
  `,
  styles: `
    .indicadores {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr));
      gap: var(--esp-3);
    }
    .arquivos {
      margin-top: var(--esp-4);
      color: var(--texto-suave);
      font-size: var(--fs-s);
    }
    .arquivos summary {
      cursor: pointer;
      padding: var(--esp-2) 0;
    }
    .arquivos summary:focus-visible {
      outline: 2px solid var(--foco);
      outline-offset: 2px;
    }
    .arquivos ul {
      margin: 0;
      padding-left: var(--esp-5);
      font-family: var(--fonte-mono);
      font-size: var(--fs-xs);
      overflow-wrap: anywhere;
    }
    .relatorio {
      margin-top: var(--esp-5);
    }
    .relatorio h2 {
      margin: 0 0 var(--esp-2);
      font-size: var(--fs-xl);
      font-weight: 700;
      color: var(--texto-forte);
    }
    .dica {
      margin: 0 0 var(--esp-3);
      color: var(--texto-suave);
      max-width: 80ch;
    }
    .quadro {
      display: block;
      width: 100%;
      min-height: 75dvh;
      border: 1px solid var(--borda);
      border-radius: var(--raio-g);
      background: var(--cartao);
    }
  `,
})
export class PatchPage {
  private readonly api = inject(DatamineApi);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly documento = inject(DOCUMENT);
  private readonly data = inject(DatePipe);

  /** Vem da rota `datamine/:id` (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly estado = signal<Carregavel<PatchResumido>>(carregando());
  protected readonly patch = computed(() => {
    const e = this.estado();
    return e.estado === "pronto" ? e.dados : null;
  });
  protected readonly titulo = computed(() => this.patch()?.titulo ?? "Patch do cliente");
  protected readonly subtitulo = computed(() => {
    const p = this.patch();
    if (p === null) return "O que esta atualização do RO LATAM trouxe.";
    return `Patch de ${this.data.transform(p.dataPatch, "dd/MM/yyyy")}${p.resumo.ragexe ? ", com Ragexe novo" : ""}.`;
  });
  protected readonly indicadores = computed(() => indicadoresDe(this.patch()?.resumo));
  protected readonly nomes = computed(() => nomesDosPatches(this.patch()?.patches ?? []));
  protected readonly urlRelatorio = computed(() => urlDoRelatorio(this.documento.baseURI, this.id()));
  /** Montada aqui, da base da aplicação e do id da rota: nada vem de fora, por isso pode ser confiada. */
  protected readonly urlSegura = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.urlRelatorio()),
  );

  constructor() {
    effect(() => {
      this.id();
      void this.carregar();
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
}
