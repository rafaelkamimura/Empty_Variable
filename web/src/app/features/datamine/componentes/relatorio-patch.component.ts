import { DecimalPipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { MatTabsModule } from "@angular/material/tabs";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import type { RelatorioPatch } from "../data/relatorio.modelos";
import { AbaCaixasComponent } from "./aba-caixas.component";
import { AbaGrfComponent } from "./aba-grf.component";
import { AbaItensAlteradosComponent } from "./aba-itens-alterados.component";
import { AbaLuaComponent } from "./aba-lua.component";
import { AbaMapasQuestsComponent } from "./aba-mapas-quests.component";
import { AbaMonstrosSkillsComponent } from "./aba-monstros-skills.component";
import { AbaTextosComponent } from "./aba-textos.component";
import { ListaItensComponent } from "./lista-itens.component";

type ChaveAba =
  | "itens-novos"
  | "itens-alterados"
  | "caixas"
  | "monstros-skills"
  | "mapas-quests"
  | "grf"
  | "lua"
  | "textos";

interface Aba {
  readonly chave: ChaveAba;
  readonly rotulo: string;
  readonly quantidade: number;
}

/**
 * O relatório do patch em abas, cada uma com a contagem. O conteúdo de uma aba só é criado quando
 * ela é aberta pela primeira vez e fica guardado depois (a busca e os filtros não se perdem ao
 * trocar de aba), para o DOM ter só o que a pessoa pediu para ver.
 */
@Component({
  selector: "app-relatorio-patch",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    MatTabsModule,
    BadgeComponent,
    AbaCaixasComponent,
    AbaGrfComponent,
    AbaItensAlteradosComponent,
    AbaLuaComponent,
    AbaMapasQuestsComponent,
    AbaMonstrosSkillsComponent,
    AbaTextosComponent,
    ListaItensComponent,
  ],
  template: `
    <mat-tab-group animationDuration="0ms" preserveContent data-testid="datamine-abas">
      @for (aba of abas(); track aba.chave) {
        <mat-tab [aria-label]="aba.rotulo + ': ' + aba.quantidade">
          <ng-template mat-tab-label>
            <span class="rotulo" [attr.data-testid]="'datamine-aba-' + aba.chave">{{ aba.rotulo }}</span>
            <ui-badge class="qtd">{{ aba.quantidade | number: "1.0-0" }}</ui-badge>
          </ng-template>
          <ng-template matTabContent>
            <div class="aba" [attr.data-testid]="'datamine-conteudo-' + aba.chave">
              @switch (aba.chave) {
                @case ("itens-novos") {
                  <app-lista-itens
                    [itens]="relatorio().itensNovos"
                    mensagemVazio="Este patch não trouxe itens novos."
                  />
                }
                @case ("itens-alterados") {
                  <app-aba-itens-alterados
                    [alterados]="relatorio().itensAlterados"
                    [removidos]="relatorio().itensRemovidos"
                  />
                }
                @case ("caixas") {
                  <app-aba-caixas [caixas]="relatorio().caixas" />
                }
                @case ("monstros-skills") {
                  <app-aba-monstros-skills [monstros]="relatorio().monstros" [skills]="relatorio().skills" />
                }
                @case ("mapas-quests") {
                  <app-aba-mapas-quests [mapas]="relatorio().mapas" [quests]="relatorio().quests" />
                }
                @case ("grf") {
                  <app-aba-grf [arquivos]="relatorio().arquivosGrf" [resumo]="relatorio().resumoGrf" />
                }
                @case ("lua") {
                  <app-aba-lua [tabelas]="relatorio().tabelasLua" />
                }
                @case ("textos") {
                  <app-aba-textos [textos]="relatorio().textos" />
                }
              }
            </div>
          </ng-template>
        </mat-tab>
      }
    </mat-tab-group>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .qtd {
      margin-inline-start: var(--esp-2);
    }
    .aba {
      padding: var(--esp-4) var(--esp-1) var(--esp-1);
    }
  `,
})
export class RelatorioPatchComponent {
  readonly relatorio = input.required<RelatorioPatch>();

  protected readonly abas = computed<Aba[]>(() => {
    const r = this.relatorio();
    return [
      { chave: "itens-novos", rotulo: "Itens novos", quantidade: r.itensNovos.length },
      {
        chave: "itens-alterados",
        rotulo: "Itens alterados",
        quantidade: r.itensAlterados.length + r.itensRemovidos.length,
      },
      { chave: "caixas", rotulo: "Caixas e ovos", quantidade: r.caixas.length },
      {
        chave: "monstros-skills",
        rotulo: "Monstros e skills",
        quantidade: r.monstros.length + r.skills.length,
      },
      { chave: "mapas-quests", rotulo: "Mapas e quests", quantidade: r.mapas.length + r.quests.length },
      { chave: "grf", rotulo: "Arquivos do GRF", quantidade: r.arquivosGrf.length },
      { chave: "lua", rotulo: "Tabelas Lua", quantidade: r.tabelasLua.length },
      { chave: "textos", rotulo: "Textos", quantidade: r.textos.length },
    ];
  });
}
