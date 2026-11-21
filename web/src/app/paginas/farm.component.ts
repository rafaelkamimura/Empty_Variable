import { Component, computed, inject, type OnDestroy, type OnInit, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import {
  DIAS_SEMANA,
  RECARGAS,
  ROTULO_RECARGA,
  type Recarga,
  cicloDoCalendario,
  dataDoDia,
  diaDoJogo,
  diaMes,
  formatarZeny,
  formatarZenyCompleto,
  horaDoServidor,
  inicioDoDia,
  rotuloDoDia,
} from "@betel/farm";
import { Acao } from "../core/acao";
import { type CheckinFarm, type InstanciaFarm, type SituacaoCard, FarmStore } from "../core/farm";
import { FarmBuscaItemComponent, type ItemEscolhido } from "../core/farm-busca-item.component";
import { ImagemItemComponent } from "../core/imagem-item.component";
import { mensagemDeErro } from "../core/modelos";
import { FarmCadastroComponent } from "./farm-cadastro.component";
import { FarmImportarComponent } from "./farm-importar.component";
import { FarmTotaisComponent } from "./farm-totais.component";

type Aba = "hoje" | "totais" | "cadastro" | "importar";

/**
 * D48–D54: Diário de farm. Check-in das instâncias do dia por personagem do vínculo, com a
 * recarga de cada uma (reset às 04:00 de Brasília), totais por dia, semana e mês, cadastro e a
 * importação do artefato antigo. Estilos em src/styles/_legado-farm.scss (globais, escopados em app-farm).
 */
@Component({
  selector: "app-farm",
  imports: [
    RouterLink,
    ImagemItemComponent,
    FarmBuscaItemComponent,
    FarmTotaisComponent,
    FarmCadastroComponent,
    FarmImportarComponent,
  ],
  template: `
    <div class="pagina">
      <div class="cabecalho">
        <div>
          <h1>Diário de farm</h1>
          <p>
            Servidor: <strong>{{ relogio() }}</strong> · reset em {{ resetEm() }}
          </p>
        </div>
      </div>

      @if (erro(); as e) {
        <p role="alert">{{ e }}</p>
      }

      @if (farm.estado(); as est) {
        @if (!est.vinculado) {
          <div class="vazio">
            <h2>Falta o vínculo com o seu jogador</h2>
            <p class="dica">
              O Diário usa os personagens do seu jogador. Peça o vínculo e, depois da aprovação, volte aqui.
            </p>
            <a class="botao-acao" routerLink="/vinculo">Pedir vínculo</a>
          </div>
        } @else {
          <div class="abas" role="tablist" aria-label="Diário de farm">
            @for (a of abas; track a.id) {
              <button
                type="button"
                class="aba"
                role="tab"
                [attr.aria-selected]="aba() === a.id"
                (click)="aba.set(a.id)"
              >
                {{ a.rotulo }}
              </button>
            }
          </div>

          @switch (aba()) {
            @case ("totais") {
              <app-farm-totais />
            }
            @case ("cadastro") {
              <app-farm-cadastro />
            }
            @case ("importar") {
              <app-farm-importar (importado)="aba.set('hoje')" />
            }
            @default {
              @if (est.instancias.length === 0) {
                <div class="vazio">
                  <h2>Comece pelo cadastro</h2>
                  <ol>
                    <li>Cadastre as instâncias que você faz e o tipo de recarga de cada uma.</li>
                    <li>Liste os itens que costumam dropar. O preço de venda é opcional.</li>
                    <li>Marque quais personagens fazem cada instância e volte aqui para o check-in.</li>
                  </ol>
                  <div class="acoes">
                    <button type="button" class="botao primario" (click)="aba.set('cadastro')">
                      Ir para o cadastro
                    </button>
                    <button type="button" class="botao" (click)="aba.set('importar')">
                      Importar do artefato
                    </button>
                  </div>
                </div>
              } @else {
                <div class="chips" data-testid="personagens-farm">
                  <button
                    type="button"
                    class="chip"
                    [attr.aria-pressed]="selecionado() === 'todos'"
                    (click)="selecionar('todos')"
                  >
                    Todos
                  </button>
                  @for (p of est.personagens; track p.id) {
                    <button
                      type="button"
                      class="chip"
                      [attr.aria-pressed]="selecionado() === p.id"
                      (click)="selecionar(p.id)"
                    >
                      {{ p.nome }}
                      @if (progresso(p.id); as pr) {
                        <span class="contagem">{{ pr.feitas }}/{{ pr.total }}</span>
                      }
                    </button>
                  }
                </div>

                @if (selecionado() === "todos") {
                  <div class="resumo-farm">
                    <span
                      ><span class="numero">{{ checkinsHoje().length }}</span> check-ins hoje</span
                    >
                    <span>
                      <span class="numero z" [title]="completo(valorHoje()) + ' z'">{{
                        curto(valorHoje())
                      }}</span>
                      zeny estimado hoje
                    </span>
                  </div>
                  <div class="grade">
                    @for (p of est.personagens; track p.id) {
                      <button type="button" class="cartao visao" (click)="selecionar(p.id)">
                        <span class="inst-topo">
                          <strong>{{ p.nome }}</strong>
                          <span class="dica"
                            >{{ progresso(p.id)?.feitas ?? 0 }}/{{ progresso(p.id)?.total ?? 0 }}</span
                          >
                        </span>
                        <span class="pilulas">
                          @for (i of farm.instanciasDe(p.id); track i.id) {
                            <span class="pilula" [class.feita]="farm.situacaoDe(p.id, i).feita">{{
                              i.nome
                            }}</span>
                          } @empty {
                            <span class="dica">Nenhuma instância marcada para este personagem.</span>
                          }
                        </span>
                      </button>
                    }
                  </div>
                } @else {
                  @let pid = selecionado();
                  @if (farm.instanciasDe(pid).length === 0) {
                    <div class="vazio">
                      <h2>Este personagem ainda não tem instâncias</h2>
                      <p class="dica">
                        No cadastro, abra uma instância e marque este personagem em “Quem faz”.
                      </p>
                      <button type="button" class="botao primario" (click)="aba.set('cadastro')">
                        Ir para o cadastro
                      </button>
                    </div>
                  } @else {
                    <div class="resumo-farm">
                      <span>
                        <span class="numero">{{ progresso(pid)?.feitas }}/{{ progresso(pid)?.total }}</span>
                        feitas no ciclo atual
                      </span>
                      <span>
                        <span class="numero z">{{ curto(valorHojeDe(pid)) }}</span>
                        zeny estimado hoje
                      </span>
                    </div>
                    @for (r of recargas; track r) {
                      @let lista = instanciasPorRecarga(pid, r);
                      @if (lista.length > 0) {
                        <section class="secao">
                          <div class="secao-topo">
                            <h2>{{ rotuloRecarga[r] }}</h2>
                            <span class="dica">{{ dicaReset(r) }}</span>
                          </div>
                          <div class="grade">
                            @for (i of lista; track i.id) {
                              @let s = farm.situacaoDe(pid, i);
                              <article
                                class="cartao inst"
                                [class.feita]="s.feita"
                                [attr.data-testid]="'inst-' + i.nome"
                              >
                                <div class="inst-topo">
                                  <h3>{{ i.nome }}</h3>
                                  <span class="selo">{{ rotuloRecarga[i.recarga] }}</span>
                                </div>
                                @if (s.feita && s.checkin; as c) {
                                  <p class="estado-feito">
                                    ✓ Feita {{ dia(c.feitoEm) }} às {{ hora(c.feitoEm) }}
                                  </p>
                                  <p class="drops">
                                    {{ textoDrops(c) }}
                                    @if (farm.valorDe(c.drops) > 0) {
                                      · <span class="z">{{ curto(farm.valorDe(c.drops)) }}</span>
                                    }
                                  </p>
                                  <p class="dica">Libera {{ libera(s) }} às 04:00</p>
                                } @else {
                                  <p class="drops">{{ nomesDrops(i) }}</p>
                                  @if (s.diaFeita !== null) {
                                    <p class="dica">Última vez: {{ rotuloDia(s.diaFeita) }}</p>
                                  }
                                }

                                @if (aberto() === chave(pid, i)) {
                                  <div class="painel">
                                    <span class="rotulo">Quanto dropou nesta run</span>
                                    @for (itemId of itensDoPainel(i, s); track itemId) {
                                      @let item = farm.itemPorId().get(itemId);
                                      <div class="linha-q">
                                        <app-imagem-item
                                          [idJogo]="item?.idJogo"
                                          [nome]="item?.nome ?? 'item'"
                                          [tamanho]="24"
                                        />
                                        <label [for]="'q-' + itemId">{{ item?.nome ?? "Item" }}</label>
                                        <span class="passo">
                                          <button
                                            type="button"
                                            class="botao pequeno"
                                            (click)="passo(itemId, -1)"
                                            [attr.aria-label]="'Menos ' + item?.nome"
                                          >
                                            −
                                          </button>
                                          <input
                                            type="number"
                                            min="0"
                                            inputmode="numeric"
                                            placeholder="0"
                                            [id]="'q-' + itemId"
                                            [value]="quantidade(itemId)"
                                            (input)="definir(itemId, $any($event.target).value)"
                                          />
                                          <button
                                            type="button"
                                            class="botao pequeno"
                                            (click)="passo(itemId, 1)"
                                            [attr.aria-label]="'Mais ' + item?.nome"
                                          >
                                            +
                                          </button>
                                        </span>
                                      </div>
                                    } @empty {
                                      <p class="dica">
                                        Nenhum item listado. Adicione abaixo o que dropou, ou confirme só a
                                        execução.
                                      </p>
                                    }
                                    <app-farm-busca-item
                                      [idCampo]="'extra-' + i.id"
                                      rotulo="Outro item dropado"
                                      dica="Dropou outro item? Nome ou ID"
                                      (escolher)="adicionarExtra(i, $event)"
                                    />
                                    <label class="marcar">
                                      <input
                                        type="checkbox"
                                        [checked]="lembrar()"
                                        (change)="lembrar.set($any($event.target).checked)"
                                      />
                                      Lembrar itens novos nesta instância
                                    </label>
                                    <div class="acoes">
                                      <button
                                        type="button"
                                        class="botao ok"
                                        [disabled]="enviando()"
                                        (click)="confirmar(pid, i, s)"
                                      >
                                        {{ s.feita ? "Salvar drops" : "Confirmar check-in" }}
                                      </button>
                                      <button type="button" class="botao fantasma" (click)="fechar()">
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                } @else if (s.feita && s.checkin) {
                                  @let c = s.checkin;
                                  <div class="acoes">
                                    <button type="button" class="botao pequeno" (click)="abrir(pid, i, c)">
                                      Editar drops
                                    </button>
                                    <button
                                      type="button"
                                      class="botao pequeno perigo"
                                      [class.armado]="armado() === 'desfazer:' + c.id"
                                      (click)="desfazer(c)"
                                    >
                                      {{
                                        armado() === "desfazer:" + c.id
                                          ? "Confirmar desfazer"
                                          : "Desfazer check-in"
                                      }}
                                    </button>
                                  </div>
                                } @else {
                                  <div class="acoes">
                                    <button
                                      type="button"
                                      class="botao primario"
                                      (click)="abrir(pid, i, null)"
                                    >
                                      Check-in
                                    </button>
                                  </div>
                                }
                              </article>
                            }
                          </div>
                        </section>
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } @else if (!erro()) {
        <p class="dica">Carregando seu farm…</p>
      }
    </div>
  `,
})
export class FarmComponent implements OnInit, OnDestroy {
  readonly farm = inject(FarmStore);
  private readonly acao = inject(Acao);

  readonly abas: { id: Aba; rotulo: string }[] = [
    { id: "hoje", rotulo: "Hoje" },
    { id: "totais", rotulo: "Totais" },
    { id: "cadastro", rotulo: "Cadastro" },
    { id: "importar", rotulo: "Importar" },
  ];
  readonly recargas = RECARGAS;
  readonly rotuloRecarga = ROTULO_RECARGA;

  readonly aba = signal<Aba>("hoje");
  readonly selecionado = signal<string>("todos");
  readonly erro = signal<string | null>(null);
  readonly aberto = signal<string | null>(null);
  readonly editando = signal<CheckinFarm | null>(null);
  readonly rascunho = signal<Record<string, string>>({});
  readonly extras = signal<string[]>([]);
  readonly lembrar = signal(true);
  readonly armado = signal<string | null>(null);
  readonly enviando = signal(false);
  private relogioId: ReturnType<typeof setInterval> | undefined;

  readonly relogio = computed(() => {
    const agora = this.farm.agora();
    const hoje = diaDoJogo(agora);
    return `${DIAS_SEMANA[dataDoDia(hoje).diaSemana]} ${diaMes(hoje)} · ${horaDoServidor(agora)}`;
  });
  readonly resetEm = computed(() => {
    const falta = inicioDoDia(this.farm.hoje() + 1) - this.farm.agora();
    const h = Math.floor(falta / 3_600_000);
    const m = Math.floor((falta % 3_600_000) / 60_000);
    return `${h}h${String(m).padStart(2, "0")}`;
  });
  readonly checkinsHoje = computed(() =>
    (this.farm.estado()?.checkinsRecentes ?? []).filter(
      (c) => diaDoJogo(Date.parse(c.feitoEm)) === this.farm.hoje(),
    ),
  );
  readonly valorHoje = computed(() =>
    this.checkinsHoje().reduce((s, c) => s + this.farm.valorDe(c.drops), 0),
  );

  async ngOnInit(): Promise<void> {
    try {
      await this.farm.carregar();
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
    }
    // A cada 30 s: o relógio anda e, na virada das 04:00, os cards voltam a ficar disponíveis.
    this.relogioId = setInterval(() => {
      const antes = this.farm.hoje();
      this.farm.agora.set(Date.now());
      if (this.farm.hoje() !== antes && this.aberto() === null)
        void this.farm.carregar().catch(() => undefined);
    }, 30_000);
  }

  ngOnDestroy(): void {
    clearInterval(this.relogioId);
  }

  // ---------- leitura para o template ----------

  curto(v: number): string {
    return formatarZeny(v);
  }
  completo(v: number): string {
    return formatarZenyCompleto(v);
  }
  dia(iso: string): string {
    return rotuloDoDia(diaDoJogo(Date.parse(iso)), this.farm.hoje());
  }
  rotuloDia(d: number): string {
    return rotuloDoDia(d, this.farm.hoje());
  }
  hora(iso: string): string {
    return horaDoServidor(Date.parse(iso));
  }
  libera(s: SituacaoCard): string {
    return s.feita ? rotuloDoDia(s.liberaNoDia, this.farm.hoje()) : "";
  }
  chave(personagemId: string, i: InstanciaFarm): string {
    return `${personagemId}|${i.id}`;
  }

  progresso(personagemId: string): { feitas: number; total: number } | null {
    const lista = this.farm.instanciasDe(personagemId);
    if (lista.length === 0) return null;
    return {
      feitas: lista.filter((i) => this.farm.situacaoDe(personagemId, i).feita).length,
      total: lista.length,
    };
  }

  valorHojeDe(personagemId: string): number {
    return this.checkinsHoje()
      .filter((c) => c.personagemId === personagemId)
      .reduce((s, c) => s + this.farm.valorDe(c.drops), 0);
  }

  instanciasPorRecarga(personagemId: string, recarga: Recarga): InstanciaFarm[] {
    return this.farm.instanciasDe(personagemId).filter((i) => i.recarga === recarga);
  }

  dicaReset(recarga: Recarga): string {
    if (recarga === "DIARIA") return "Libera todo dia às 04:00";
    if (recarga === "TRES_DIAS") return "Libera 3 dias depois do check-in, às 04:00";
    return `Reset ${rotuloDoDia(cicloDoCalendario(recarga, this.farm.hoje()).proximo, this.farm.hoje())} às 04:00`;
  }

  nomesDrops(i: InstanciaFarm): string {
    const nomes = i.drops.map((id) => this.farm.itemPorId().get(id)?.nome).filter((n) => n !== undefined);
    return nomes.length > 0 ? nomes.join(" · ") : "Sem itens cadastrados";
  }

  textoDrops(c: CheckinFarm): string {
    return c.drops.length > 0
      ? c.drops.map((d) => `${d.nome} ×${d.quantidade}`).join(" · ")
      : "Sem drops registrados";
  }

  // ---------- check-in ----------

  selecionar(id: string): void {
    this.selecionado.set(id);
    this.fechar();
  }

  abrir(personagemId: string, i: InstanciaFarm, checkin: CheckinFarm | null): void {
    this.aberto.set(this.chave(personagemId, i));
    this.editando.set(checkin);
    this.extras.set([]);
    const r: Record<string, string> = {};
    for (const d of checkin?.drops ?? []) r[d.farmItemId] = String(d.quantidade);
    this.rascunho.set(r);
  }

  fechar(): void {
    this.aberto.set(null);
    this.editando.set(null);
    this.rascunho.set({});
    this.extras.set([]);
  }

  itensDoPainel(i: InstanciaFarm, _s: SituacaoCard): string[] {
    const ids = [...i.drops];
    for (const d of this.editando()?.drops ?? []) if (!ids.includes(d.farmItemId)) ids.push(d.farmItemId);
    for (const id of this.extras()) if (!ids.includes(id)) ids.push(id);
    return ids;
  }

  quantidade(itemId: string): string {
    return this.rascunho()[itemId] ?? "";
  }

  definir(itemId: string, valor: string): void {
    this.rascunho.update((r) => ({ ...r, [itemId]: valor }));
  }

  passo(itemId: string, delta: number): void {
    const atual = Number.parseInt(this.quantidade(itemId), 10) || 0;
    this.definir(itemId, String(Math.max(0, atual + delta)));
  }

  async adicionarExtra(i: InstanciaFarm, item: ItemEscolhido): Promise<void> {
    try {
      const criado = this.lembrar()
        ? await this.farm.adicionarDrop(i.id, { nome: item.nome, idJogo: item.idJogo })
        : await this.farm.criarItem({ nome: item.nome, idJogo: item.idJogo });
      if (!this.lembrar()) this.extras.update((x) => [...x, criado.id]);
      if (!this.quantidade(criado.id)) this.definir(criado.id, "1");
    } catch (e) {
      this.acao.avisar(mensagemDeErro(e));
    }
  }

  async confirmar(personagemId: string, i: InstanciaFarm, s: SituacaoCard): Promise<void> {
    const drops = this.itensDoPainel(i, s)
      .map((farmItemId) => ({
        farmItemId,
        quantidade: Math.min(1_000_000, Math.max(0, Number.parseInt(this.quantidade(farmItemId), 10) || 0)),
      }))
      .filter((d) => d.quantidade > 0);
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

  async desfazer(c: CheckinFarm): Promise<void> {
    const chave = `desfazer:${c.id}`;
    if (this.armado() !== chave) {
      this.armado.set(chave);
      return;
    }
    this.armado.set(null);
    await this.acao.executar(() => this.farm.desfazer(c.id), "Check-in desfeito.");
  }
}
