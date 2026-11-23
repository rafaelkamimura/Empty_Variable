import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  type OnInit,
  signal,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { Acao } from "../../../core/acao";
import { mensagemDeErro } from "../../../core/modelos";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { EstadoComponent, EstadoProntoDirective } from "../../../shared/ui/estado/estado.component";
import { PaginaComponent } from "../../../shared/ui/pagina/pagina.component";
import { type Carregavel, carregando, comErro, pronto } from "../../../shared/utils/carregavel";
import { GrupoProgramadoComponent } from "../componentes/grupo-programado.component";
import { GruposApi } from "../data/grupos.api";
import type { AgendaProgramada } from "../data/programadas.modelos";

/**
 * Instâncias programadas (lado do membro): os grupos agendados pela gestão. O membro abre as vagas
 * de um grupo e entra numa com um personagem da classe pedida (um personagem por grupo).
 */
@Component({
  selector: "app-instancias-programadas-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    AvisoComponent,
    EstadoComponent,
    EstadoProntoDirective,
    PaginaComponent,
    GrupoProgramadoComponent,
  ],
  template: `
    <ui-pagina
      titulo="Instâncias programadas"
      subtitulo="Grupos agendados pela gestão. Abra as vagas e entre numa com um personagem da classe pedida."
    >
      <ui-estado
        [valor]="agenda()"
        [estaVazio]="vazia"
        mensagemVazio="Nenhuma instância programada."
        (tentarNovamente)="carregar()"
      >
        <ng-template uiEstadoPronto [tipo]="agenda()" let-a>
          @if (a.personagens.length === 0) {
            <ui-aviso tom="info" titulo="Você ainda não tem personagem vinculado">
              <a routerLink="/vinculo">Vincule um personagem</a> para entrar nas vagas.
            </ui-aviso>
          }
          <div class="agenda" data-testid="programadas-agenda">
            @for (g of a.grupos; track g.id) {
              <app-grupo-programado
                [attr.data-grupo]="g.id"
                [grupo]="g"
                [personagens]="a.personagens"
                [aberto]="aberto() === g.id"
                [enviando]="enviando()"
                [bloqueado]="enviando()"
                [erro]="erro()?.grupoId === g.id ? erro() : null"
                (alternar)="alternar(g.id)"
                (cancelou)="erro.set(null)"
                (participar)="participar(g.id, $event)"
              />
            }
          </div>
        </ng-template>
      </ui-estado>
    </ui-pagina>
  `,
  styles: `
    .agenda {
      display: grid;
      gap: var(--esp-3);
    }
  `,
})
export class InstanciasProgramadasPage implements OnInit {
  private readonly api = inject(GruposApi);
  private readonly acao = inject(Acao);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly agenda = signal<Carregavel<AgendaProgramada>>(carregando());
  /** Grupo com as vagas abertas. */
  protected readonly aberto = signal<string | null>(null);
  protected readonly enviando = signal(false);
  /** Erro do último envio, mostrado na própria vaga até tentar de novo ou cancelar. */
  protected readonly erro = signal<{ grupoId: string; vaga: number; mensagem: string } | null>(null);
  protected readonly vazia = (a: AgendaProgramada): boolean => a.grupos.length === 0;
  private versao = 0;

  ngOnInit(): void {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    const minha = ++this.versao;
    if (this.agenda().estado !== "pronto") this.agenda.set(carregando());
    try {
      const a = await this.api.agenda();
      if (minha === this.versao) this.agenda.set(pronto(a));
    } catch (e) {
      if (minha === this.versao) this.agenda.set(comErro(mensagemDeErro(e)));
    }
  }

  protected alternar(id: string): void {
    if (this.enviando()) return;
    this.aberto.update((atual) => (atual === id ? null : id));
  }

  protected async participar(grupoId: string, e: { vaga: number; personagemId: string }): Promise<void> {
    if (this.enviando()) return;
    this.enviando.set(true);
    this.erro.set(null);
    try {
      await this.api.participar(grupoId, e.vaga, e.personagemId);
      this.acao.avisar("Vaga confirmada.");
      await this.carregar();
      // O botão some (vira o selo "Você · …"): o foco vai para o selo, que o leitor de tela lê.
      afterNextRender(
        () =>
          this.host
            .querySelector<HTMLElement>(
              `[data-grupo="${CSS.escape(grupoId)}"] li:nth-child(${e.vaga}) [data-vaga-minha]`,
            )
            ?.focus(),
        { injector: this.injector },
      );
    } catch (erro) {
      this.erro.set({ grupoId, vaga: e.vaga, mensagem: mensagemDeErro(erro) });
      // A escala pode ter mudado (ex.: outra pessoa pegou a vaga): recarrega sem fechar a escolha.
      await this.carregar();
    } finally {
      this.enviando.set(false);
    }
  }
}
