import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  NgZone,
  signal,
  viewChild,
} from "@angular/core";
import { MatTabsModule } from "@angular/material/tabs";
import { RouterLink } from "@angular/router";
import { DIAS_SEMANA, dataDoDia, diaDoJogo, diaMes, horaDoServidor, inicioDoDia } from "@betel/farm";
import { mensagemDeErro } from "../../../core/modelos";
import { FarmCadastroComponent } from "../../../paginas/farm-cadastro.component";
import { FarmImportarComponent } from "../../../paginas/farm-importar.component";
import { FarmTotaisComponent } from "../../../paginas/farm-totais.component";
import { type Carregavel, carregando, comErro, pronto } from "../../../shared/utils/carregavel";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { EstadoComponent, EstadoProntoDirective } from "../../../shared/ui/estado/estado.component";
import { PaginaComponent } from "../../../shared/ui/pagina/pagina.component";
import type { EstadoFarm } from "../data/farm.modelos";
import { FarmStore } from "../data/farm.store";
import { HojeAbaComponent } from "./hoje.aba";

const ABAS = ["hoje", "totais", "cadastro", "importar"] as const;
type Aba = (typeof ABAS)[number];

/**
 * Diário de farm (/farm, D48–D54): check-in das instâncias do dia por personagem do vínculo, com a
 * recarga de cada uma (reset às 04:00 de Brasília), totais, cadastro e a importação do artefato.
 * As abas Totais, Cadastro e Importar ainda são as antigas (migram no próximo PR).
 */
@Component({
  selector: "app-farm-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTabsModule,
    RouterLink,
    AvisoComponent,
    BotaoComponent,
    EstadoComponent,
    EstadoProntoDirective,
    PaginaComponent,
    HojeAbaComponent,
    FarmTotaisComponent,
    FarmCadastroComponent,
    FarmImportarComponent,
  ],
  template: `
    <ui-pagina titulo="Diário de farm" [subtitulo]="'Servidor: ' + relogio() + ' · reset em ' + resetEm()">
      <ui-estado
        [valor]="tela()"
        formatoCarregando="cartoes"
        [quantidadeCarregando]="4"
        (tentarNovamente)="carregar()"
      >
        <ng-template uiEstadoPronto [tipo]="tela()" let-est>
          @if (!est.vinculado) {
            <ui-aviso tom="info" titulo="Falta o vínculo com o seu jogador">
              O Diário usa os personagens do seu jogador. Peça o vínculo e, depois da aprovação, volte aqui.
              <a uiBotao tamanho="p" slot="acoes" routerLink="/vinculo">Pedir vínculo</a>
            </ui-aviso>
          } @else {
            <mat-tab-group
              animationDuration="0ms"
              [selectedIndex]="indice()"
              (selectedIndexChange)="indice.set($event)"
              aria-label="Diário de farm"
            >
              <mat-tab label="Hoje">
                <ng-template matTabContent>
                  <app-farm-hoje class="aba" [(selecionado)]="personagem" (irPara)="irPara($event)" />
                </ng-template>
              </mat-tab>
              <mat-tab label="Totais">
                <ng-template matTabContent><app-farm-totais class="aba antiga" /></ng-template>
              </mat-tab>
              <mat-tab label="Cadastro">
                <ng-template matTabContent><app-farm-cadastro class="aba antiga" /></ng-template>
              </mat-tab>
              <mat-tab label="Importar">
                <ng-template matTabContent
                  ><app-farm-importar class="aba antiga" (importado)="irPara('hoje')"
                /></ng-template>
              </mat-tab>
            </mat-tab-group>
          }
        </ng-template>
      </ui-estado>
    </ui-pagina>
  `,
  styles: `
    /* A aba Hoje já é grid (no próprio :host); as antigas precisam de bloco. */
    .aba {
      padding-top: var(--esp-4);
    }
    .antiga {
      display: block;
    }
  `,
})
export class FarmPage {
  protected readonly farm = inject(FarmStore);
  private readonly hoje = viewChild(HojeAbaComponent);
  protected readonly erro = signal<string | null>(null);
  protected readonly indice = signal(0);
  protected readonly personagem = signal("todos");

  protected readonly tela = computed<Carregavel<EstadoFarm>>(() => {
    const erro = this.erro();
    const est = this.farm.estado();
    return erro !== null ? comErro(erro) : est ? pronto(est) : carregando();
  });
  protected readonly relogio = computed(() => {
    const agora = this.farm.agora();
    const dia = diaDoJogo(agora);
    return `${DIAS_SEMANA[dataDoDia(dia).diaSemana]} ${diaMes(dia)} · ${horaDoServidor(agora)}`;
  });
  protected readonly resetEm = computed(() => {
    const falta = inicioDoDia(this.farm.hoje() + 1) - this.farm.agora();
    const h = Math.floor(falta / 3_600_000);
    const m = Math.floor((falta % 3_600_000) / 60_000);
    return `${h}h${String(m).padStart(2, "0")}`;
  });

  constructor() {
    void this.carregar();
    // A cada 30 s o relógio anda; na virada das 04:00, os cards voltam a ficar disponíveis.
    // Fora da zona: o intervalo não deixa a página "instável" (testes, hidratação); o sinal já agenda a renderização.
    const id = inject(NgZone).runOutsideAngular(() =>
      setInterval(() => {
        const antes = this.farm.hoje();
        this.farm.agora.set(Date.now());
        if (this.farm.hoje() !== antes && !this.hoje()?.editorAberto())
          void this.farm.carregar().catch(() => undefined);
      }, 30_000),
    );
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }

  async carregar(): Promise<void> {
    this.erro.set(null);
    try {
      await this.farm.carregar();
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
    }
  }

  protected irPara(aba: Aba): void {
    this.indice.set(ABAS.indexOf(aba));
  }
}
