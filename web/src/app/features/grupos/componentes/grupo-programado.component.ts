import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CartaoComponent } from "../../../shared/ui/cartao/cartao.component";
import { TOTAL_VAGAS } from "../data/grupos.modelos";
import {
  elegiveis,
  type GrupoProgramado,
  type MeuPersonagem,
  ocupadas,
  situacaoDaVaga,
} from "../data/programadas.modelos";
import { VagaProgramadaComponent } from "./vaga-programada.component";

/** Um grupo agendado na agenda do membro: instância, horário, ocupação e, aberto, as 12 vagas. */
@Component({
  selector: "app-grupo-programado",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, BadgeComponent, BotaoComponent, CartaoComponent, VagaProgramadaComponent],
  template: `
    @let g = grupo();
    <ui-cartao [destaque]="aberto()">
      <div slot="cabecalho" class="cabecalho">
        <h2>{{ g.instancia.nome }}</h2>
        <ui-badge [tom]="g.fechadoEm ? 'neutro' : 'sucesso'">{{
          g.fechadoEm ? "Fechado" : "Aberto"
        }}</ui-badge>
      </div>
      <p class="quando">
        {{ g.agendadoEm | date: "dd/MM/yyyy 'às' HH:mm" : "-0300" }} · horário de São Paulo · {{ total() }}/{{
          totalVagas
        }}
        preenchidas
      </p>
      <button
        uiBotao
        tamanho="p"
        [attr.aria-expanded]="aberto()"
        [attr.aria-controls]="'vagas-' + g.id"
        (click)="alternar.emit()"
      >
        {{ aberto() ? "Recolher vagas" : "Ver vagas" }}
      </button>
      @if (aberto()) {
        <ul class="vagas" [id]="'vagas-' + g.id" aria-label="Vagas do grupo">
          @for (v of g.vagas; track $index; let i = $index) {
            <li>
              <app-vaga-programada
                [vaga]="v"
                [numero]="i + 1"
                [situacao]="situacao(i)"
                [personagens]="elegiveisDe(i)"
                [enviando]="enviando()"
                [bloqueado]="bloqueado()"
                (participar)="participar.emit({ vaga: i + 1, personagemId: $event })"
              />
            </li>
          }
        </ul>
      }
    </ui-cartao>
  `,
  styles: `
    .cabecalho {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--esp-2);
    }
    h2 {
      margin: 0;
      font-size: var(--fs-l);
      color: var(--texto-forte);
      overflow-wrap: anywhere;
    }
    .quando {
      margin: 0;
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
    ui-cartao > button {
      align-self: flex-start;
    }
    .vagas {
      display: grid;
      gap: var(--esp-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
  `,
})
export class GrupoProgramadoComponent {
  readonly grupo = input.required<GrupoProgramado>();
  readonly personagens = input.required<readonly MeuPersonagem[]>();
  readonly aberto = input(false);
  readonly enviando = input(false);
  readonly bloqueado = input(false);
  readonly alternar = output();
  readonly participar = output<{ vaga: number; personagemId: string }>();

  protected readonly totalVagas = TOTAL_VAGAS;
  protected readonly total = computed(() => ocupadas(this.grupo()));
  private readonly situacoes = computed(() =>
    this.grupo().vagas.map((v) => situacaoDaVaga(this.grupo(), v, this.personagens())),
  );
  private readonly elegiveisPorVaga = computed(() =>
    this.grupo().vagas.map((v) => elegiveis(v, this.personagens())),
  );

  protected situacao(i: number) {
    return this.situacoes()[i] ?? "indisponivel";
  }
  protected elegiveisDe(i: number) {
    return this.elegiveisPorVaga()[i] ?? [];
  }
}
