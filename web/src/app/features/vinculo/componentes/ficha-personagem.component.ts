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
  templateUrl: "./ficha-personagem.component.html",
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
