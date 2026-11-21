import { DOCUMENT } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import {
  type AfterViewInit,
  Component,
  computed,
  type ElementRef,
  inject,
  type OnInit,
  signal,
  viewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { mensagemDeErro, type PersonagemResumo, type SituacaoVinculo } from "../core/modelos";
import type { AlvosSimulacao, ChefeAlvo, InstanciaAlvo } from "./simulador.component";

/** Pasta, dentro do sistema, em que a interface do simulador é servida (`web/public/simulador-latam`). */
export const PASTA_DO_SIMULADOR = "simulador-latam/";

/** Chaves que a interface do simulador usa no armazenamento do navegador (mesma origem do sistema). */
export const CHAVE_BUILD = "ro-set";
export const CHAVE_COMPARACAO = "ro-set-compare";
export const CHAVE_MONSTRO = "monster";
/** Personagem cuja build foi aberta por último no simulador, para conferir antes de gravar. */
export const CHAVE_PERSONAGEM_ABERTO = "ev-simulador-personagem";

/** Chefe de instância com a marca de que o simulador o tem na lista de alvos. */
export type ChefeDoHub = ChefeAlvo & { noSimulador: boolean };
export type InstanciaDoHub = Omit<InstanciaAlvo, "chefes"> & { chefes: ChefeDoHub[] };

/** Resposta de GET /api/simulador/personagens/:id/build. */
export interface BuildAberta {
  personagem: { id: string; nome: string };
  build: Record<string, unknown>;
  avisos: string[];
}

/** Resposta de POST /api/simulador/personagens/:id/build. */
export interface BuildSalva {
  personagem: { id: string; nome: string; nivelBase: number | null; classe: string | null };
  equipamentos: number;
  buildInteira: boolean;
  avisos: string[];
}

/**
 * D61: simulador de dano completo dentro do sistema. A interface é a do simulador da latam-tools
 * (adsonpleal/latam-ro-calc, licença MIT), servida pelo próprio sistema num iframe de mesma
 * origem. Esta tela é a ponte com os dados do grupo: abre no simulador a build guardada na ficha
 * de um personagem do membro, aponta um chefe de instância como alvo e grava de volta na ficha a
 * build mudada. A troca é pelo armazenamento do navegador, que o simulador já usa para o rascunho.
 */
@Component({
  selector: "app-simulador-hub",
  imports: [FormsModule, RouterLink],
  template: `
    <div class="hub">
      <header>
        <h1>Simulador de dano</h1>
        <p class="dica">
          Simulador completo da latam-tools rodando dentro do sistema: equipamentos, cartas, encantamentos,
          sombrios, visuais, consumíveis, buffs, habilidades e rotação. Abra a build de um personagem seu,
          mude o que quiser e grave de volta na ficha. Para uma conta rápida com bônus digitados, use a
          <a routerLink="/simulador/estimativa">estimativa à mão</a>.
        </p>
      </header>
      @if (erro(); as mensagem) {
        <p class="erro" role="alert" data-testid="hub-erro">{{ mensagem }}</p>
      }
      @if (carregando()) {
        <p>Carregando…</p>
      } @else {
        <section class="barra" aria-label="Ficha e alvo">
          <div class="grupo">
            @if (personagens().length) {
              <label class="campo"
                >Personagem
                <select
                  name="personagem"
                  [ngModel]="personagemId()"
                  (ngModelChange)="personagemId.set($event)"
                >
                  @for (p of personagens(); track p.id) {
                    <option [value]="p.id">{{ p.nome }}</option>
                  }
                </select>
              </label>
              <button
                type="button"
                class="botao"
                data-testid="abrir-build"
                [disabled]="ocupado()"
                (click)="abrir()"
              >
                Abrir no simulador
              </button>
              <button
                type="button"
                class="botao principal"
                data-testid="salvar-build"
                [disabled]="ocupado()"
                (click)="salvar()"
              >
                Salvar na ficha de {{ selecionado()?.nome }}
              </button>
            } @else {
              <p class="dica" data-testid="sem-personagens">
                Você ainda não tem personagens no vínculo: o simulador funciona, mas não há ficha para abrir
                nem para gravar. <a routerLink="/vinculo">Cadastre um personagem</a>.
              </p>
            }
          </div>
          @if (instancias().length) {
            <div class="grupo">
              <label class="campo"
                >Instância
                <select
                  name="instancia"
                  [ngModel]="instanciaId()"
                  (ngModelChange)="escolherInstancia($event)"
                >
                  @for (instancia of instancias(); track instancia.id) {
                    <option [value]="instancia.id">{{ instancia.nome }}</option>
                  }
                </select>
              </label>
              <label class="campo"
                >Chefe
                <select name="chefe" [ngModel]="chefeId()" (ngModelChange)="chefeId.set(+$event)">
                  @for (chefe of chefes(); track chefe.idMonstro) {
                    <option [value]="chefe.idMonstro" [disabled]="!chefe.noSimulador">
                      {{ chefe.nome }}{{ chefe.noSimulador ? "" : " (fora do simulador)" }}
                    </option>
                  }
                </select>
              </label>
              <button
                type="button"
                class="botao"
                data-testid="usar-alvo"
                [disabled]="ocupado() || !chefeNoSimulador()"
                (click)="usarAlvo()"
              >
                Usar como alvo
              </button>
            </div>
          }
        </section>
        @if (nota(); as texto) {
          <p class="nota" role="status" data-testid="hub-nota">{{ texto }}</p>
        }
        @if (avisos().length) {
          <ul class="avisos" data-testid="hub-avisos">
            @for (aviso of avisos(); track aviso) {
              <li>{{ aviso }}</li>
            }
          </ul>
        }
      }
      <iframe #quadro class="quadro" title="Simulador de dano da latam-tools" data-testid="quadro"></iframe>
      <p class="dica credito">
        Interface e cálculo:
        <a href="https://github.com/adsonpleal/latam-ro-calc" target="_blank" rel="noreferrer noopener"
          >adsonpleal/latam-ro-calc</a
        >
        (licença MIT, Copyright (c) 2026 Adson Leal), o código do
        <a href="https://simulador.latam-tools.com.br/" target="_blank" rel="noreferrer noopener"
          >simulador da latam-tools</a
        >. Aqui ele roda sem os serviços do site de origem:
        {{
          semImagens()
            ? "sem link curto, sem novidades e sem os ícones dos itens"
            : "sem link curto e sem novidades"
        }}.
      </p>
    </div>
  `,
  styles: `
    .hub {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .hub h1 {
      margin: 0;
    }
    .dica {
      margin: 4px 0 0;
      color: var(--texto-suave);
      font-size: 13px;
      overflow-wrap: anywhere;
    }
    .barra {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 28px;
      padding: 12px 14px;
      border: 1px solid var(--borda);
      border-radius: 12px;
      background: var(--cartao);
    }
    .grupo {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: 10px;
      min-width: 0;
    }
    .campo {
      display: grid;
      gap: 4px;
      min-width: 0;
      font-size: 13px;
    }
    .campo select {
      box-sizing: border-box;
      max-width: 100%;
      min-width: 160px;
      padding: 8px;
      border: 1px solid var(--borda-forte);
      border-radius: 8px;
      background: var(--fundo);
      color: var(--texto);
      font: inherit;
    }
    .botao {
      padding: 8px 14px;
      border: 1px solid var(--borda-forte);
      border-radius: 8px;
      background: var(--elevado);
      color: var(--texto);
      font: inherit;
      cursor: pointer;
    }
    .botao.principal {
      border-color: var(--acento);
      background: var(--acento);
      color: var(--sobre-acento);
      font-weight: 600;
    }
    .botao:disabled {
      opacity: 0.55;
      cursor: default;
    }
    .nota {
      margin: 0;
      padding: 8px 12px;
      border: 1px solid var(--borda);
      border-radius: 10px;
      background: var(--cartao);
    }
    .avisos {
      margin: 0;
      padding-left: 18px;
      color: var(--texto-suave);
      font-size: 13px;
    }
    .erro {
      margin: 0;
      color: var(--mat-sys-error, #b3261e);
    }
    .quadro {
      width: 100%;
      height: max(720px, calc(100vh - 150px));
      border: 1px solid var(--borda);
      border-radius: 12px;
      background: #17212f;
    }
    .credito {
      margin: 0;
    }
  `,
})
export class SimuladorHubComponent implements OnInit, AfterViewInit {
  private readonly http = inject(HttpClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly documento = inject(DOCUMENT);
  private readonly quadro = viewChild.required<ElementRef<HTMLIFrameElement>>("quadro");
  private recargas = 0;

  readonly carregando = signal(true);
  readonly ocupado = signal(false);
  readonly erro = signal("");
  readonly nota = signal("");
  readonly avisos = signal<string[]>([]);
  readonly personagens = signal<PersonagemResumo[]>([]);
  readonly personagemId = signal("");
  readonly instancias = signal<InstanciaDoHub[]>([]);
  readonly instanciaId = signal("");
  readonly chefeId = signal(0);
  /** true enquanto o simulador servido aqui não usa um servidor de imagens (ver `origem.json`). */
  readonly semImagens = signal(true);

  readonly selecionado = computed(() => this.personagens().find((p) => p.id === this.personagemId()));
  readonly chefes = computed(
    () => this.instancias().find((instancia) => instancia.id === this.instanciaId())?.chefes ?? [],
  );
  readonly chefeNoSimulador = computed(
    () => this.chefes().find((chefe) => chefe.idMonstro === this.chefeId())?.noSimulador === true,
  );

  /** Carrega as fichas do membro e os chefes das instâncias; `?personagem=<id>` já abre a build. */
  async ngOnInit(): Promise<void> {
    try {
      const [situacao, alvos] = await Promise.all([
        firstValueFrom(this.http.get<SituacaoVinculo>("/api/vinculo")),
        firstValueFrom(this.http.get<AlvosSimulacao>("/api/simulador/alvos")),
      ]);
      const personagens = (situacao.jogador?.personagens ?? []).filter((p) => p.ativo);
      this.personagens.set(personagens);
      const comChefes = (alvos.instancias as InstanciaDoHub[]).filter((i) => i.chefes.length > 0);
      this.instancias.set(comChefes);
      if (comChefes[0]) this.escolherInstancia(comChefes[0].id);
      const pedido = this.rota.snapshot.queryParamMap.get("personagem");
      const aberto = this.ler(CHAVE_PERSONAGEM_ABERTO);
      const inicial = [pedido, aberto].find((id) => personagens.some((p) => p.id === id));
      this.personagemId.set(inicial ?? personagens[0]?.id ?? "");
      this.carregando.set(false);
      if (pedido && pedido === inicial) await this.abrir();
    } catch (erro) {
      this.erro.set(mensagemDeErro(erro));
      this.carregando.set(false);
    }
  }

  /** Carrega a interface do simulador no quadro assim que ele existe, com o rascunho do navegador. */
  ngAfterViewInit(): void {
    this.recarregar();
    void this.lerOrigem();
  }

  /**
   * Troca a instância e deixa escolhido o primeiro chefe que o simulador conhece.
   * @param id ID da instância
   */
  escolherInstancia(id: string): void {
    this.instanciaId.set(id);
    const chefes = this.chefes();
    this.chefeId.set((chefes.find((chefe) => chefe.noSimulador) ?? chefes[0])?.idMonstro ?? 0);
  }

  /** Busca a build da ficha escolhida, grava no rascunho do simulador e o recarrega com ela. */
  async abrir(): Promise<void> {
    const personagem = this.selecionado();
    if (!personagem) return;
    await this.executar(async () => {
      const aberta = await firstValueFrom(
        this.http.get<BuildAberta>(`/api/simulador/personagens/${personagem.id}/build`),
      );
      if (!this.gravar(CHAVE_BUILD, JSON.stringify(aberta.build))) {
        throw new Error("O navegador não deixou gravar a build para o simulador (armazenamento bloqueado).");
      }
      this.remover(CHAVE_COMPARACAO);
      this.gravar(CHAVE_PERSONAGEM_ABERTO, personagem.id);
      this.recarregar();
      this.avisos.set(aberta.avisos);
      this.nota.set(`Build de ${aberta.personagem.nome} aberta no simulador.`);
    });
  }

  /**
   * Grava na ficha escolhida a build que está no simulador. Se ela veio de outro personagem (ou de
   * nenhum), pede confirmação antes.
   */
  async salvar(): Promise<void> {
    const personagem = this.selecionado();
    if (!personagem) return;
    const rascunho = this.ler(CHAVE_BUILD);
    let build: unknown = null;
    try {
      build = rascunho === null ? null : JSON.parse(rascunho);
    } catch {
      build = null;
    }
    if (build === null) {
      this.erro.set(
        "O simulador ainda não tem uma build para gravar. Mude alguma coisa nele e tente de novo.",
      );
      return;
    }
    if (this.ler(CHAVE_PERSONAGEM_ABERTO) !== personagem.id) {
      const pergunta = `A build que está no simulador não foi aberta da ficha de ${personagem.nome}. Gravar mesmo assim na ficha de ${personagem.nome}?`;
      if (!this.documento.defaultView?.confirm(pergunta)) return;
    }
    await this.executar(async () => {
      const salva = await firstValueFrom(
        this.http.post<BuildSalva>(`/api/simulador/personagens/${personagem.id}/build`, { build }),
      );
      this.gravar(CHAVE_PERSONAGEM_ABERTO, personagem.id);
      this.avisos.set(salva.avisos);
      const classe = salva.personagem.classe ? `${salva.personagem.classe}, ` : "";
      this.nota.set(
        `Ficha de ${salva.personagem.nome} atualizada: ${classe}nível ${salva.personagem.nivelBase ?? "?"}, ${salva.equipamentos} equipamento(s).`,
      );
    });
  }

  /** Aponta o chefe escolhido como alvo do simulador e o recarrega; a build aberta continua. */
  usarAlvo(): void {
    const chefe = this.chefes().find((c) => c.idMonstro === this.chefeId());
    if (!chefe?.noSimulador) return;
    this.erro.set("");
    if (!this.gravar(CHAVE_MONSTRO, String(chefe.idMonstro))) {
      this.erro.set("O navegador não deixou gravar o alvo para o simulador (armazenamento bloqueado).");
      return;
    }
    this.recarregar();
    this.avisos.set([]);
    this.nota.set(`Alvo do simulador: ${chefe.nome}.`);
  }

  /**
   * Roda uma ação com a tela ocupada, limpando as mensagens antes e mostrando o erro, se houver.
   * @param acao Ação a rodar
   */
  private async executar(acao: () => Promise<void>): Promise<void> {
    this.ocupado.set(true);
    this.erro.set("");
    this.nota.set("");
    this.avisos.set([]);
    try {
      await acao();
    } catch (erro) {
      this.erro.set(erro instanceof Error ? erro.message : mensagemDeErro(erro));
    } finally {
      this.ocupado.set(false);
    }
  }

  /** Lê de `origem.json`, gerado junto com a interface, se ela foi montada com um servidor de imagens. */
  private async lerOrigem(): Promise<void> {
    try {
      const url = new URL(`${PASTA_DO_SIMULADOR}origem.json`, this.documento.baseURI).href;
      const origem = await firstValueFrom(this.http.get<{ imagens: string | null }>(url));
      this.semImagens.set(!origem.imagens);
    } catch {
      this.semImagens.set(true);
    }
  }

  /** Carrega (ou recarrega) a interface do simulador no quadro, sem criar entrada no histórico. */
  private recarregar(): void {
    this.recargas += 1;
    const url = new URL(`${PASTA_DO_SIMULADOR}index.html?v=${this.recargas}`, this.documento.baseURI).href;
    const quadro = this.quadro().nativeElement;
    if (quadro.contentWindow && quadro.getAttribute("src")) quadro.contentWindow.location.replace(url);
    else quadro.setAttribute("src", url);
  }

  /**
   * Lê uma chave do armazenamento do navegador.
   * @param chave Nome da chave
   * @returns O valor, ou null se não existir ou o armazenamento estiver bloqueado
   */
  private ler(chave: string): string | null {
    try {
      return this.documento.defaultView?.localStorage.getItem(chave) ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Grava uma chave no armazenamento do navegador.
   * @param chave Nome da chave
   * @param valor Valor a gravar
   * @returns false se o armazenamento estiver bloqueado ou cheio
   */
  private gravar(chave: string, valor: string): boolean {
    try {
      this.documento.defaultView?.localStorage.setItem(chave, valor);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Apaga uma chave do armazenamento do navegador.
   * @param chave Nome da chave
   */
  private remover(chave: string): void {
    try {
      this.documento.defaultView?.localStorage.removeItem(chave);
    } catch {
      return;
    }
  }
}
