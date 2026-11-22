import { DatePipe, NgTemplateOutlet } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";
import { agruparClasses } from "../shared/dominio/grupos-classes";
import { mensagemDeErro } from "../core/modelos";

type Tipo = "OBRIGATORIA" | "SECUNDARIA" | "LIVRE";
type Vaga = { tipo: Tipo; classeId: string | null; importancia: number | null; personagemId: string | null };
type Instancia = { id: string; nome: string };
type Personagem = {
  id: string;
  nome: string;
  classeId: string | null;
  jogadorId: string;
  jogador: { apelido: string };
};
type Opcoes = {
  instancias: Instancia[];
  classes: { id: string; nomeOficial: string; grupo: string }[];
  personagens: Personagem[];
};
type Grupo = {
  id: string;
  instancia: Instancia;
  agendadoEm: string;
  fechadoEm: string | null;
  vagas: Vaga[];
};

const vagasIniciais = (): Vaga[] =>
  Array.from({ length: 12 }, () => ({
    tipo: "LIVRE",
    classeId: null,
    importancia: null,
    personagemId: null,
  }));

@Component({
  selector: "app-gestao-grupos",
  imports: [DatePipe, FormsModule, NgTemplateOutlet],
  template: `
    <section class="pagina">
      <header class="topo">
        <h1>Grupos de instância</h1>
        <button class="botao-acao" type="button" (click)="novo()" [disabled]="salvando()">Novo grupo</button>
      </header>
      @if (erro(); as mensagem) {
        <p role="alert">{{ mensagem }}</p>
      }
      @if (carregando()) {
        <p role="status">Carregando grupos…</p>
      } @else {
        <section aria-label="Grupos agendados" class="grupos">
          @for (grupo of grupos(); track grupo.id) {
            <button
              type="button"
              class="grupo"
              [attr.aria-pressed]="selecionado()?.id === grupo.id"
              (click)="abrir(grupo)"
              [disabled]="salvando()"
            >
              <strong>{{ grupo.instancia.nome }}</strong>
              <span
                >{{ grupo.agendadoEm | date: "dd/MM HH:mm" : "-0300" }} ·
                {{ grupo.fechadoEm ? "Fechado" : "Aberto" }}</span
              >
            </button>
          }
        </section>
        <form (ngSubmit)="salvar(false)" class="form-grupo">
          <div class="topo">
            <h2>{{ selecionado()?.instancia?.nome ?? "Novo grupo" }}</h2>
            <span aria-live="polite">{{ preenchidas() }}/12 vagas preenchidas</span>
          </div>
          @if (!selecionado()) {
            <ol class="passos" aria-label="Etapas da cria&ccedil;&atilde;o">
              @for (titulo of etapas; track titulo; let i = $index) {
                <li [attr.aria-current]="etapa() === i ? 'step' : null">{{ i + 1 }}. {{ titulo }}</li>
              }
            </ol>
            <h3>{{ etapas[etapa()] }}</h3>
            @switch (etapa()) {
              @case (0) {
                <label
                  >Inst&acirc;ncia
                  <select [(ngModel)]="instanciaId" name="instancia" required>
                    <option value="">Selecione uma inst&acirc;ncia</option>
                    @for (instancia of opcoes().instancias; track instancia.id) {
                      <option [value]="instancia.id">{{ instancia.nome }}</option>
                    }
                  </select>
                </label>
              }
              @case (1) {
                <ng-container
                  [ngTemplateOutlet]="reservas"
                  [ngTemplateOutletContext]="{ $implicit: 'OBRIGATORIA' }"
                />
              }
              @case (2) {
                @if (vagasDoTipo("OBRIGATORIA").length) {
                  <section
                    class="reservas-escolhidas"
                    aria-label="Classes obrigat&oacute;rias j&aacute; escolhidas"
                  >
                    <strong>Obrigat&oacute;rias escolhidas</strong>
                    <ul>
                      @for (vaga of vagasDoTipo("OBRIGATORIA"); track vaga) {
                        <li>
                          {{ nomeClasse(vaga.classeId ?? "") }} <span>{{ vaga.importancia }}/5</span>
                        </li>
                      }
                    </ul>
                  </section>
                }
                <ng-container
                  [ngTemplateOutlet]="reservas"
                  [ngTemplateOutletContext]="{ $implicit: 'SECUNDARIA' }"
                />
              }
              @case (3) {
                <label
                  >Data e hora (S&atilde;o Paulo)
                  <input type="datetime-local" [(ngModel)]="horario" name="horario" required />
                </label>
              }
              @case (4) {
                <dl class="resumo">
                  <dt>Inst&acirc;ncia</dt>
                  <dd>{{ nomeInstancia() }}</dd>
                  <dt>Partida</dt>
                  <dd>{{ dataPartida() | date: "dd/MM/yyyy HH:mm" : "-0300" }} (S&atilde;o Paulo)</dd>
                  <dt>Obrigat&oacute;rias</dt>
                  <dd>{{ resumoVagas("OBRIGATORIA") }}</dd>
                  <dt>Secund&aacute;rias</dt>
                  <dd>{{ resumoVagas("SECUNDARIA") }}</dd>
                  <dt>Livres</dt>
                  <dd>{{ vagasDoTipo("LIVRE").length }} de 12 vagas</dd>
                </dl>
              }
            }
            <footer class="acoes">
              @if (etapa() > 0) {
                <button type="button" class="grupo" (click)="voltar()" [disabled]="salvando()">Voltar</button>
              }
              @if (etapa() < 4) {
                <button class="botao-acao" type="button" (click)="avancar()" [disabled]="!etapaValida()">
                  Continuar
                </button>
              } @else {
                <button class="botao-acao" type="submit" [disabled]="salvando() || !podeSalvar()">
                  Confirmar e criar grupo
                </button>
              }
            </footer>
          } @else {
            <p>
              {{ selecionado()?.agendadoEm | date: "dd/MM/yyyy HH:mm" : "-0300" }} ? Hor&aacute;rio de
              S&atilde;o Paulo
            </p>
            <div class="vagas">
              @for (vaga of vagas; track $index; let i = $index) {
                <fieldset
                  class="vaga"
                  [class.obrigatoria]="vaga.tipo === 'OBRIGATORIA'"
                  [disabled]="bloqueado() || salvando()"
                >
                  <legend>Vaga {{ i + 1 }}</legend>
                  <p class="requisito">
                    {{ rotulo[vaga.tipo] }}
                    @if (vaga.classeId) {
                      <span>
                        ? {{ nomeClasse(vaga.classeId) }} ? Import&acirc;ncia {{ vaga.importancia }}</span
                      >
                    }
                  </p>
                  <label
                    >Personagem
                    <select
                      [name]="'personagem-' + i"
                      [(ngModel)]="vaga.personagemId"
                      [disabled]="vaga.tipo !== 'LIVRE' && !vaga.classeId"
                    >
                      <option [ngValue]="null">Vaga em aberto</option>
                      @for (personagem of candidatos(vaga); track personagem.id) {
                        <option [value]="personagem.id">
                          {{ personagem.nome }} · {{ personagem.jogador.apelido }}
                        </option>
                      }
                      @if (vaga.personagemId && !personagemDisponivel(vaga.personagemId)) {
                        <option [value]="vaga.personagemId">Personagem indisponível</option>
                      }
                    </select>
                  </label>
                </fieldset>
              }
            </div>
            @if (!bloqueado()) {
              <footer class="topo">
                @if (selecionado() && faltamObrigatorias()) {
                  <p>Preencha {{ faltamObrigatorias() }} vaga(s) obrigatória(s) para fechar o grupo.</p>
                }
                <div class="acoes">
                  <button class="botao-acao" type="submit" [disabled]="salvando() || !podeSalvar()">
                    {{ selecionado() ? "Salvar escala" : "Criar grupo" }}
                  </button>
                  @if (selecionado()) {
                    <button
                      class="botao-acao"
                      type="button"
                      (click)="salvar(true)"
                      [disabled]="salvando() || faltamObrigatorias() > 0"
                    >
                      Fechar grupo
                    </button>
                  }
                </div>
              </footer>
            }
          }
        </form>
      }
      <ng-template #reservas let-tipo>
        <p>
          {{
            tipo === "OBRIGATORIA"
              ? "Essas vagas precisam estar preenchidas para fechar o grupo."
              : "Essas vagas reservam uma classe e podem permanecer abertas."
          }}
        </p>
        <p>{{ vagasDoTipo("LIVRE").length }} de 12 vagas ainda livres</p>
        @for (vaga of vagasDoTipo(tipo); track vaga; let i = $index) {
          <fieldset class="vaga reserva">
            <legend>Reserva {{ i + 1 }}</legend>
            <label
              >Classe
              <select [name]="'reserva-classe-' + i" [(ngModel)]="vaga.classeId">
                <option [ngValue]="null">Selecione</option>
                @for (grupo of gruposDeClasses(); track grupo.nome) {
                  <optgroup [label]="grupo.nome">
                    @for (classe of grupo.classes; track classe.id) {
                      <option [value]="classe.id">{{ classe.nomeOficial }}</option>
                    }
                  </optgroup>
                }
              </select>
            </label>
            <div class="importancia">
              <span>Import&acirc;ncia</span>
              <div class="estrelas" role="radiogroup" aria-label="Import&acirc;ncia">
                @for (valor of [1, 2, 3, 4, 5]; track valor) {
                  <label class="estrela" [class.marcada]="valor <= (vaga.importancia ?? 0)">
                    <input
                      type="radio"
                      [name]="'importancia-' + tipo + '-' + i"
                      [value]="valor"
                      [(ngModel)]="vaga.importancia"
                      [attr.aria-label]="valor + ' de 5'"
                    />
                    <span aria-hidden="true">{{ valor <= (vaga.importancia ?? 0) ? "★" : "☆" }}</span>
                  </label>
                }
              </div>
            </div>
            <button
              type="button"
              class="remover-reserva"
              (click)="removerReserva(vaga)"
              [attr.aria-label]="'Remover reserva ' + (i + 1)"
              title="Remover vaga"
            >
              <span aria-hidden="true">&#215;</span>
            </button>
          </fieldset>
        }
        <button
          type="button"
          class="grupo"
          [disabled]="!vagasDoTipo('LIVRE').length"
          (click)="adicionarReserva(tipo)"
        >
          Adicionar vaga
        </button>
      </ng-template>
    </section>
  `,
  styles: `
    .topo,
    .acoes,
    .grupos {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .passos {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .passos li {
      padding: 5px 8px;
      border-radius: 6px;
      color: var(--texto-suave);
      font-size: 13px;
    }
    .passos li[aria-current="step"] {
      color: var(--acento-forte);
      background: var(--acento-fundo);
    }
    .reserva {
      grid-template-columns: minmax(0, 1fr) auto auto;
      align-items: end;
    }
    .importancia {
      display: grid;
      gap: 8px;
    }
    .estrelas {
      display: flex;
      gap: 1px;
    }
    .estrela {
      position: relative;
      color: var(--texto-suave);
      cursor: pointer;
    }
    .estrela input {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      margin: 0;
      cursor: pointer;
    }
    .estrela span {
      padding: 1px 2px;
      font-size: 24px;
      line-height: 1.25;
    }
    .estrela.marcada,
    .estrela:hover {
      color: #e8c26a;
    }
    .estrela:focus-within {
      outline: 2px solid var(--acento);
      border-radius: 4px;
    }
    .remover-reserva {
      width: 32px;
      height: 32px;
      padding: 0;
      border: 1px solid var(--borda-forte);
      border-radius: 6px;
      color: var(--texto-suave);
      background: var(--cartao);
      font-size: 21px;
      line-height: 1;
    }
    .remover-reserva:is(:hover, :focus-visible) {
      color: var(--texto);
      border-color: var(--texto-suave);
    }
    .reservas-escolhidas {
      padding: 10px;
      background: var(--cartao);
      border: 1px solid var(--borda);
      border-radius: 8px;
      color: var(--texto-suave);
    }
    .reservas-escolhidas ul {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      list-style: none;
      margin: 6px 0 0;
      padding: 0;
    }
    .reservas-escolhidas li {
      padding: 4px 8px;
      border-radius: 5px;
      background: var(--elevado);
      overflow-wrap: anywhere;
    }
    .reservas-escolhidas li span {
      margin-inline-start: 4px;
      font-size: 0.85em;
    }
    @media (max-width: 580px) {
      .reserva {
        grid-template-columns: minmax(0, 1fr) auto;
      }
      .reserva > label {
        grid-column: 1 / -1;
      }
    }
    .resumo {
      display: grid;
      grid-template-columns: minmax(0, 144px) minmax(0, 1fr);
      gap: 10px;
    }
    .resumo dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    .topo {
      justify-content: space-between;
    }
    h1,
    h2,
    .topo p,
    .requisito {
      margin: 0;
    }
    .grupos {
      margin: 12px 0;
    }
    .grupo {
      display: grid;
      gap: 4px;
      text-align: left;
    }
    .grupo,
    .form-grupo,
    .vaga {
      padding: 12px;
      border: 1px solid var(--borda-forte);
      border-radius: 10px;
      background: var(--superficie);
      color: var(--texto);
    }
    .grupo[aria-pressed="true"],
    .vaga.obrigatoria {
      border-color: var(--acento);
    }
    .grupo span,
    .requisito {
      color: var(--texto-suave);
    }
    .form-grupo,
    .vaga,
    label {
      display: grid;
      gap: 8px;
    }
    .vagas {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr));
    }
    .vagas {
      margin-block: 8px;
    }
    .vaga {
      min-width: 0;
      align-content: start;
    }
    .vaga legend {
      padding-inline: 4px;
    }
    input,
    select {
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      padding: 8px;
      color: var(--texto);
      background: var(--fundo);
      border: 1px solid var(--borda-forte);
      border-radius: 6px;
      font: inherit;
    }
    button {
      cursor: pointer;
    }
    button:disabled {
      cursor: default;
    }
  `,
})
export class GestaoGruposComponent {
  private readonly http = inject(HttpClient);
  private readonly url = "/api/gestao/grupos";
  readonly grupos = signal<Grupo[]>([]);
  readonly opcoes = signal<Opcoes>({ instancias: [], classes: [], personagens: [] });
  readonly gruposDeClasses = computed(() => agruparClasses(this.opcoes().classes));
  readonly selecionado = signal<Grupo | null>(null);
  readonly carregando = signal(true);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly etapas = ["Instância", "Classes obrigatórias", "Classes secundárias", "Data e hora", "Revisão"];
  readonly etapa = signal(0);
  instanciaId = "";
  horario = "";
  vagas = vagasIniciais();

  constructor() {
    void this.carregar();
  }

  private async carregar(): Promise<void> {
    try {
      const [grupos, opcoes] = await Promise.all([
        firstValueFrom(this.http.get<Grupo[]>(this.url)),
        firstValueFrom(this.http.get<Opcoes>(this.url + "/opcoes")),
      ]);
      this.grupos.set(grupos);
      this.opcoes.set(opcoes);
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
    } finally {
      this.carregando.set(false);
    }
  }

  novo(): void {
    this.selecionado.set(null);
    this.etapa.set(0);
    this.erro.set(null);
    this.instanciaId = "";
    this.horario = "";
    this.vagas = vagasIniciais();
  }

  abrir(grupo: Grupo): void {
    this.selecionado.set(grupo);
    this.erro.set(null);
    this.vagas = grupo.vagas.map((vaga) => ({ ...vaga }));
  }

  readonly rotulo: Record<Tipo, string> = {
    OBRIGATORIA: "Obrigatória",
    SECUNDARIA: "Secundária",
    LIVRE: "Livre",
  };

  vagasDoTipo(tipo: Tipo): Vaga[] {
    return this.vagas.filter((vaga) => vaga.tipo === tipo);
  }

  adicionarReserva(tipo: "OBRIGATORIA" | "SECUNDARIA"): void {
    const vaga = this.vagas.find((item) => item.tipo === "LIVRE");
    if (vaga) vaga.tipo = tipo;
  }

  removerReserva(vaga: Vaga): void {
    Object.assign(vaga, { tipo: "LIVRE", classeId: null, importancia: null, personagemId: null });
  }

  dataPartida(): string | null {
    return this.horario ? this.horario + ":00-03:00" : null;
  }

  nomeInstancia(): string {
    return this.opcoes().instancias.find((item) => item.id === this.instanciaId)?.nome ?? "";
  }

  resumoVagas(tipo: Tipo): string {
    return (
      this.vagasDoTipo(tipo)
        .map(
          (vaga) =>
            `${vaga.classeId ? this.nomeClasse(vaga.classeId) : ""} (importância ${vaga.importancia})`,
        )
        .join(", ") || "Nenhuma"
    );
  }

  etapaValida(): boolean {
    const etapa = this.etapa();
    if (etapa === 0) return !!this.instanciaId;
    if (etapa === 1 || etapa === 2) {
      return this.vagasDoTipo(etapa === 1 ? "OBRIGATORIA" : "SECUNDARIA").every(
        (vaga) => !!vaga.classeId && vaga.importancia !== null,
      );
    }
    return Date.parse(this.dataPartida() ?? "") > Date.now();
  }

  voltar(): void {
    this.etapa.update((indice) => indice - 1);
  }

  avancar(): void {
    if (this.etapaValida()) this.etapa.update((indice) => indice + 1);
  }

  nomeClasse(id: string): string {
    return this.opcoes().classes.find((classe) => classe.id === id)?.nomeOficial ?? "Classe indisponível";
  }

  personagemDisponivel(id: string): boolean {
    return this.opcoes().personagens.some((p) => p.id === id);
  }

  candidatos(vaga: Vaga): Personagem[] {
    const ocupados = new Set(this.vagas.filter((item) => item !== vaga).map((item) => item.personagemId));
    const jogadores = new Set(
      this.opcoes()
        .personagens.filter((p) => ocupados.has(p.id))
        .map((p) => p.jogadorId),
    );
    return this.opcoes().personagens.filter(
      (p) =>
        p.id === vaga.personagemId ||
        (!jogadores.has(p.jogadorId) && (vaga.tipo === "LIVRE" || p.classeId === vaga.classeId)),
    );
  }

  preenchidas(): number {
    return this.vagas.filter((vaga) => vaga.personagemId).length;
  }

  faltamObrigatorias(): number {
    return this.vagas.filter((vaga) => vaga.tipo === "OBRIGATORIA" && !vaga.personagemId).length;
  }

  bloqueado(): boolean {
    return !!this.selecionado()?.fechadoEm;
  }

  podeSalvar(): boolean {
    return (
      !!this.selecionado() ||
      (!!this.instanciaId &&
        this.etapa() === 4 &&
        this.etapaValida() &&
        this.vagas.every((vaga) => vaga.tipo === "LIVRE" || (!!vaga.classeId && vaga.importancia !== null)))
    );
  }

  async salvar(fechar: boolean): Promise<void> {
    if (this.salvando() || this.bloqueado() || !this.podeSalvar() || (fechar && this.faltamObrigatorias()))
      return;
    const grupo = this.selecionado();
    this.salvando.set(true);
    this.erro.set(null);
    try {
      const resposta = grupo
        ? await firstValueFrom(
            this.http.patch<Omit<Grupo, "instancia">>(this.url + "/" + grupo.id, {
              vagas: this.vagas,
              fechar,
              ocupacaoAnterior: grupo.vagas.map((vaga) => vaga.personagemId),
            }),
          )
        : await firstValueFrom(
            this.http.post<Omit<Grupo, "instancia">>(this.url, {
              instanciaId: this.instanciaId,
              agendadoEm: this.dataPartida(),
              vagas: this.vagas,
            }),
          );
      const instancia =
        grupo?.instancia ?? this.opcoes().instancias.find((item) => item.id === this.instanciaId);
      if (instancia) {
        const atualizado = { ...resposta, instancia };
        this.grupos.update((lista) => [atualizado, ...lista.filter((item) => item.id !== atualizado.id)]);
        this.abrir(atualizado);
      }
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
    } finally {
      this.salvando.set(false);
    }
  }
}
