import { DatePipe, NgTemplateOutlet } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, computed, inject, type OnInit, signal, viewChild, type TemplateRef } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatDialog, MatDialogModule, type MatDialogRef } from "@angular/material/dialog";
import { ActivatedRoute } from "@angular/router";
import { ImagemItemComponent } from "../core/imagem-item.component";
import { agruparClasses } from "../core/grupos-classes";
import { iconeDaClasse } from "../core/icones-classes";
import { firstValueFrom } from "rxjs";
import { EquipamentoSelectComponent, EquipamentosLatam } from "../core/equipamento-select.component";
import { AuthService } from "../core/auth.service";
import {
  type EquipamentoFicha,
  mensagemDeErro,
  type PersonagemResumo,
  type SituacaoVinculo,
  type Solicitacao,
} from "../core/modelos";

interface ClasseFicha {
  id: string;
  nomeOficial: string;
  apelidoGrupo: string | null;
  grupo: string;
}
interface Ficha {
  nome: string;
  classeId: string;
  nivelBase: number | null;
  build: string;
  equipamentos: Partial<Record<string, EquipamentoFicha>>;
}
/** D55: resposta de POST /api/vinculo/build-simulador. */
export interface BuildImportada {
  classeId: string | null;
  classeNome: string | null;
  nivelBase: number | null;
  equipamentos: Partial<Record<string, { id: number; nome: string | null }>>;
}
/** Frase que confirma o que a importação preencheu e o que ficou para o membro escolher. */
export function resumoDaImportacao(build: BuildImportada, equipamentos: number): string {
  const partes = [
    ...(build.classeId && build.classeNome ? [build.classeNome] : []),
    ...(build.nivelBase !== null ? [`nível ${build.nivelBase}`] : []),
    equipamentos === 1 ? "1 equipamento" : `${equipamentos} equipamentos`,
  ];
  const semClasse = build.classeId
    ? ""
    : build.classeNome
      ? ` A classe ${build.classeNome} não está cadastrada no grupo: escolha a classe.`
      : " Escolha a classe.";
  return `Build importada: ${partes.join(", ")}.${semClasse} Revise e salve.`;
}

const novaFicha = (): Ficha => ({ nome: "", classeId: "", nivelBase: null, build: "", equipamentos: {} });

const SLOTS = [
  ["topo", "Topo"],
  ["meio", "Meio"],
  ["baixo", "Baixo"],
  ["arma", "Arma"],
  ["armadura", "Armadura"],
  ["escudo", "Escudo"],
  ["capa", "Capa"],
  ["calcado", "Calçado"],
  ["acessorio1", "Acessório 1"],
  ["acessorio2", "Acessório 2"],
] as const;

/** T-19b: o membro reivindica o jogador e os personagens; o vínculo só vale após aprovação (D12). */
@Component({
  selector: "app-vinculo",
  imports: [
    FormsModule,
    DatePipe,
    NgTemplateOutlet,
    MatCardModule,
    MatDialogModule,
    MatButtonModule,
    EquipamentoSelectComponent,
    ImagemItemComponent,
  ],
  template: `
    <div class="pagina">
      <header class="vinculo-topo">
        <h1>{{ filaAprovacoes ? "Solicitações de vínculo" : "Meus personagens" }}</h1>
      </header>
      @if (filaAprovacoes && !carregando()) {
        <section class="fila" aria-label="Solicitações pendentes">
          @for (pedido of pendentes(); track pedido.id) {
            <mat-card>
              <mat-card-content>
                <strong>{{ pedido.jogador?.apelido ?? pedido.apelidoProposto }}</strong>
                <p>Discord: {{ pedido.usuario.globalName ?? pedido.usuario.discordUsername }}</p>
                @if (pedido.fichas?.length) {
                  @for (ficha of pedido.fichas; track ficha.nome) {
                    <p>{{ ficha.nome }} · {{ nomeClasse(ficha.classeId) }} · Nível {{ ficha.nivelBase }}</p>
                  }
                } @else if (pedido.personagensNovos.length) {
                  <p>{{ pedido.personagensNovos.join(", ") }}</p>
                }
                <div class="linha-acoes">
                  @if (pedido.usuario.id === auth.usuario()?.id) {
                    <span>Outro administrador precisa aprovar este v&iacute;nculo.</span>
                  } @else {
                    <button
                      mat-flat-button
                      type="button"
                      [disabled]="enviando()"
                      (click)="analisar(pedido.id)"
                    >
                      Aprovar vínculo
                    </button>
                  }
                  <button mat-button type="button" (click)="rejeitando.set(pedido.id)">Rejeitar</button>
                </div>
                @if (rejeitando() === pedido.id) {
                  <label class="campo"
                    >Motivo da rejeição
                    <input [(ngModel)]="motivo" maxlength="500" />
                  </label>
                  <button
                    mat-button
                    type="button"
                    [disabled]="motivo.trim().length < 3 || enviando()"
                    (click)="analisar(pedido.id, motivo.trim())"
                  >
                    Confirmar rejeição
                  </button>
                }
              </mat-card-content>
            </mat-card>
          } @empty {
            <p>Nenhuma solicita&#231;&#227;o pendente.</p>
          }
        </section>
      }
      @if (erro(); as mensagem) {
        <p class="erro" role="alert">{{ mensagem }}</p>
      }
      @if (carregando()) {
        <p>Carregando…</p>
      } @else if (!filaAprovacoes) {
        @if (situacao(); as s) {
          @if (s.jogador; as j) {
            <section class="personagens">
              <div class="grade-personagens">
                @for (char of j.personagens; track char.id) {
                  <ng-container
                    [ngTemplateOutlet]="cartaoPersonagem"
                    [ngTemplateOutletContext]="{
                      nome: char.nome,
                      classe: char.classe?.nomeOficial ?? '',
                      nivel: char.nivelBase,
                      abrir: abrirFichaVinculada.bind(this, char),
                    }"
                  />
                }
                <button class="adicionar-personagem" type="button" (click)="abrirFichaVinculada()">
                  <span aria-hidden="true">+</span>
                  Adicionar personagem
                </button>
              </div>
            </section>
          } @else if (s.solicitacao?.status === "PENDENTE") {
            <mat-card data-testid="pendente">
              <mat-card-header><mat-card-title>Solicitação em análise</mat-card-title></mat-card-header>
              <mat-card-content>
                <p>
                  Enviada em {{ s.solicitacao!.criadaEm | date: "dd/MM/yyyy HH:mm" }}. Um administrador vai
                  aprovar ou rejeitar. Enquanto isso, você ainda não vê saldo.
                </p>
                <div class="grade-personagens">
                  @for (nome of s.solicitacao!.personagensNovos; track nome) {
                    @let ficha = fichaPendente(s.solicitacao!, nome);
                    <ng-container
                      [ngTemplateOutlet]="cartaoPersonagem"
                      [ngTemplateOutletContext]="{
                        nome: nome,
                        classe: ficha.classeId ? nomeClasse(ficha.classeId) : '',
                        nivel: ficha.nivelBase,
                        abrir: abrirFichaPendente.bind(this, ficha),
                      }"
                    />
                  }
                  <button
                    class="adicionar-personagem"
                    type="button"
                    (click)="abrirPrimeiraFicha()"
                    [disabled]="s.solicitacao!.personagensNovos.length >= 10"
                  >
                    <span aria-hidden="true">+</span>
                    Adicionar personagem
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          } @else {
            @if (s.solicitacao?.status === "REJEITADA") {
              <mat-card class="rejeitada" data-testid="rejeitada">
                <mat-card-content>
                  <p>
                    Sua solicitação anterior foi rejeitada. Motivo:
                    <strong>{{ s.solicitacao!.motivo }}</strong>
                  </p>
                  <p class="texto-secundario">Corrija os dados e envie de novo.</p>
                </mat-card-content>
              </mat-card>
            }
            <div class="grade-personagens">
              <button class="adicionar-personagem" type="button" (click)="abrirPrimeiraFicha()">
                <span aria-hidden="true">+</span>
                Adicionar personagem
              </button>
            </div>
          }
        }
      }
      <ng-template #avatar let-classe>
        <span class="avatar-personagem" [style.--tom]="tomDaClasse(classe)" aria-hidden="true">
          @if (iconeDaClasse(classe); as icone) {
            <img [src]="icone" alt="" width="36" height="36" />
          } @else {
            <span class="avatar-cabeca"></span>
            <span class="avatar-armadura"></span>
          }
        </span>
      </ng-template>

      <ng-template #cartaoPersonagem let-nome="nome" let-classe="classe" let-nivel="nivel" let-abrir="abrir">
        <button
          class="cartao-personagem"
          type="button"
          (click)="abrir()"
          [attr.aria-label]="'Editar ficha de ' + nome"
        >
          <ng-container [ngTemplateOutlet]="avatar" [ngTemplateOutletContext]="{ $implicit: classe }" />
          <strong>{{ nome }}</strong>
          <small
            >{{ classe || "Classe a informar" }}
            @if (nivel) {
              <span> &middot; N&iacute;vel {{ nivel }}</span>
            }
          </small>
        </button>
      </ng-template>

      <ng-template #modalFicha>
        @if (editando(); as ficha) {
          <h2 mat-dialog-title class="ficha-titulo">
            {{ editandoId || nomeAnterior ? "Editar personagem" : "Adicionar personagem" }}
          </h2>
          <form class="ficha-form" (ngSubmit)="salvarFicha(ficha)">
            <mat-dialog-content class="ficha-corpo">
              <div class="ficha-secoes" role="group" aria-label="Se&ccedil;&otilde;es da ficha">
                @for (secao of secoes; track secao.id) {
                  <button
                    type="button"
                    [attr.aria-pressed]="secaoFicha() === secao.id"
                    (click)="secaoFicha.set(secao.id)"
                  >
                    {{ secao.rotulo }}
                  </button>
                }
              </div>
              @switch (secaoFicha()) {
                @case ("dados") {
                  <div class="previa-personagem">
                    <ng-container
                      [ngTemplateOutlet]="avatar"
                      [ngTemplateOutletContext]="{ $implicit: nomeClasse(ficha.classeId) }"
                    />
                    <div>
                      <strong>{{ ficha.nome.trim() || "Novo personagem" }}</strong>
                      <small>{{ ficha.classeId ? nomeClasse(ficha.classeId) : "Selecione a classe" }}</small>
                      @if (ficha.nivelBase) {
                        <span class="nivel-personagem">Nv. {{ ficha.nivelBase }}</span>
                      }
                    </div>
                  </div>
                  <ng-container
                    [ngTemplateOutlet]="dadosFicha"
                    [ngTemplateOutletContext]="{ $implicit: ficha }"
                  />
                }
                @case ("equipamentos") {
                  <ng-container
                    [ngTemplateOutlet]="equipamentosFicha"
                    [ngTemplateOutletContext]="{ $implicit: ficha }"
                  />
                }
                @case ("notas") {
                  <label class="campo notas-ficha">
                    Observa&ccedil;&otilde;es da build
                    <textarea
                      [(ngModel)]="ficha.build"
                      [ngModelOptions]="{ standalone: true }"
                      maxlength="500"
                      rows="4"
                    ></textarea>
                  </label>
                }
              }
              @if (erroFicha(); as mensagem) {
                <p class="erro" role="alert">{{ mensagem }}</p>
              }
            </mat-dialog-content>
            <mat-dialog-actions align="end" class="ficha-acoes">
              <button mat-button type="button" [disabled]="enviando()" mat-dialog-close>Cancelar</button>
              <button
                mat-flat-button
                class="salvar-ficha"
                type="submit"
                [disabled]="enviando() || !fichaValida(ficha)"
              >
                Salvar personagem
              </button>
            </mat-dialog-actions>
          </form>
        }
      </ng-template>

      <ng-template #dadosFicha let-ficha>
        <div class="identidade">
          <label class="campo"
            >Nickname do personagem
            <input
              [(ngModel)]="ficha.nome"
              [ngModelOptions]="{ standalone: true }"
              maxlength="23"
              autocomplete="off"
              spellcheck="false"
            />
          </label>
          <label class="campo"
            >Classe
            <select [(ngModel)]="ficha.classeId" [ngModelOptions]="{ standalone: true }">
              <option value="">Selecione</option>
              @for (grupo of gruposDeClasses(); track grupo.nome) {
                <optgroup [label]="grupo.nome">
                  @for (classe of grupo.classes; track classe.id) {
                    <option [value]="classe.id">
                      {{ classe.nomeOficial }}{{ classe.apelidoGrupo ? " · " + classe.apelidoGrupo : "" }}
                    </option>
                  }
                </optgroup>
              }
            </select>
          </label>
          <label class="campo"
            >Nível base
            <input
              type="number"
              min="1"
              aria-describedby="limite-nivel-base"
              max="250"
              step="1"
              [(ngModel)]="ficha.nivelBase"
              [ngModelOptions]="{ standalone: true }"
            />
            <small id="limite-nivel-base">De 1 a 250</small>
          </label>
        </div>
        <div class="importar-build">
          <label class="campo"
            >Importar do simulador
            <input
              type="url"
              inputmode="url"
              placeholder="Link do simulador.latam-tools.com.br"
              aria-describedby="ajuda-importar-build"
              autocomplete="off"
              spellcheck="false"
              [(ngModel)]="linkSimulador"
              [ngModelOptions]="{ standalone: true }"
              (keydown.enter)="$event.preventDefault(); importarBuild(ficha)"
            />
          </label>
          <button
            mat-stroked-button
            type="button"
            [disabled]="importando() || !linkSimulador.trim()"
            (click)="importarBuild(ficha)"
          >
            {{ importando() ? "Lendo build…" : "Importar build" }}
          </button>
          <small id="ajuda-importar-build">
            Preenche a classe, o n&iacute;vel e os equipamentos com os da simula&ccedil;&atilde;o (link
            completo ou curto). Refino, cartas e encantamentos n&atilde;o entram.
          </small>
          @if (avisoImportacao(); as aviso) {
            <p class="aviso-importacao" role="status">{{ aviso }}</p>
          }
        </div>
      </ng-template>

      <ng-template #equipamentosFicha let-ficha>
        <section class="inventario" aria-label="Equipamentos da build">
          <div class="equipamentos" role="group" aria-label="Slots de equipamento">
            @for (slot of slots; track slot[0]) {
              <button
                type="button"
                class="slot-ficha"
                [attr.aria-pressed]="slotAtivo()[0] === slot[0]"
                (click)="slotAtivo.set(slot)"
                [attr.title]="nomeEquipado(ficha.equipamentos[slot[0]]) || null"
              >
                <span class="slot-arte" aria-hidden="true">
                  @if (itemEquipado(ficha.equipamentos[slot[0]]); as item) {
                    <app-imagem-item [idJogo]="item.id" [nome]="item.nome" [tamanho]="26" />
                  } @else {
                    <span class="slot-marca" [class.preenchido]="ficha.equipamentos[slot[0]]"></span>
                  }
                </span>
                <span>{{ slot[1] }}</span>
              </button>
            }
          </div>
          @for (slot of [slotAtivo()]; track slot[0]) {
            <div class="slot-editor">
              <app-equipamento-select
                [slot]="slot[0]"
                [rotulo]="slot[1]"
                [valor]="ficha.equipamentos[slot[0]]"
                (mudou)="alterarEquipamento(ficha, slot[0], $event)"
              />
            </div>
          }
        </section>
      </ng-template>
    </div>
  `,
  styleUrl: "./vinculo-ficha.scss",
  styles: `
    .vinculo-topo {
      background: linear-gradient(110deg, var(--acento-fundo), var(--superficie));
      padding: 20px;
      border: 1px solid var(--borda);
      border-radius: 14px;
      margin-bottom: 16px;
    }
    .vinculo-topo h1,
    .personagens h2 {
      margin: 0;
    }
    .vinculo-topo p {
      margin: 6px 0 0;
      color: var(--texto-suave);
    }
    .fila,
    .personagens {
      display: grid;
      gap: 12px;
      margin: 12px 0;
    }
    .campo {
      display: grid;
      gap: 4px;
      min-width: 0;
    }
    .campo :is(input, select, textarea) {
      box-sizing: border-box;
      width: 100%;
      color: var(--texto);
      background: var(--fundo);
      border: 1px solid var(--borda-forte);
      padding: 8px;
      border-radius: 8px;
      font: inherit;
    }
    summary {
      cursor: pointer;
      color: var(--acento-forte);
    }

    .grade-personagens {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 148px), 1fr));
      gap: 12px;
    }
    .cartao-personagem,
    .adicionar-personagem {
      display: grid;
      justify-items: center;
      align-content: center;
      gap: 6px;
      min-height: 132px;
      padding: 12px 8px;
      border: 1px solid var(--borda-forte);
      border-radius: 12px;
      background: var(--cartao);
      color: var(--texto);
      font: inherit;
      text-align: center;
      overflow-wrap: anywhere;
      cursor: pointer;
    }
    .cartao-personagem:is(:hover, :focus-visible),
    .adicionar-personagem:is(:hover, :focus-visible) {
      border-color: var(--acento);
      background: var(--elevado);
    }
    .adicionar-personagem {
      border-style: dashed;
      color: var(--acento-forte);
    }
    .adicionar-personagem span {
      font-size: 30px;
      line-height: 1;
    }
    .adicionar-personagem:disabled {
      opacity: 0.55;
      cursor: default;
    }
    .cartao-personagem small,
    .previa-personagem small {
      color: var(--texto-suave);
    }
    .avatar-personagem {
      display: grid;
      place-content: center;
      justify-items: center;
      flex: 0 0 auto;
      width: 54px;
      height: 54px;
      border: 1px solid hsl(var(--tom) 35% 38%);
      border-radius: 10px;
      background: radial-gradient(hsl(var(--tom) 40% 22%), var(--fundo));
    }
    .avatar-personagem img {
      object-fit: contain;
      image-rendering: pixelated;
    }
    .avatar-cabeca {
      width: 22px;
      height: 19px;
      background:
        linear-gradient(#222 0 0) 6px 11px / 2px 3px no-repeat,
        linear-gradient(#222 0 0) 14px 11px / 2px 3px no-repeat,
        linear-gradient(hsl(var(--tom) 42% 57%) 0 43%, #edc19d 43% 100%);
      clip-path: polygon(
        15% 0,
        85% 0,
        85% 13%,
        100% 13%,
        100% 70%,
        86% 70%,
        86% 100%,
        14% 100%,
        14% 70%,
        0 70%,
        0 13%,
        15% 13%
      );
    }
    .avatar-armadura {
      width: 30px;
      height: 16px;
      background: linear-gradient(
        90deg,
        hsl(var(--tom) 36% 32%) 25%,
        hsl(var(--tom) 60% 66%) 25% 75%,
        hsl(var(--tom) 36% 32%) 75%
      );
      clip-path: polygon(
        22% 0,
        78% 0,
        78% 20%,
        92% 20%,
        92% 42%,
        100% 42%,
        100% 100%,
        0 100%,
        0 42%,
        8% 42%,
        8% 20%,
        22% 20%
      );
    }
    .erro {
      color: var(--mat-sys-error, #b3261e);
    }
    .rejeitada {
      border-left: 4px solid var(--mat-sys-error, #b3261e);
    }
  `,
})
export class VinculoComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly dialog = inject(MatDialog);
  private readonly modalFicha = viewChild.required<TemplateRef<unknown>>("modalFicha");
  private dialogFicha: MatDialogRef<unknown> | null = null;
  readonly auth = inject(AuthService);

  readonly carregando = signal(true);
  readonly situacao = signal<SituacaoVinculo | null>(null);
  readonly classes = signal<ClasseFicha[]>([]);
  readonly gruposDeClasses = computed(() => agruparClasses(this.classes()));
  readonly pendentes = signal<Solicitacao[]>([]);
  readonly editando = signal<Ficha | null>(null);
  readonly rejeitando = signal<string | null>(null);
  readonly slots = SLOTS;
  readonly secoes = [
    { id: "dados", rotulo: "Personagem" },
    { id: "equipamentos", rotulo: "Equipamentos" },
    { id: "notas", rotulo: "Notas" },
  ] as const;
  readonly secaoFicha = signal<(typeof this.secoes)[number]["id"]>("dados");
  readonly slotAtivo = signal<(typeof SLOTS)[number]>(SLOTS[0]);
  editandoId: string | null = null;
  private fichaVinculada = false;
  nomeAnterior: string | null = null;
  readonly erroFicha = signal<string | null>(null);
  private readonly catalogoEquipamentos = inject(EquipamentosLatam);
  linkSimulador = "";
  readonly importando = signal(false);
  readonly avisoImportacao = signal<string | null>(null);
  motivo = "";
  readonly erro = signal<string | null>(null);
  readonly enviando = signal(false);

  readonly filaAprovacoes = inject(ActivatedRoute).snapshot.data["filaAprovacoes"] === true;
  readonly iconeDaClasse = iconeDaClasse;

  async ngOnInit(): Promise<void> {
    await this.recarregar();
  }

  private async recarregar(): Promise<void> {
    this.carregando.set(true);
    try {
      const [situacao, classes, pendentes] = await Promise.all([
        firstValueFrom(this.http.get<SituacaoVinculo>("/api/vinculo")),
        firstValueFrom(this.http.get<ClasseFicha[]>("/api/vinculo/classes")),
        this.filaAprovacoes
          ? firstValueFrom(this.http.get<Solicitacao[]>("/api/vinculo/solicitacoes?status=PENDENTE"))
          : Promise.resolve([]),
      ]);
      this.situacao.set(situacao);
      this.classes.set(classes);
      this.pendentes.set(pendentes);
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
    } finally {
      this.carregando.set(false);
    }
  }

  abrirPrimeiraFicha(): void {
    this.abrirModal(novaFicha(), false, null);
  }

  fichaPendente(pedido: Solicitacao, nome: string): Ficha {
    const ficha = pedido.fichas?.find((atual) => atual.nome === nome);
    return ficha
      ? { ...novaFicha(), ...ficha, build: ficha.build ?? "", equipamentos: { ...ficha.equipamentos } }
      : { ...novaFicha(), nome };
  }

  abrirFichaPendente(ficha: Ficha): void {
    this.abrirModal(ficha, false, null, ficha.nome);
  }

  tomDaClasse(classe: string): number {
    return Array.from(classe).reduce((tom, letra) => (tom * 31 + letra.charCodeAt(0)) % 360, 154);
  }

  nomeClasse(id: string): string {
    return this.classes().find((classe) => classe.id === id)?.nomeOficial ?? "Classe indisponível";
  }

  fichaValida(ficha: Ficha): boolean {
    return (
      !!ficha.nome.trim() &&
      !!ficha.classeId &&
      ficha.nivelBase !== null &&
      Number.isInteger(ficha.nivelBase) &&
      ficha.nivelBase >= 1 &&
      ficha.nivelBase <= 250
    );
  }

  itemEquipado(valor: EquipamentoFicha | undefined) {
    return typeof valor === "object" ? valor : null;
  }

  nomeEquipado(valor: EquipamentoFicha | undefined): string | undefined {
    return typeof valor === "string" ? valor : valor?.nome;
  }

  alterarEquipamento(ficha: Ficha, slot: string, valor: EquipamentoFicha | undefined): void {
    if (valor === undefined) delete ficha.equipamentos[slot];
    else ficha.equipamentos[slot] = valor;
  }

  abrirFichaVinculada(char?: PersonagemResumo): void {
    const ficha = char
      ? {
          nome: char.nome,
          classeId: char.classeId ?? "",
          nivelBase: char.nivelBase ?? null,
          build: char.build ?? "",
          equipamentos: { ...char.equipamentos },
        }
      : novaFicha();
    this.abrirModal(ficha, true, char?.id ?? null);
  }

  private abrirModal(
    ficha: Ficha,
    vinculada: boolean,
    id: string | null,
    nomeAnterior: string | null = null,
  ): void {
    this.fichaVinculada = vinculada;
    this.editandoId = id;
    this.nomeAnterior = nomeAnterior;
    this.erroFicha.set(null);
    this.linkSimulador = "";
    this.avisoImportacao.set(null);
    this.slotAtivo.set(SLOTS[0]);
    this.secaoFicha.set("dados");
    this.editando.set(ficha);
    const dialog = this.dialog.open(this.modalFicha(), {
      width: "660px",
      maxWidth: "calc(100vw - 24px)",
      maxHeight: "calc(100dvh - 24px)",
      autoFocus: "first-tabbable",
    });
    this.dialogFicha = dialog;
    dialog.afterClosed().subscribe(() => {
      if (this.dialogFicha === dialog) {
        this.dialogFicha = null;
        this.editando.set(null);
      }
    });
  }

  /**
   * D55: preenche a ficha aberta com a classe, o nível e os equipamentos de um link do simulador.
   * Os equipamentos da build substituem os da ficha; nada é salvo até o membro confirmar.
   */
  async importarBuild(ficha: Ficha): Promise<void> {
    const link = this.linkSimulador.trim();
    if (!link || this.importando()) return;
    this.importando.set(true);
    this.erroFicha.set(null);
    this.avisoImportacao.set(null);
    try {
      const [build] = await Promise.all([
        firstValueFrom(this.http.post<BuildImportada>("/api/vinculo/build-simulador", { link })),
        this.catalogoEquipamentos.carregar(),
      ]);
      if (this.editando() !== ficha) return;
      if (build.classeId) ficha.classeId = build.classeId;
      if (build.nivelBase !== null) ficha.nivelBase = build.nivelBase;
      const equipamentos: Ficha["equipamentos"] = {};
      for (const [slot, item] of Object.entries(build.equipamentos)) {
        if (!item) continue;
        const nome = this.catalogoEquipamentos.nomeDoItem(slot, item.id) ?? item.nome ?? `Item ${item.id}`;
        equipamentos[slot] = { id: item.id, nome };
      }
      ficha.equipamentos = equipamentos;
      this.linkSimulador = "";
      this.avisoImportacao.set(resumoDaImportacao(build, Object.keys(equipamentos).length));
    } catch (erro) {
      this.erroFicha.set(mensagemDeErro(erro));
    } finally {
      this.importando.set(false);
    }
  }

  async salvarFicha(ficha: Ficha): Promise<void> {
    if (!this.fichaValida(ficha) || this.enviando()) return;
    const id = this.editandoId;
    const vinculada = this.fichaVinculada;
    const pedido = this.situacao()?.solicitacao;
    const nomeAnterior = this.nomeAnterior;
    const corpo = { ...ficha, nome: ficha.nome.trim().normalize("NFC") };
    const dialog = this.dialogFicha;
    this.erroFicha.set(null);
    this.enviando.set(true);
    if (dialog) dialog.disableClose = true;
    try {
      let salvar;
      if (id) salvar = this.http.patch(`/api/vinculo/personagens/${id}`, corpo);
      else if (vinculada) salvar = this.http.post("/api/vinculo/personagens", corpo);
      else if (pedido?.status === "PENDENTE") {
        salvar = this.http.post(`/api/vinculo/solicitacoes/${pedido.id}/personagens`, {
          ficha: corpo,
          ...(nomeAnterior === null ? {} : { nomeAnterior }),
        });
      } else salvar = this.http.post("/api/vinculo/solicitacoes", { fichas: [corpo] });
      await firstValueFrom(salvar);
      dialog?.close();
      await this.recarregar();
    } catch (erro) {
      this.erroFicha.set(mensagemDeErro(erro));
    } finally {
      if (dialog) dialog.disableClose = false;
      this.enviando.set(false);
    }
  }

  async analisar(id: string, motivo?: string): Promise<void> {
    if (this.enviando()) return;
    this.erro.set(null);
    this.enviando.set(true);
    try {
      const acao = motivo === undefined ? "aprovar" : "rejeitar";
      await firstValueFrom(
        this.http.post(`/api/vinculo/solicitacoes/${id}/${acao}`, motivo === undefined ? {} : { motivo }),
      );
      this.rejeitando.set(null);
      this.motivo = "";
      await this.auth.carregar(true);
      await this.recarregar();
    } catch (erro) {
      this.erro.set(mensagemDeErro(erro));
    } finally {
      this.enviando.set(false);
    }
  }
}
