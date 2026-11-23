import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
} from "@angular/core";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { valorDoEvento } from "../../../shared/utils/evento";
import { focarDepois, primeiroControle } from "../../../shared/utils/foco";
import { ROTULO_TIPO_VAGA } from "../data/grupos.modelos";
import type { MeuPersonagem, SituacaoVaga, VagaProgramada } from "../data/programadas.modelos";

/**
 * Uma vaga do grupo, do lado do membro: o que ela pede e, se ele pode, "Entrar na vaga" com um
 * personagem elegível. "Confirmar vaga" fica sempre clicável; sem personagem, mostra o erro (§6.4).
 */
@Component({
  selector: "app-vaga-programada",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, BotaoComponent, CampoComponent, CampoControleDirective],
  template: `
    @let v = vaga();
    <div class="requisito">
      <strong>Vaga {{ numero() }} · {{ rotuloTipo[v.tipo] }}</strong>
      <span class="detalhe">
        {{ v.classe ?? "Qualquer classe" }}
        @if (v.importancia !== null) {
          · importância {{ v.importancia }} de 5
        }
      </span>
    </div>
    @switch (situacao()) {
      @case ("minha") {
        <ui-badge tom="sucesso">Você · {{ v.meuPersonagem }}</ui-badge>
      }
      @case ("ocupada") {
        <ui-badge>Ocupada</ui-badge>
      }
      @case ("indisponivel") {
        <ui-badge>Livre</ui-badge>
      }
      @case ("sem-personagem") {
        <span class="detalhe">Sem personagem elegível</span>
      }
      @case ("elegivel") {
        @if (escolhendo()) {
          <div class="escolha">
            <ui-campo rotulo="Personagem" [erro]="erro()">
              <select uiCampo (change)="escolher(valor($event))">
                <option value="" [selected]="personagemId() === ''">Escolha</option>
                @for (p of personagens(); track p.id) {
                  <option [value]="p.id" [selected]="personagemId() === p.id">{{ p.nome }}</option>
                }
              </select>
            </ui-campo>
            <div class="acoes">
              <button
                uiBotao
                variante="principal"
                tamanho="p"
                [carregando]="enviando()"
                (click)="confirmar()"
              >
                Confirmar vaga
              </button>
              <button uiBotao variante="fantasma" tamanho="p" (click)="cancelar()">Cancelar</button>
            </div>
          </div>
        } @else {
          <button uiBotao tamanho="p" data-acao="entrar" [disabled]="bloqueado()" (click)="abrir()">
            Entrar na vaga
          </button>
        }
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--esp-2) var(--esp-3);
      padding: var(--esp-2) var(--esp-3);
      border: 1px solid var(--borda);
      border-radius: var(--raio-m);
      background: var(--cartao);
    }
    .requisito {
      display: grid;
      gap: var(--esp-1);
      min-width: 0;
    }
    strong {
      color: var(--texto-forte);
    }
    .detalhe {
      font-size: var(--fs-s);
      color: var(--texto-suave);
      overflow-wrap: anywhere;
    }
    .escolha {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: var(--esp-2);
      min-width: 0;
    }
    .acoes {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-2);
      padding-top: var(--esp-5);
    }
  `,
})
export class VagaProgramadaComponent {
  readonly vaga = input.required<VagaProgramada>();
  /** Posição na escala, de 1 a 12. */
  readonly numero = input.required<number>();
  readonly situacao = input.required<SituacaoVaga>();
  /** Personagens do membro que servem nesta vaga. */
  readonly personagens = input<readonly MeuPersonagem[]>([]);
  readonly enviando = input(false);
  /** Outra ação em andamento na tela: não abre a escolha. */
  readonly bloqueado = input(false);
  readonly participar = output<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  protected readonly rotuloTipo = ROTULO_TIPO_VAGA;
  protected readonly valor = valorDoEvento;
  protected readonly escolhendo = signal(false);
  protected readonly personagemId = signal("");
  protected readonly erro = signal<string | undefined>(undefined);

  protected abrir(): void {
    this.personagemId.set("");
    this.erro.set(undefined);
    this.escolhendo.set(true);
    focarDepois(this.injector, () => primeiroControle(this.host));
  }

  protected escolher(id: string): void {
    this.personagemId.set(id);
    if (id) this.erro.set(undefined);
  }

  protected confirmar(): void {
    if (this.enviando()) return;
    const id = this.personagemId();
    if (!id) {
      this.erro.set("Escolha o personagem.");
      focarDepois(this.injector, () => primeiroControle(this.host));
      return;
    }
    this.participar.emit(id);
  }

  protected cancelar(): void {
    this.escolhendo.set(false);
    focarDepois(this.injector, () => this.host.querySelector<HTMLElement>("[data-acao=entrar]"));
  }
}
