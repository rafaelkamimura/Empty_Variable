import { DatePipe } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  output,
} from "@angular/core";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { GrupoCamposComponent } from "../../../shared/ui/grupo-campos/grupo-campos.component";
import { valorDoEvento } from "../../../shared/utils/evento";
import { focarDepois } from "../../../shared/utils/foco";
import {
  candidatos,
  comVaga,
  faltamObrigatorias,
  type Grupo,
  type OpcoesGrupos,
  preenchidas,
  ROTULO_TIPO_VAGA,
  TOTAL_VAGAS,
  type Vaga,
} from "../data/grupos.modelos";

/**
 * Escala de um grupo já criado: quem ocupa cada uma das 12 vagas. A composição (tipo, classe e
 * importância) é definida na criação e não muda aqui. "Fechar grupo" exige as obrigatórias
 * preenchidas: sem elas, mostra quantas faltam e leva o foco à primeira (§6.4).
 */
@Component({
  selector: "app-escala-grupo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    AvisoComponent,
    BadgeComponent,
    BotaoComponent,
    CampoComponent,
    CampoControleDirective,
    GrupoCamposComponent,
  ],
  template: `
    @let g = grupo();
    <p class="quando">
      {{ g.agendadoEm | date: "dd/MM/yyyy HH:mm" : "-0300" }} · horário de São Paulo ·
      <span aria-live="polite">{{ total() }}/{{ totalVagas }} vagas preenchidas</span>
      @if (fechado()) {
        <ui-badge>Fechado</ui-badge>
      }
    </p>
    <div class="vagas">
      @for (v of vagas(); track $index; let i = $index) {
        <ui-grupo-campos [legenda]="'Vaga ' + (i + 1)" [class.obrigatoria]="v.tipo === 'OBRIGATORIA'">
          <p class="requisito">
            {{ rotuloTipo[v.tipo] }}
            @if (v.classeId) {
              · {{ nomeClasse(v.classeId) }} · importância {{ v.importancia }} de 5
            }
          </p>
          <ui-campo rotulo="Personagem" [erro]="erroVaga(i)">
            <select
              uiCampo
              [attr.data-vaga]="i"
              [disabled]="fechado() || salvando()"
              (change)="ocupar(i, valor($event))"
            >
              <option value="" [selected]="v.personagemId === null">Vaga em aberto</option>
              @for (p of candidatosDe(i); track p.id) {
                <option [value]="p.id" [selected]="v.personagemId === p.id">
                  {{ p.nome }} · {{ p.jogador.apelido }}
                </option>
              }
              @if (v.personagemId && !disponivel(v.personagemId)) {
                <option [value]="v.personagemId" selected>Personagem indisponível</option>
              }
            </select>
          </ui-campo>
        </ui-grupo-campos>
      }
    </div>
    @if (!fechado()) {
      @if (tentouFechar() && faltam() > 0) {
        <ui-aviso tom="erro">Preencha {{ faltam() }} vaga(s) obrigatória(s) para fechar o grupo.</ui-aviso>
      }
      <div class="acoes">
        <button
          uiBotao
          variante="principal"
          [carregando]="salvando()"
          (click)="salvar.emit({ vagas: vagas(), fechar: false })"
        >
          Salvar escala
        </button>
        <button uiBotao [disabled]="salvando()" (click)="fechar()">Fechar grupo</button>
      </div>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
    .quando {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--esp-2);
      margin: 0;
      color: var(--texto-suave);
    }
    .vagas {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
      gap: var(--esp-3);
    }
    .requisito {
      margin: 0;
      font-size: var(--fs-s);
      color: var(--texto-suave);
      overflow-wrap: anywhere;
    }
    .obrigatoria {
      --borda: var(--acento);
    }
    .acoes {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-2);
    }
  `,
})
export class EscalaGrupoComponent {
  readonly grupo = input.required<Grupo>();
  readonly opcoes = input.required<OpcoesGrupos>();
  readonly salvando = input(false);
  readonly salvar = output<{ vagas: readonly Vaga[]; fechar: boolean }>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  protected readonly rotuloTipo = ROTULO_TIPO_VAGA;
  protected readonly totalVagas = TOTAL_VAGAS;
  protected readonly valor = valorDoEvento;
  /** Cópia editável da escala; volta à do grupo quando ele muda (outro grupo ou salvo). */
  protected readonly vagas = linkedSignal<readonly Vaga[]>(() => this.grupo().vagas);
  protected readonly tentouFechar = linkedSignal(() => (this.grupo(), false));
  protected readonly fechado = computed(() => this.grupo().fechadoEm !== null);
  protected readonly total = computed(() => preenchidas(this.vagas()));
  protected readonly faltam = computed(() => faltamObrigatorias(this.vagas()));
  private readonly nomes = computed(() => new Map(this.opcoes().classes.map((c) => [c.id, c.nomeOficial])));
  private readonly disponiveis = computed(() => new Set(this.opcoes().personagens.map((p) => p.id)));
  private readonly candidatosPorVaga = computed(() =>
    this.vagas().map((_, i) => candidatos(this.vagas(), i, this.opcoes().personagens)),
  );

  protected nomeClasse(id: string): string {
    return this.nomes().get(id) ?? "Classe indisponível";
  }
  protected disponivel(id: string): boolean {
    return this.disponiveis().has(id);
  }
  protected candidatosDe(i: number) {
    return this.candidatosPorVaga()[i] ?? [];
  }
  protected erroVaga(i: number): string | undefined {
    const v = this.vagas()[i];
    return this.tentouFechar() && v?.tipo === "OBRIGATORIA" && !v.personagemId
      ? "Obrigatória: escolha quem ocupa a vaga para fechar o grupo."
      : undefined;
  }

  protected ocupar(i: number, personagemId: string): void {
    this.vagas.update((vagas) => comVaga(vagas, i, { personagemId: personagemId || null }));
  }

  protected fechar(): void {
    if (this.salvando()) return;
    const primeira = this.vagas().findIndex((v) => v.tipo === "OBRIGATORIA" && !v.personagemId);
    if (primeira < 0) {
      this.salvar.emit({ vagas: this.vagas(), fechar: true });
      return;
    }
    this.tentouFechar.set(true);
    focarDepois(this.injector, () => this.host.querySelector<HTMLElement>(`[data-vaga="${primeira}"]`));
  }
}
