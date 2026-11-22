import { ChangeDetectionStrategy, Component, computed, input, model, output, viewChild } from "@angular/core";
import { MatTabsModule } from "@angular/material/tabs";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { type ClasseFicha, type Ficha, fichaValida, type ItemEquipamento } from "../data/vinculo.modelos";
import { AvatarClasseComponent } from "./avatar-classe.component";
import { BuildFichaComponent } from "./build-ficha.component";
import { EquipamentosFichaComponent } from "./equipamentos-ficha.component";

export interface GrupoDeClasses {
  readonly nome: string;
  readonly classes: readonly ClasseFicha[];
}

/**
 * Ficha de um personagem em três abas: Personagem (nickname, classe e nível), Equipamentos (os 10
 * slots) e Build (observações, importação do link do simulador e atributos, D55 e D57). Edita a
 * ficha recebida por `[(ficha)]`; salvar e importar ficam com a página.
 */
@Component({
  selector: "app-ficha-personagem",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTabsModule,
    AvisoComponent,
    BotaoComponent,
    CampoComponent,
    CampoControleDirective,
    AvatarClasseComponent,
    EquipamentosFichaComponent,
    BuildFichaComponent,
  ],
  template: `
    @let f = ficha();
    <form (submit)="$event.preventDefault(); enviar()">
      <mat-tab-group animationDuration="0ms" mat-stretch-tabs aria-label="Seções da ficha">
        <mat-tab label="Personagem">
          <div class="aba">
            <div class="previa">
              <app-avatar-classe data-testid="retrato" tamanho="g" [classe]="nomeDaClasse()" />
              <div class="previa-texto">
                <strong>{{ f.nome.trim() || "Novo personagem" }}</strong>
                <small>{{ nomeDaClasse() || "Selecione a classe" }}</small>
                @if (f.nivelBase) {
                  <span class="nivel">Nv. {{ f.nivelBase }}</span>
                }
              </div>
            </div>
            <div class="identidade">
              <ui-campo rotulo="Nickname do personagem">
                <input
                  uiCampo
                  maxlength="23"
                  autocomplete="off"
                  spellcheck="false"
                  [value]="f.nome"
                  (input)="mudar({ nome: texto($event) })"
                />
              </ui-campo>
              <ui-campo rotulo="Classe">
                <select uiCampo (change)="mudar({ classeId: texto($event) })">
                  <option value="" [selected]="f.classeId === ''">Selecione</option>
                  @for (grupo of grupos(); track grupo.nome) {
                    <optgroup [label]="grupo.nome">
                      @for (classe of grupo.classes; track classe.id) {
                        <option [value]="classe.id" [selected]="f.classeId === classe.id">
                          {{ classe.nomeOficial }}{{ classe.apelidoGrupo ? " · " + classe.apelidoGrupo : "" }}
                        </option>
                      }
                    </optgroup>
                  }
                </select>
              </ui-campo>
              <ui-campo rotulo="Nível base" dica="De 1 a 250" [erro]="erroNivel()">
                <input
                  uiCampo
                  type="number"
                  min="1"
                  max="250"
                  step="1"
                  inputmode="numeric"
                  [value]="f.nivelBase ?? ''"
                  (input)="mudarNivel(texto($event))"
                />
              </ui-campo>
            </div>
          </div>
        </mat-tab>
        <mat-tab label="Equipamentos">
          <div class="aba">
            <app-equipamentos-ficha
              [equipamentos]="f.equipamentos"
              [catalogo]="catalogo()"
              [erroCatalogo]="erroCatalogo()"
              (mudou)="mudarEquipamento($event.slot, $event.valor)"
              (tentarDeNovo)="recarregarCatalogo.emit()"
            />
          </div>
        </mat-tab>
        <mat-tab label="Build">
          <app-build-ficha
            class="aba"
            [notas]="f.build"
            [atributos]="f.atributos"
            [personagemId]="personagemId()"
            [importando]="importando()"
            [avisoImportacao]="avisoImportacao()"
            (notasChange)="mudar({ build: $event })"
            (importar)="importar.emit($event)"
            (sair)="cancelar.emit()"
          />
        </mat-tab>
      </mat-tab-group>

      @if (erro(); as mensagem) {
        <ui-aviso tom="erro">{{ mensagem }}</ui-aviso>
      }
      <div class="acoes">
        <button uiBotao variante="fantasma" [disabled]="enviando()" (click)="cancelar.emit()">
          Cancelar
        </button>
        <button uiBotao variante="principal" tipo="submit" [carregando]="enviando()" [disabled]="!valida()">
          Salvar personagem
        </button>
      </div>
    </form>
  `,
  styles: `
    form {
      display: grid;
      gap: var(--esp-3);
    }
    .aba {
      display: grid;
      gap: var(--esp-3);
      padding-top: var(--esp-3);
    }
    .previa {
      display: flex;
      align-items: center;
      gap: var(--esp-3);
      padding: var(--esp-3);
      border: 1px solid var(--borda);
      border-radius: var(--raio-g);
      background: radial-gradient(ellipse at 10% 30%, var(--acento-fundo), transparent 70%), var(--cartao);
    }
    .previa-texto {
      display: grid;
      gap: var(--esp-1);
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .previa-texto strong {
      font-size: var(--fs-l);
      color: var(--texto-forte);
    }
    .previa-texto small {
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
    .nivel {
      justify-self: start;
      padding: 0 var(--esp-2);
      border-radius: var(--raio-p);
      background: var(--acento-degrade);
      color: var(--sobre-acento);
      font-size: var(--fs-xs);
      font-weight: 700;
      line-height: 1.6;
    }
    .identidade {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr));
      align-items: start;
      gap: var(--esp-3);
    }
    .acoes {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--esp-2);
      padding-top: var(--esp-2);
      border-top: 1px solid var(--borda);
    }
  `,
})
export class FichaPersonagemComponent {
  readonly ficha = model.required<Ficha>();
  readonly grupos = input.required<readonly GrupoDeClasses[]>();
  /** Catálogo de equipamentos por slot (null enquanto carrega). */
  readonly catalogo = input.required<Readonly<Record<string, ItemEquipamento[]>> | null>();
  readonly erroCatalogo = input(false);
  /** Personagem já vinculado (liga o atalho para o simulador). */
  readonly personagemId = input<string | null>(null);
  readonly importando = input(false);
  readonly avisoImportacao = input<string | null>(null);
  readonly erro = input<string | null>(null);
  readonly enviando = input(false);

  readonly importar = output<string>();
  readonly salvar = output<Ficha>();
  readonly cancelar = output();
  readonly recarregarCatalogo = output();

  private readonly build = viewChild(BuildFichaComponent);

  /** Limpa o campo do link depois de uma importação que deu certo. */
  limparLink(): void {
    this.build()?.limparLink();
  }

  protected readonly valida = computed(() => fichaValida(this.ficha()));
  protected readonly nomeDaClasse = computed(() => {
    const id = this.ficha().classeId;
    for (const g of this.grupos()) {
      const c = g.classes.find((x) => x.id === id);
      if (c) return c.nomeOficial;
    }
    return "";
  });
  protected readonly erroNivel = computed(() => {
    const n = this.ficha().nivelBase;
    return n !== null && (!Number.isInteger(n) || n < 1 || n > 250) ? "Use um nível de 1 a 250." : "";
  });

  protected texto(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected mudar(parte: Partial<Ficha>): void {
    this.ficha.update((f) => ({ ...f, ...parte }));
  }

  protected mudarNivel(valor: string): void {
    this.mudar({ nivelBase: valor.trim() === "" ? null : Number(valor) });
  }

  protected mudarEquipamento(slot: string, valor: ItemEquipamento | undefined): void {
    this.ficha.update((f) => {
      const { [slot]: _anterior, ...resto } = f.equipamentos;
      return { ...f, equipamentos: valor === undefined ? resto : { ...resto, [slot]: valor } };
    });
  }

  protected enviar(): void {
    if (this.valida() && !this.enviando()) this.salvar.emit(this.ficha());
  }
}
