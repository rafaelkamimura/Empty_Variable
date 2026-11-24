import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import type { FiltroLista } from "../data/filtro";
import type { MonstroPatch, SkillPatch } from "../data/relatorio.modelos";
import { BlocoCodigoComponent } from "./bloco-codigo.component";
import { DiffDescricaoComponent } from "./diff-descricao.component";
import { IdentificacaoComponent } from "./identificacao.component";
import { CorpoDaLinhaDirective, LinhaExpansivelComponent } from "./linha-expansivel.component";
import { LinhaSimplesComponent } from "./linha-simples.component";
import { LinhaDaListaDirective, ListaFiltradaComponent } from "./lista-filtrada.component";
import { TextoRoComponent } from "./texto-ro.component";

type Grupo = "monstro-novo" | "monstro-alterado" | "skill-nova" | "skill-alterada";

interface Entrada {
  readonly grupo: Grupo;
  readonly monstro: MonstroPatch | null;
  readonly skill: SkillPatch | null;
  readonly busca: string;
}

const POR_GRUPO: FiltroLista<Entrada> = {
  chave: "grupo",
  rotulo: "Filtrar por tipo",
  rotuloTodos: "Tudo",
  valorDe: (e) => e.grupo,
  opcoes: [
    ["monstro-novo", "Monstros e NPCs novos"],
    ["monstro-alterado", "Monstros alterados"],
    ["skill-nova", "Skills novas"],
    ["skill-alterada", "Skills alteradas"],
  ],
};

/** Aba "Monstros e skills": monstros e NPCs (npcidentity) e skills (skillinfolist e skilldescript) do patch. */
@Component({
  selector: "app-aba-monstros-skills",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeComponent,
    BlocoCodigoComponent,
    DiffDescricaoComponent,
    IdentificacaoComponent,
    LinhaDaListaDirective,
    CorpoDaLinhaDirective,
    LinhaExpansivelComponent,
    LinhaSimplesComponent,
    ListaFiltradaComponent,
    TextoRoComponent,
  ],
  template: `
    <app-lista-filtrada
      [itens]="entradas()"
      [textoDe]="textoDe"
      [filtros]="filtros"
      rotuloBusca="Buscar por nome, ID, constante ou sprite"
      mensagemVazio="Este patch não trouxe monstros nem skills."
    >
      <ng-template appLinhaDaLista [tipo]="entradas()" let-e>
        @if (e.monstro; as m) {
          <app-linha-simples>
            <app-identificacao
              [codigo]="m.id"
              [nome]="m.constante || '(sem constante)'"
              [detalhe]="'sprite ' + m.sprite"
            />
            @if (m.antes; as antes) {
              <ui-badge tom="alerta">Monstro alterado</ui-badge>
              <span class="antes">antes: {{ antes.constante }}, sprite {{ antes.sprite }}</span>
            } @else {
              <ui-badge tom="sucesso">Monstro novo</ui-badge>
            }
          </app-linha-simples>
        }
        @if (e.skill; as s) {
          <app-linha-expansivel>
            <app-identificacao [codigo]="s.id" [nome]="s.nome || s.constante" [detalhe]="detalheDaSkill(s)" />
            <ui-badge [tom]="s.situacao === 'novo' ? 'sucesso' : 'alerta'">{{
              s.situacao === "novo" ? "Skill nova" : "Skill alterada"
            }}</ui-badge>
            <ng-template appCorpoDaLinha>
              @if (s.descricaoAntes; as antes) {
                <app-diff-descricao [antes]="antes" [depois]="s.descricao" />
              } @else if (s.descricao.length > 0) {
                <app-texto-ro [linhas]="s.descricao" />
              } @else {
                <p class="sem">Sem descrição.</p>
              }
              @if (s.mudancas.length > 0) {
                <div>
                  <p class="titulo-bloco">Campos alterados</p>
                  <app-bloco-codigo [texto]="s.mudancas.join('\\n')" />
                </div>
              }
              @if (s.info) {
                <div>
                  <p class="titulo-bloco">Entrada no skillinfolist</p>
                  <app-bloco-codigo [texto]="s.info" />
                </div>
              }
            </ng-template>
          </app-linha-expansivel>
        }
      </ng-template>
    </app-lista-filtrada>
  `,
  styles: `
    :host {
      display: block;
    }
    .antes {
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
    .sem {
      margin: 0;
      color: var(--texto-apagado);
    }
    .titulo-bloco {
      margin: 0 0 var(--esp-1);
      font-size: var(--fs-s);
      font-weight: 600;
      color: var(--texto-suave);
    }
  `,
})
export class AbaMonstrosSkillsComponent {
  readonly monstros = input.required<readonly MonstroPatch[]>();
  readonly skills = input.required<readonly SkillPatch[]>();

  protected readonly filtros = [POR_GRUPO];
  protected readonly entradas = computed<Entrada[]>(() => [
    ...this.monstros().map((m): Entrada => ({
      grupo: m.situacao === "novo" ? "monstro-novo" : "monstro-alterado",
      monstro: m,
      skill: null,
      busca: m.busca,
    })),
    ...this.skills().map((s): Entrada => ({
      grupo: s.situacao === "novo" ? "skill-nova" : "skill-alterada",
      monstro: null,
      skill: s,
      busca: s.busca,
    })),
  ]);
  protected readonly textoDe = (e: Entrada): string => e.busca;

  protected detalheDaSkill(s: SkillPatch): string {
    return s.nivelMaximo > 0 ? `${s.constante} · nível máx. ${s.nivelMaximo}` : s.constante;
  }
}
