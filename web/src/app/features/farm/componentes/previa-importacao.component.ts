import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";
import type { BackupDiario } from "@betel/farm";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { CartaoComponent } from "../../../shared/ui/cartao/cartao.component";
import type { PersonagemFarm } from "../data/farm.modelos";

/** Prévia do backup lido (D54): o que vem nele e de qual personagem do vínculo é cada um do artefato. */
@Component({
  selector: "app-previa-importacao",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotaoComponent, CampoComponent, CampoControleDirective, CartaoComponent],
  template: `
    @let b = backup();
    <ui-cartao>
      <p>
        {{ b.personagens.length }} personagem(ns), {{ b.instancias.length }} instância(s),
        {{ b.itens.length }} item(ns) e <strong>{{ b.checkins.length }} check-in(s)</strong>.
      </p>
      <h3>De qual personagem é cada um?</h3>
      @for (p of b.personagens; track p.id) {
        <ui-campo
          [rotulo]="'Personagem para ' + p.nome"
          [dica]="(contagem().get(p.id) ?? 0) + ' check-in(s) no backup'"
        >
          <select uiCampo (change)="mapear.emit({ doArtefato: p.id, personagemId: valor($event) })">
            <option value="" [selected]="!mapa()[p.id]">Não importar</option>
            @for (meu of personagens(); track meu.id) {
              <option [value]="meu.id" [selected]="mapa()[p.id] === meu.id">{{ meu.nome }}</option>
            }
          </select>
        </ui-campo>
      }
      <div class="acoes">
        <button uiBotao variante="principal" [carregando]="importando()" (click)="importar.emit()">
          {{ importando() && progresso() ? "Importando… " + progresso() : "Importar" }}
        </button>
      </div>
    </ui-cartao>
  `,
  styles: `
    :host {
      display: block;
    }
    p {
      margin: 0;
      color: var(--texto);
    }
    h3 {
      margin: var(--esp-2) 0 0;
      font-size: var(--fs-s);
      font-weight: 600;
      color: var(--texto-suave);
    }
    .acoes {
      display: flex;
      gap: var(--esp-2);
      padding-top: var(--esp-1);
    }
  `,
})
export class PreviaImportacaoComponent {
  readonly backup = input.required<BackupDiario>();
  readonly personagens = input.required<readonly PersonagemFarm[]>();
  /** Personagem do artefato → personagem do vínculo (ausente: não importar). */
  readonly mapa = input.required<Readonly<Record<string, string>>>();
  readonly importando = input(false);
  /** "250/1200" durante uma importação grande, em pedaços. */
  readonly progresso = input("");
  readonly mapear = output<{ doArtefato: string; personagemId: string }>();
  readonly importar = output();

  protected readonly contagem = computed(() => {
    const m = new Map<string, number>();
    for (const c of this.backup().checkins) m.set(c.personagem, (m.get(c.personagem) ?? 0) + 1);
    return m;
  });

  protected valor(evento: Event): string {
    return (evento.target as HTMLSelectElement).value;
  }
}
