import { ChangeDetectionStrategy, Component, computed, inject, model, output, signal } from "@angular/core";
import { formatarZeny, formatarZenyCompleto, RECARGAS, ROTULO_RECARGA, type Recarga } from "@betel/farm";
import { Acao } from "../../../core/acao";
import { Confirmacao } from "../../../core/confirmacao";
import { mensagemDeErro } from "../../../core/modelos";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { ChipsFiltroComponent, type OpcaoChip } from "../../../shared/ui/chips-filtro/chips-filtro.component";
import { ResumoComponent } from "../../../shared/ui/resumo/resumo.component";
import { VazioComponent } from "../../../shared/ui/vazio/vazio.component";
import type { ItemEscolhido } from "../componentes/busca-item.component";
import { CartaoInstanciaComponent } from "../componentes/cartao-instancia.component";
import { EditorDropsComponent, type ItemEditor } from "../componentes/editor-drops.component";
import { VisaoPersonagemComponent } from "../componentes/visao-personagem.component";
import {
  type CheckinFarm,
  checkinsDoDia,
  dicaDaRecarga,
  dropsDoRascunho,
  type InstanciaFarm,
  itensDoEditor,
  nomesDosDrops,
} from "../data/farm.modelos";
import { FarmStore } from "../data/farm.store";

/** Aba "Hoje" do Diário de farm: o check-in das instâncias de cada personagem (D48–D50). */
@Component({
  selector: "app-farm-hoje",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BotaoComponent,
    ChipsFiltroComponent,
    ResumoComponent,
    VazioComponent,
    CartaoInstanciaComponent,
    EditorDropsComponent,
    VisaoPersonagemComponent,
  ],
  template: `
    @if (farm.estado(); as est) {
      @if (est.instancias.length === 0) {
        <ui-vazio
          mensagem="Comece pelo cadastro: as instâncias que você faz, os itens que dropam e quem faz cada uma. Depois, volte aqui para o check-in."
        >
          <span slot="acao" class="acoes">
            <button uiBotao variante="principal" (click)="irPara.emit('cadastro')">Ir para o cadastro</button>
            <button uiBotao (click)="irPara.emit('importar')">Importar do artefato</button>
          </span>
        </ui-vazio>
      } @else {
        <ui-chips-filtro
          rotulo="Personagem"
          data-testid="personagens-farm"
          [opcoes]="opcoesPersonagem()"
          [selecionado]="selecionado()"
          (selecionadoChange)="selecionar($event)"
        />

        @if (selecionado() === "todos") {
          <div class="resumos">
            <ui-resumo rotulo="Check-ins hoje" [valor]="'' + checkinsHoje().length" />
            <ui-resumo
              rotulo="Zeny estimado hoje"
              [valor]="curto(valorHoje())"
              [meta]="completo(valorHoje()) + ' z'"
            />
          </div>
          <div class="grade">
            @for (p of est.personagens; track p.id) {
              <app-visao-personagem
                [nome]="p.nome"
                [feitas]="progresso(p.id).feitas"
                [total]="progresso(p.id).total"
                [pilulas]="pilulas(p.id)"
                (abrir)="selecionar(p.id)"
              />
            }
          </div>
        } @else {
          @let pid = selecionado();
          @if (farm.instanciasDe(pid).length === 0) {
            <ui-vazio
              mensagem="Este personagem ainda não tem instâncias. No cadastro, abra uma instância e marque este personagem em “Quem faz”."
            >
              <button uiBotao variante="principal" slot="acao" (click)="irPara.emit('cadastro')">
                Ir para o cadastro
              </button>
            </ui-vazio>
          } @else {
            <div class="resumos">
              <ui-resumo
                rotulo="Feitas no ciclo atual"
                [valor]="progresso(pid).feitas + '/' + progresso(pid).total"
              />
              <ui-resumo
                rotulo="Zeny estimado hoje"
                [valor]="curto(valorHojeDe(pid))"
                [meta]="completo(valorHojeDe(pid)) + ' z'"
              />
            </div>
            @for (r of recargas; track r) {
              @let lista = instanciasPorRecarga(pid, r);
              @if (lista.length > 0) {
                <section class="secao" [attr.aria-labelledby]="'recarga-' + r">
                  <div class="secao-topo">
                    <h2 [id]="'recarga-' + r">{{ rotuloRecarga[r] }}</h2>
                    <span class="dica">{{ dica(r) }}</span>
                  </div>
                  <div class="grade">
                    @for (i of lista; track i.id) {
                      @let s = farm.situacaoDe(pid, i);
                      <app-cartao-instancia
                        [instancia]="i"
                        [situacao]="s"
                        [hoje]="farm.hoje()"
                        [nomesDrops]="nomes(i)"
                        [valor]="s.checkin ? farm.valorDe(s.checkin.drops) : 0"
                        [aberto]="aberto() === chave(pid, i)"
                        (checkin)="abrir(pid, i, null)"
                        (editar)="abrir(pid, i, s.checkin)"
                        (desfazer)="desfazer(i, s.checkin)"
                      >
                        @if (aberto() === chave(pid, i)) {
                          <app-editor-drops
                            [itens]="itensEditor(i)"
                            [quantidades]="rascunho()"
                            [prefixo]="'q-' + i.id + '-'"
                            [buscar]="farm.buscarItens"
                            [editando]="editando() !== null"
                            [enviando]="enviando()"
                            [lembrar]="lembrar()"
                            (definir)="definir($event.id, $event.valor)"
                            (extra)="adicionarExtra(i, $event)"
                            (lembrarMudou)="lembrar.set($event)"
                            (confirmar)="confirmar(pid, i)"
                            (cancelar)="fechar()"
                          />
                        }
                      </app-cartao-instancia>
                    }
                  </div>
                </section>
              }
            }
          }
        }
      }
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-4);
    }
    .acoes {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--esp-2);
    }
    .resumos {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
      gap: var(--esp-3);
    }
    .grade {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
      gap: var(--esp-3);
    }
    .secao {
      display: grid;
      gap: var(--esp-3);
    }
    .secao-topo {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--esp-1) var(--esp-3);
    }
    h2 {
      margin: 0;
      font-size: var(--fs-l);
      font-weight: 600;
      color: var(--texto-forte);
    }
    .dica {
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
  `,
})
export class HojeAbaComponent {
  protected readonly farm = inject(FarmStore);
  private readonly acao = inject(Acao);
  private readonly confirmacao = inject(Confirmacao);

  /** Pede para a página trocar de aba (ex.: "Ir para o cadastro"). */
  readonly irPara = output<"cadastro" | "importar">();

  protected readonly recargas = RECARGAS;
  protected readonly rotuloRecarga = ROTULO_RECARGA;
  /** Personagem escolhido (ou "todos"); fica na página para sobreviver à troca de aba. */
  readonly selecionado = model("todos");
  /** Cartão com o editor aberto: "personagem|instância". */
  protected readonly aberto = signal<string | null>(null);
  protected readonly editando = signal<CheckinFarm | null>(null);
  protected readonly rascunho = signal<Record<string, string>>({});
  protected readonly extras = signal<string[]>([]);
  protected readonly lembrar = signal(true);
  protected readonly enviando = signal(false);

  protected readonly checkinsHoje = computed(() =>
    checkinsDoDia(this.farm.estado()?.checkinsRecentes ?? [], this.farm.hoje()),
  );
  protected readonly valorHoje = computed(() =>
    this.checkinsHoje().reduce((s, c) => s + this.farm.valorDe(c.drops), 0),
  );
  protected readonly opcoesPersonagem = computed<OpcaoChip[]>(() => [
    { valor: "todos", rotulo: "Todos" },
    ...(this.farm.estado()?.personagens ?? []).map((p) => {
      const pr = this.progresso(p.id);
      return {
        valor: p.id,
        rotulo: p.nome,
        ...(pr.total > 0 ? { contagem: `${pr.feitas}/${pr.total}` } : {}),
      };
    }),
  ]);

  /** A página está com o editor aberto (o relógio não recarrega o estado no meio da digitação). */
  editorAberto(): boolean {
    return this.aberto() !== null;
  }

  protected curto(v: number): string {
    return formatarZeny(v);
  }
  protected completo(v: number): string {
    return formatarZenyCompleto(v);
  }
  protected dica(r: Recarga): string {
    return dicaDaRecarga(r, this.farm.hoje());
  }
  protected nomes(i: InstanciaFarm): string {
    return nomesDosDrops(i, this.farm.itemPorId());
  }
  protected chave(personagemId: string, i: InstanciaFarm): string {
    return `${personagemId}|${i.id}`;
  }

  protected progresso(personagemId: string): { feitas: number; total: number } {
    const lista = this.farm.instanciasDe(personagemId);
    return {
      feitas: lista.filter((i) => this.farm.situacaoDe(personagemId, i).feita).length,
      total: lista.length,
    };
  }

  protected pilulas(personagemId: string): { nome: string; feita: boolean }[] {
    return this.farm
      .instanciasDe(personagemId)
      .map((i) => ({ nome: i.nome, feita: this.farm.situacaoDe(personagemId, i).feita }));
  }

  protected valorHojeDe(personagemId: string): number {
    return this.checkinsHoje()
      .filter((c) => c.personagemId === personagemId)
      .reduce((s, c) => s + this.farm.valorDe(c.drops), 0);
  }

  protected instanciasPorRecarga(personagemId: string, recarga: Recarga): InstanciaFarm[] {
    return this.farm.instanciasDe(personagemId).filter((i) => i.recarga === recarga);
  }

  protected itensEditor(i: InstanciaFarm): ItemEditor[] {
    const porId = this.farm.itemPorId();
    return itensDoEditor(i, this.editando(), this.extras()).map((id) => {
      const item = porId.get(id);
      return { id, nome: item?.nome ?? "Item", idJogo: item?.idJogo ?? null };
    });
  }

  protected selecionar(id: string): void {
    this.selecionado.set(id);
    this.fechar();
  }

  protected abrir(personagemId: string, i: InstanciaFarm, checkin: CheckinFarm | null): void {
    this.aberto.set(this.chave(personagemId, i));
    this.editando.set(checkin);
    this.extras.set([]);
    const r: Record<string, string> = {};
    for (const d of checkin?.drops ?? []) r[d.farmItemId] = String(d.quantidade);
    this.rascunho.set(r);
  }

  protected fechar(): void {
    this.aberto.set(null);
    this.editando.set(null);
    this.rascunho.set({});
    this.extras.set([]);
  }

  protected definir(itemId: string, valor: string): void {
    this.rascunho.update((r) => ({ ...r, [itemId]: valor }));
  }

  protected async adicionarExtra(i: InstanciaFarm, item: ItemEscolhido): Promise<void> {
    try {
      const criado = this.lembrar()
        ? await this.farm.adicionarDrop(i.id, { nome: item.nome, idJogo: item.idJogo })
        : await this.farm.criarItem({ nome: item.nome, idJogo: item.idJogo });
      if (!this.lembrar()) this.extras.update((x) => [...x, criado.id]);
      if (!this.rascunho()[criado.id]) this.definir(criado.id, "1");
    } catch (e) {
      this.acao.avisar(mensagemDeErro(e));
    }
  }

  protected async confirmar(personagemId: string, i: InstanciaFarm): Promise<void> {
    if (this.enviando()) return;
    const drops = dropsDoRascunho(itensDoEditor(i, this.editando(), this.extras()), this.rascunho());
    const editando = this.editando();
    this.enviando.set(true);
    const ok = await this.acao.executar(
      () =>
        editando
          ? this.farm.editarDrops(editando.id, drops)
          : this.farm.fazerCheckin(personagemId, i.id, drops),
      editando ? "Drops salvos." : `Check-in de ${i.nome} feito.`,
    );
    this.enviando.set(false);
    if (ok) this.fechar();
  }

  protected async desfazer(i: InstanciaFarm, c: CheckinFarm | null): Promise<void> {
    if (!c) return;
    const sim = await this.confirmacao.perguntar({
      titulo: `Desfazer o check-in de ${i.nome}?`,
      descricao: "A instância volta a ficar disponível hoje e os drops dessa run saem dos totais.",
      confirmar: "Desfazer check-in",
      perigo: true,
    });
    if (sim) await this.acao.executar(() => this.farm.desfazer(c.id), "Check-in desfeito.");
  }
}
