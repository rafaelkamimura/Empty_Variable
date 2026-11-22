import { ChangeDetectionStrategy, Component, computed, input, output, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { type AtributosBuild, resumoDosAtributos } from "../../../shared/dominio/build";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";

/**
 * Aba Build da ficha: observações, importação do link do simulador (D55) e os atributos que a
 * build importada guarda (D57). Com o personagem já vinculado, leva ao simulador de dano.
 */
@Component({
  selector: "app-build-ficha",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AvisoComponent, BotaoComponent, CampoComponent, CampoControleDirective],
  template: `
    <ui-campo rotulo="Observações da build">
      <textarea
        uiCampo
        maxlength="500"
        rows="4"
        [value]="notas()"
        (input)="notasChange.emit(texto($event))"
      ></textarea>
    </ui-campo>
    <div class="importar">
      <ui-campo
        rotulo="Importar do simulador"
        dica="Preenche a classe, o nível, os equipamentos (com refino, grau, cartas e encantamentos) e os atributos com os da simulação. Aceita o link completo ou o curto."
      >
        <input
          uiCampo
          type="url"
          inputmode="url"
          placeholder="Link do simulador.latam-tools.com.br"
          autocomplete="off"
          spellcheck="false"
          [value]="link()"
          (input)="link.set(texto($event))"
          (keydown.enter)="$event.preventDefault(); pedirImportacao()"
        />
      </ui-campo>
      <button
        uiBotao
        [carregando]="importando()"
        [disabled]="link().trim() === ''"
        (click)="pedirImportacao()"
      >
        Importar build
      </button>
    </div>
    @if (avisoImportacao(); as aviso) {
      <ui-aviso tom="sucesso">{{ aviso }}</ui-aviso>
    }
    @if (linhas().length > 0) {
      <ul class="atributos" data-testid="vinculo-atributos-build" aria-label="Atributos da build">
        @for (linha of linhas(); track linha) {
          <li>{{ linha }}</li>
        }
      </ul>
    }
    @if (personagemId(); as id) {
      <a
        uiBotao
        variante="fantasma"
        tamanho="p"
        routerLink="/simulador"
        [queryParams]="{ personagem: id }"
        (click)="sair.emit()"
        >Simular dano contra um chefe</a
      >
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
    a {
      justify-self: start;
    }
    .importar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: start;
      gap: var(--esp-2);
    }
    .importar button {
      margin-top: calc(var(--fs-s) * 1.5 + var(--esp-1));
    }
    .atributos {
      display: grid;
      gap: var(--esp-1);
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: var(--fs-s);
      color: var(--texto-suave);
      overflow-wrap: anywhere;
    }
    @container conteudo (max-width: 600px) {
      .importar {
        grid-template-columns: minmax(0, 1fr);
      }
      .importar button {
        margin-top: 0;
        justify-self: start;
      }
    }
  `,
})
export class BuildFichaComponent {
  readonly notas = input.required<string>();
  readonly atributos = input<AtributosBuild | undefined>(undefined);
  readonly personagemId = input<string | null>(null);
  readonly importando = input(false);
  readonly avisoImportacao = input<string | null>(null);
  readonly notasChange = output<string>();
  readonly importar = output<string>();
  /** O membro saiu da ficha pelo atalho do simulador. */
  readonly sair = output();

  protected readonly link = signal("");
  protected readonly linhas = computed(() => resumoDosAtributos(this.atributos()));

  /** Limpa o campo do link depois de uma importação que deu certo. */
  limparLink(): void {
    this.link.set("");
  }

  protected texto(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected pedirImportacao(): void {
    const link = this.link().trim();
    if (link !== "" && !this.importando()) this.importar.emit(link);
  }
}
