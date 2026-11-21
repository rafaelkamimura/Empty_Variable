import { DecimalPipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, computed, inject, type OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import {
  BONUS_FISICO_ZERADO,
  BONUS_MAGICO_ZERADO,
  type BonusFisico,
  type BonusMagico,
  CODIGOS_TIPO_ARMA,
  CONSIDERA,
  type ContraHp,
  ELEMENTOS,
  type Elemento,
  NAO_CONFIRMADO,
  NAO_CONSIDERA,
  type ResultadoSimulacao,
  TAMANHOS,
  type Tamanho,
  type TipoArma,
  TIPOS_ARMA,
} from "@betel/simulador";
import { firstValueFrom } from "rxjs";
import { AuthService } from "../core/auth.service";
import { atributoDaBuild, refinoEGrau } from "../core/build";
import { mensagemDeErro, type PersonagemResumo, type SituacaoVinculo } from "../core/modelos";

/** Atributos de um monstro como a API devolve; null é o que a fonte não trouxe. */
export interface MonstroAlvo {
  idJogo: number;
  nome: string | null;
  origem: "DIVINE_PRIDE" | "LATAM_TOOLS" | "REFERENCIA";
  servidor: string | null;
  fonte: string | null;
  nivel: number | null;
  hp: number | null;
  def: number | null;
  mdef: number | null;
  vit: number | null;
  int: number | null;
  res: number | null;
  mres: number | null;
  raca: string | null;
  tamanho: Tamanho | null;
  elemento: Elemento | null;
  nivelElemento: number | null;
  chefe: boolean | null;
  danoRecebidoPct: number | null;
}

export interface ChefeAlvo {
  idMonstro: number;
  nome: string;
  observacao: string | null;
  fonte: string | null;
  monstro: MonstroAlvo | null;
}

export interface InstanciaAlvo {
  id: string;
  nome: string;
  nivelMinimo: number | null;
  chefes: ChefeAlvo[];
}

export interface AlvosSimulacao {
  divinePride: boolean;
  instancias: InstanciaAlvo[];
}

export type RespostaSimulacao = ResultadoSimulacao & {
  tipo: "FISICO" | "MAGICO";
  contraHp: ({ hp: number } & ContraHp) | null;
};

interface AlvoFormulario {
  nome: string;
  nivel: number | null;
  hp: number | null;
  def: number | null;
  mdef: number | null;
  vit: number | null;
  int: number | null;
  res: number | null;
  mres: number | null;
  tamanho: Tamanho;
  elemento: Elemento;
  nivelElemento: number;
  danoRecebidoPct: number | null;
}

const ROTULOS_ELEMENTO: Record<Elemento, string> = {
  NEUTRO: "Neutro",
  AGUA: "Água",
  TERRA: "Terra",
  FOGO: "Fogo",
  VENTO: "Vento",
  VENENO: "Veneno",
  SAGRADO: "Sagrado",
  SOMBRIO: "Sombrio",
  FANTASMA: "Fantasma",
  MALDITO: "Maldito",
};
const ROTULOS_TAMANHO: Record<Tamanho, string> = { PEQUENO: "Pequeno", MEDIO: "Médio", GRANDE: "Grande" };
const ROTULOS_RACA: Record<string, string> = {
  AMORFO: "Amorfo",
  MORTO_VIVO: "Morto-vivo",
  BRUTO: "Bruto",
  PLANTA: "Planta",
  INSETO: "Inseto",
  PEIXE: "Peixe",
  DEMONIO: "Demônio",
  HUMANOIDE: "Humanoide",
  ANJO: "Anjo",
  DRAGAO: "Dragão",
};

const ATRIBUTOS_ATACANTE = [
  ["str", "FOR"],
  ["dex", "DES"],
  ["int", "INT"],
  ["luk", "SOR"],
  ["pow", "POD"],
  ["spl", "FEI"],
  ["con", "CON"],
] as const;

const CAMPOS_FISICOS: readonly (readonly [
  Exclude<keyof BonusFisico, "ignoraPenalidadeDeTamanho">,
  string,
])[] = [
  ["atkEquipamento", "ATQ de equipamento, consumíveis e munição"],
  ["atkPct", "ATQ %"],
  ["racaPct", "Dano físico contra a raça %"],
  ["tamanhoPct", "Dano físico contra o tamanho %"],
  ["elementoPct", "Dano físico contra a propriedade %"],
  ["classePct", "Dano físico contra chefes %"],
  ["patk", "A.FÍS de equipamento"],
  ["atkMaestria", "ATQ de maestria"],
  ["distanciaPct", "Dano a distância ou corpo a corpo %"],
  ["habilidadePct", "Dano da habilidade %"],
  ["ignorarDefPct", "Ignorar DEF %"],
  ["ignorarResPct", "Ignorar RES %"],
  ["danoFinalPct", "Dano final %"],
];

const CAMPOS_MAGICOS: readonly (readonly [keyof BonusMagico, string])[] = [
  ["matkEquipamento", "ATQM de equipamento e consumíveis"],
  ["matkPct", "ATQM %"],
  ["racaPct", "Dano mágico contra a raça %"],
  ["tamanhoPct", "Dano mágico contra o tamanho %"],
  ["elementoAlvoPct", "Dano mágico contra a propriedade do alvo %"],
  ["elementoHabilidadePct", "Dano mágico da propriedade da habilidade %"],
  ["classePct", "Dano mágico contra chefes %"],
  ["smatk", "A.MÁG de equipamento"],
  ["habilidadePct", "Dano da habilidade %"],
  ["ignorarMdefPct", "Ignorar DEFM %"],
  ["ignorarMresPct", "Ignorar RESM %"],
  ["danoFinalPct", "Dano final %"],
];

const CAMPOS_ALVO = [
  ["nivel", "Nível"],
  ["hp", "HP"],
  ["def", "DEF"],
  ["mdef", "DEFM"],
  ["vit", "VIT"],
  ["int", "INT"],
  ["res", "RES"],
  ["mres", "RESM"],
  ["danoRecebidoPct", "Dano recebido %"],
] as const;

const alvoVazio = (): AlvoFormulario => ({
  nome: "",
  nivel: null,
  hp: null,
  def: null,
  mdef: null,
  vit: null,
  int: null,
  res: null,
  mres: null,
  tamanho: "MEDIO",
  elemento: "NEUTRO",
  nivelElemento: 1,
  danoRecebidoPct: 100,
});

/**
 * D57: simulação de dano da build de um personagem contra um chefe de instância ou outro monstro.
 * A conta é a de `packages/simulador` (fórmulas públicas do Renewal), feita pela API. Os efeitos dos
 * itens não são lidos: o membro digita os bônus, e a tela diz o que entra e o que fica de fora.
 */
@Component({
  selector: "app-simulador",
  imports: [FormsModule, DecimalPipe],
  template: `
    <div class="pagina simulador">
      <header>
        <h1>Simulação de dano</h1>
        <p class="aviso" data-testid="aviso-estimativa">
          É uma <strong>estimativa</strong> pelas fórmulas públicas do Ragnarok Renewal. Os efeitos dos seus
          equipamentos, cartas e encantamentos <strong>não são calculados</strong>: some os bônus à mão. Veja
          no fim da página o que entra na conta.
        </p>
      </header>
      @if (erro(); as mensagem) {
        <p class="erro" role="alert">{{ mensagem }}</p>
      }
      @if (carregando()) {
        <p>Carregando…</p>
      } @else {
        <form (ngSubmit)="simular()">
          <section class="bloco" aria-labelledby="titulo-personagem">
            <h2 id="titulo-personagem">Personagem</h2>
            @if (personagens().length) {
              <label class="campo largo"
                >Build da ficha
                <select
                  name="personagem"
                  [ngModel]="personagemId()"
                  (ngModelChange)="escolherPersonagem($event)"
                >
                  <option value="">Preencher à mão</option>
                  @for (p of personagens(); track p.id) {
                    <option [value]="p.id">{{ p.nome }}</option>
                  }
                </select>
              </label>
            } @else {
              <p class="dica">Você ainda não tem personagens no vínculo: preencha os atributos à mão.</p>
            }
            @if (notaDaBuild(); as nota) {
              <p class="dica" data-testid="nota-build">{{ nota }}</p>
            }
            <div class="grade">
              <label class="campo"
                >Nível base
                <input type="number" name="nivelBase" min="1" max="250" [(ngModel)]="atacante.nivelBase" />
              </label>
              @for (campo of atributosAtacante; track campo[0]) {
                <label class="campo"
                  >{{ campo[1] }}
                  <input
                    type="number"
                    [name]="campo[0]"
                    min="0"
                    max="9999"
                    [(ngModel)]="atacante[campo[0]]"
                  />
                </label>
              }
            </div>
            <p class="dica">Atributos totais: some aos da build os bônus de equipamentos e buffs.</p>
          </section>

          <section class="bloco" aria-labelledby="titulo-ataque">
            <h2 id="titulo-ataque">Ataque</h2>
            <div class="grade">
              <label class="campo"
                >Tipo de dano
                <select name="tipo" [(ngModel)]="tipo">
                  <option value="FISICO">Físico</option>
                  <option value="MAGICO">Mágico</option>
                </select>
              </label>
              <label class="campo"
                >Propriedade do ataque
                <select name="elementoAtaque" [(ngModel)]="elementoAtaque">
                  @for (e of elementos; track e) {
                    <option [value]="e">{{ rotulosElemento[e] }}</option>
                  }
                </select>
              </label>
              <label class="campo"
                >% da habilidade
                <input type="number" name="pct" min="1" [(ngModel)]="habilidade.pct" />
              </label>
              <label class="campo"
                >Acertos
                <input type="number" name="acertos" min="1" max="1000" [(ngModel)]="habilidade.acertos" />
              </label>
            </div>
            <p class="dica">
              A fórmula de cada habilidade não está no sistema: informe a % dela (100 é o ataque básico) e
              quantas vezes acerta.
            </p>
            <div class="grade">
              <label class="campo"
                >Tipo da arma
                <select name="tipoArma" [(ngModel)]="arma.tipo">
                  @for (t of tiposArma; track t) {
                    <option [value]="t">{{ rotulosArma[t].rotulo }}</option>
                  }
                </select>
              </label>
              <label class="campo"
                >{{ tipo === "FISICO" ? "ATQ base da arma" : "ATQM base da arma" }}
                <input type="number" name="ataqueArma" min="0" [(ngModel)]="arma.ataque" />
              </label>
              <label class="campo"
                >Nível da arma
                <input type="number" name="nivelArma" min="1" max="5" [(ngModel)]="arma.nivel" />
              </label>
              <label class="campo"
                >Refino da arma
                <input type="number" name="refinoArma" min="0" max="20" [(ngModel)]="arma.refino" />
              </label>
            </div>
            <p class="dica">O ataque base e o nível da arma estão na descrição do item no jogo.</p>
          </section>

          <section class="bloco" aria-labelledby="titulo-bonus">
            <h2 id="titulo-bonus">Bônus de equipamentos, cartas e buffs</h2>
            <p class="dica">
              Tudo começa em zero. Some o que os seus itens dão; o sistema não lê os efeitos.
            </p>
            <div class="grade bonus">
              @if (tipo === "FISICO") {
                @for (campo of camposFisicos; track campo[0]) {
                  <label class="campo"
                    >{{ campo[1] }}
                    <input
                      type="number"
                      [name]="'f-' + campo[0]"
                      min="0"
                      [(ngModel)]="bonusFisico[campo[0]]"
                    />
                  </label>
                }
                <label class="marcar">
                  <input
                    type="checkbox"
                    name="ignoraPenalidade"
                    [(ngModel)]="bonusFisico.ignoraPenalidadeDeTamanho"
                  />
                  Ignora a penalidade de tamanho
                </label>
              } @else {
                @for (campo of camposMagicos; track campo[0]) {
                  <label class="campo"
                    >{{ campo[1] }}
                    <input
                      type="number"
                      [name]="'m-' + campo[0]"
                      min="0"
                      [(ngModel)]="bonusMagico[campo[0]]"
                    />
                  </label>
                }
              }
            </div>
          </section>

          <section class="bloco" aria-labelledby="titulo-alvo">
            <h2 id="titulo-alvo">Alvo</h2>
            <div class="grade">
              <label class="campo largo"
                >Instância
                <select
                  name="instancia"
                  [ngModel]="instanciaId()"
                  (ngModelChange)="escolherInstancia($event)"
                >
                  <option value="">Escolha a instância</option>
                  @for (i of instancias(); track i.id) {
                    <option [value]="i.id">
                      {{ i.nome }}{{ i.chefes.length ? " (" + i.chefes.length + ")" : "" }}
                    </option>
                  }
                </select>
              </label>
              @if (instancia(); as i) {
                @if (i.chefes.length) {
                  <label class="campo largo"
                    >Chefe
                    <select name="chefe" [ngModel]="chefeId()" (ngModelChange)="escolherChefe($event)">
                      <option [ngValue]="null">Escolha o chefe</option>
                      @for (c of i.chefes; track c.idMonstro) {
                        <option [ngValue]="c.idMonstro">{{ c.nome }}</option>
                      }
                    </select>
                  </label>
                }
              }
            </div>
            @if (instancia(); as i) {
              @if (!i.chefes.length) {
                <p class="dica" data-testid="sem-chefes">
                  Esta instância ainda não tem chefes cadastrados. Busque o monstro pelo ID do jogo ou
                  preencha os atributos do alvo.
                </p>
              }
            }
            <div class="linha">
              <label class="campo largo"
                >Nome do monstro
                <input
                  name="buscaMonstro"
                  maxlength="80"
                  placeholder="Ex.: Bafomé"
                  [(ngModel)]="buscaMonstro"
                  (keydown.enter)="$event.preventDefault(); buscarPorNome()"
                />
              </label>
              <button
                type="button"
                class="botao"
                [disabled]="ocupado() || buscaMonstro.trim().length < 2"
                (click)="buscarPorNome()"
              >
                Buscar pelo nome
              </button>
            </div>
            @if (encontrados(); as lista) {
              @if (lista.length) {
                <ul class="encontrados" data-testid="monstros-encontrados">
                  @for (m of lista; track m.idJogo) {
                    <li>
                      <button type="button" class="botao" (click)="escolherEncontrado(m)">
                        {{ m.nome }} · nv. {{ m.nivel }} · ID {{ m.idJogo }}
                      </button>
                    </li>
                  }
                </ul>
              } @else {
                <p class="dica" data-testid="monstros-encontrados">
                  Nenhum monstro guardado com esse nome. Busque pelo ID do jogo.
                </p>
              }
            }
            <div class="linha">
              <label class="campo"
                >ID do monstro no jogo
                <input type="number" name="idMonstro" min="1" [(ngModel)]="idMonstro" />
              </label>
              <button
                type="button"
                class="botao"
                [disabled]="ocupado() || !idMonstro"
                (click)="buscarMonstro()"
              >
                Buscar monstro
              </button>
            </div>
            @if (instancia(); as i) {
              @if (gestor()) {
                <div class="linha">
                  <label class="campo"
                    >Nome do chefe (opcional)
                    <input name="nomeChefe" maxlength="80" [(ngModel)]="nomeNovoChefe" />
                  </label>
                  <button
                    type="button"
                    class="botao"
                    [disabled]="ocupado() || !idMonstro"
                    (click)="cadastrarChefe(i)"
                  >
                    Cadastrar o monstro {{ idMonstro || "" }} como chefe
                  </button>
                  @if (chefe(); as c) {
                    <button type="button" class="botao" [disabled]="ocupado()" (click)="removerChefe(i, c)">
                      Remover {{ c.nome }} da instância
                    </button>
                  }
                </div>
              }
            }
            @if (!divinePride()) {
              <p class="dica">
                A busca pelo ID usa a Divine Pride e está desligada neste servidor: só os chefes já
                cadastrados com atributos respondem.
              </p>
            }
            @if (notaDoAlvo(); as nota) {
              <p class="dica" data-testid="nota-alvo">{{ nota }}</p>
            }
            @if (chefe()?.observacao; as observacao) {
              <p class="dica" data-testid="observacao-chefe">{{ observacao }}</p>
            }
            <div class="grade">
              <label class="campo largo"
                >Nome
                <input name="nomeAlvo" maxlength="80" [(ngModel)]="alvo.nome" />
              </label>
              @for (campo of camposAlvo; track campo[0]) {
                <label class="campo"
                  >{{ campo[1] }}
                  <input type="number" [name]="'alvo-' + campo[0]" min="0" [(ngModel)]="alvo[campo[0]]" />
                </label>
              }
              <label class="campo"
                >Tamanho
                <select name="tamanho" [(ngModel)]="alvo.tamanho">
                  @for (t of tamanhos; track t) {
                    <option [value]="t">{{ rotulosTamanho[t] }}</option>
                  }
                </select>
              </label>
              <label class="campo"
                >Propriedade
                <select name="elementoAlvo" [(ngModel)]="alvo.elemento">
                  @for (e of elementos; track e) {
                    <option [value]="e">{{ rotulosElemento[e] }}</option>
                  }
                </select>
              </label>
              <label class="campo"
                >Nível da propriedade
                <input type="number" name="nivelElemento" min="1" max="4" [(ngModel)]="alvo.nivelElemento" />
              </label>
            </div>
          </section>

          <button type="submit" class="botao principal" [disabled]="ocupado()">Simular</button>
        </form>

        @if (resultado(); as r) {
          <section class="bloco resultado" aria-labelledby="titulo-resultado" data-testid="resultado">
            <h2 id="titulo-resultado">Resultado estimado</h2>
            <dl>
              <dt>Por acerto</dt>
              <dd>{{ r.porAcerto.minimo | number: "1.0-0" }} a {{ r.porAcerto.maximo | number: "1.0-0" }}</dd>
              <dt>Por uso (todos os acertos)</dt>
              <dd>
                <strong
                  >{{ r.total.minimo | number: "1.0-0" }} a {{ r.total.maximo | number: "1.0-0" }}</strong
                >
                (média {{ r.total.medio | number: "1.0-0" }})
              </dd>
              @if (r.contraHp; as hp) {
                <dt>Do HP informado ({{ hp.hp | number: "1.0-0" }})</dt>
                <dd>
                  {{ hp.pctMinimo | number: "1.0-4" }}% a {{ hp.pctMaximo | number: "1.0-4" }}% por uso
                  @if (hp.usosMinimo !== null && hp.usosMaximo !== null) {
                    · {{ hp.usosMinimo | number: "1.0-0" }} a {{ hp.usosMaximo | number: "1.0-0" }} usos, sem
                    contar cura nem regeneração
                  }
                </dd>
              }
            </dl>
            <h3>Como a conta foi feita</h3>
            <dl class="detalhe">
              <dt>{{ r.tipo === "FISICO" ? "ATQ de atributos" : "ATQM de atributos" }}</dt>
              <dd>{{ r.detalhe.ataqueDeAtributos | number: "1.0-0" }}</dd>
              <dt>{{ r.tipo === "FISICO" ? "ATQ da arma" : "ATQM da arma" }}</dt>
              <dd>
                {{ r.detalhe.ataqueDaArma.minimo | number: "1.0-0" }} a
                {{ r.detalhe.ataqueDaArma.maximo | number: "1.0-0" }}
              </dd>
              <dt>{{ r.tipo === "FISICO" ? "A.FÍS" : "A.MÁG" }}</dt>
              <dd>{{ r.detalhe.amplificacao }}</dd>
              <dt>Propriedade contra o alvo</dt>
              <dd>{{ r.detalhe.modificadorElementalPct }}%</dd>
              @if (r.tipo === "FISICO") {
                <dt>Penalidade de tamanho</dt>
                <dd>{{ r.detalhe.penalidadeDeTamanhoPct }}%</dd>
              }
              <dt>{{ r.tipo === "FISICO" ? "DEF do alvo" : "DEFM do alvo" }}</dt>
              <dd>
                {{ r.detalhe.defesa }} (passa {{ r.detalhe.passaPelaDefesaPct }}% do dano, menos
                {{ r.detalhe.defesaDeAtributos }} da defesa de atributos)
              </dd>
              <dt>{{ r.tipo === "FISICO" ? "RES do alvo" : "RESM do alvo" }}</dt>
              <dd>{{ r.detalhe.resistencia }} (passa {{ r.detalhe.passaPelaResistenciaPct }}% do dano)</dd>
            </dl>
          </section>
        }

        <section class="bloco limites" aria-labelledby="titulo-limites">
          <h2 id="titulo-limites">O que entra na conta</h2>
          <h3>Considera</h3>
          <ul>
            @for (linha of considera; track linha) {
              <li>{{ linha }}</li>
            }
          </ul>
          <h3>Não considera</h3>
          <ul data-testid="nao-considera">
            @for (linha of naoConsidera; track linha) {
              <li>{{ linha }}</li>
            }
          </ul>
          <h3>Ainda não confirmado</h3>
          <ul>
            @for (linha of naoConfirmado; track linha) {
              <li>{{ linha }}</li>
            }
            <li>
              os atributos dos monstros vêm da Divine Pride ou de uma referência do banco de dados coreano e
              podem ser diferentes no LATAM
            </li>
          </ul>
        </section>
      }
    </div>
  `,
  styles: `
    .simulador h1,
    .simulador h2 {
      margin: 0;
    }
    .simulador h3 {
      margin: 10px 0 4px;
      font-size: 14px;
    }
    form {
      display: grid;
      gap: 16px;
    }
    .aviso {
      margin: 8px 0 0;
      padding: 10px 12px;
      border: 1px solid var(--alerta);
      border-radius: 10px;
      background: var(--alerta-fundo);
    }
    .bloco {
      display: grid;
      gap: 10px;
      padding: 14px;
      border: 1px solid var(--borda);
      border-radius: 12px;
      background: var(--cartao);
    }
    .grade {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 132px), 1fr));
      align-items: end;
      gap: 10px;
    }
    .grade.bonus {
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 210px), 1fr));
    }
    .campo {
      display: grid;
      gap: 4px;
      min-width: 0;
      font-size: 13px;
    }
    .campo.largo {
      grid-column: span 2;
    }
    .campo :is(input, select) {
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      padding: 8px;
      border: 1px solid var(--borda-forte);
      border-radius: 8px;
      background: var(--fundo);
      color: var(--texto);
      font: inherit;
    }
    .marcar {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }
    .linha {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: 10px;
    }
    .dica {
      margin: 0;
      color: var(--texto-suave);
      font-size: 13px;
      overflow-wrap: anywhere;
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
      justify-self: start;
      border-color: var(--acento);
      background: var(--acento);
      color: var(--sobre-acento);
      font-weight: 600;
    }
    .botao:disabled {
      opacity: 0.55;
      cursor: default;
    }
    dl {
      display: grid;
      grid-template-columns: minmax(0, auto) minmax(0, 1fr);
      gap: 4px 14px;
      margin: 0;
    }
    dt {
      color: var(--texto-suave);
    }
    dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    .limites ul {
      margin: 0;
      padding-left: 18px;
      color: var(--texto-suave);
      font-size: 13px;
    }
    .erro {
      color: var(--mat-sys-error, #b3261e);
    }
    @media (max-width: 480px) {
      .campo.largo {
        grid-column: 1 / -1;
      }
      dl {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class SimuladorComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  readonly carregando = signal(true);
  readonly ocupado = signal(false);
  readonly erro = signal<string | null>(null);
  readonly personagens = signal<PersonagemResumo[]>([]);
  readonly personagemId = signal("");
  readonly instancias = signal<InstanciaAlvo[]>([]);
  readonly divinePride = signal(false);
  readonly instanciaId = signal("");
  readonly chefeId = signal<number | null>(null);
  readonly notaDaBuild = signal<string | null>(null);
  readonly notaDoAlvo = signal<string | null>(null);
  /** Resultado da última busca por nome; null antes de buscar. */
  readonly encontrados = signal<MonstroAlvo[] | null>(null);
  readonly resultado = signal<RespostaSimulacao | null>(null);

  readonly instancia = computed(() => this.instancias().find((i) => i.id === this.instanciaId()) ?? null);
  readonly chefe = computed(
    () => this.instancia()?.chefes.find((c) => c.idMonstro === this.chefeId()) ?? null,
  );
  readonly gestor = computed(() => {
    const papel = this.auth.usuario()?.papel;
    return papel === "ADMIN" || papel === "GESTOR";
  });

  readonly elementos = ELEMENTOS;
  readonly tamanhos = TAMANHOS;
  readonly tiposArma = CODIGOS_TIPO_ARMA;
  readonly rotulosArma = TIPOS_ARMA;
  readonly rotulosElemento = ROTULOS_ELEMENTO;
  readonly rotulosTamanho = ROTULOS_TAMANHO;
  readonly atributosAtacante = ATRIBUTOS_ATACANTE;
  readonly camposFisicos = CAMPOS_FISICOS;
  readonly camposMagicos = CAMPOS_MAGICOS;
  readonly camposAlvo = CAMPOS_ALVO;
  readonly considera = CONSIDERA;
  readonly naoConsidera = NAO_CONSIDERA;
  readonly naoConfirmado = NAO_CONFIRMADO;

  tipo: "FISICO" | "MAGICO" = "FISICO";
  elementoAtaque: Elemento = "NEUTRO";
  atacante = { nivelBase: 1, str: 0, dex: 0, int: 0, luk: 0, pow: 0, spl: 0, con: 0 };
  arma: { tipo: TipoArma; ataque: number; nivel: number; refino: number } = {
    tipo: "SEM_ARMA",
    ataque: 0,
    nivel: 1,
    refino: 0,
  };
  habilidade = { pct: 100, acertos: 1 };
  bonusFisico: BonusFisico = { ...BONUS_FISICO_ZERADO };
  bonusMagico: BonusMagico = { ...BONUS_MAGICO_ZERADO };
  alvo: AlvoFormulario = alvoVazio();
  idMonstro: number | null = null;
  buscaMonstro = "";
  nomeNovoChefe = "";

  async ngOnInit(): Promise<void> {
    try {
      const [situacao, alvos] = await Promise.all([
        firstValueFrom(this.http.get<SituacaoVinculo>("/api/vinculo")),
        firstValueFrom(this.http.get<AlvosSimulacao>("/api/simulador/alvos")),
      ]);
      this.personagens.set((situacao.jogador?.personagens ?? []).filter((p) => p.ativo));
      this.instancias.set(alvos.instancias);
      this.divinePride.set(alvos.divinePride);
      const pedido = this.rota.snapshot.queryParamMap.get("personagem");
      if (pedido && this.personagens().some((p) => p.id === pedido)) this.escolherPersonagem(pedido);
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
    } finally {
      this.carregando.set(false);
    }
  }

  /**
   * Preenche o atacante com o que a ficha guarda da build: nível, atributos (base mais bônus de
   * classe), talentos, refino da arma, propriedade do ataque e o nome da habilidade.
   */
  escolherPersonagem(id: string): void {
    this.personagemId.set(id);
    const p = this.personagens().find((personagem) => personagem.id === id);
    if (!p) {
      this.notaDaBuild.set(null);
      return;
    }
    const a = p.atributos;
    this.atacante = {
      nivelBase: p.nivelBase ?? 1,
      str: atributoDaBuild(a, "str"),
      dex: atributoDaBuild(a, "dex"),
      int: atributoDaBuild(a, "int"),
      luk: atributoDaBuild(a, "luk"),
      pow: a?.talentos?.pow ?? 0,
      spl: a?.talentos?.spl ?? 0,
      con: a?.talentos?.con ?? 0,
    };
    const armaDaFicha = p.equipamentos?.["arma"];
    const item = typeof armaDaFicha === "object" ? armaDaFicha : null;
    this.arma = { ...this.arma, refino: item?.refino ?? 0 };
    const elemento = ELEMENTOS.find((e) => e === a?.elementoAtaque);
    if (elemento) this.elementoAtaque = elemento;
    const semBuild = !a || Object.keys(a).length === 0;
    this.notaDaBuild.set(
      semBuild
        ? "Esta ficha não tem os atributos da build: importe o link do simulador na ficha ou preencha à mão."
        : [
            item ? `Arma: ${[item.nome, refinoEGrau(item)].filter((x) => x !== "").join(" ")}.` : "",
            a.habilidade
              ? `Habilidade da build: ${a.habilidade.nome}${a.habilidade.nivel ? ` nv. ${a.habilidade.nivel}` : ""}.`
              : "",
            "Os atributos vieram da build (base mais bônus de classe), sem os bônus dos equipamentos.",
          ]
            .filter((x) => x !== "")
            .join(" "),
    );
  }

  escolherInstancia(id: string): void {
    this.instanciaId.set(id);
    this.chefeId.set(null);
  }

  escolherChefe(idMonstro: number | null): void {
    this.chefeId.set(idMonstro);
    const chefe = this.chefe();
    if (!chefe) return;
    this.idMonstro = chefe.idMonstro;
    if (chefe.monstro) this.usarMonstro(chefe.monstro, chefe.nome);
    else {
      this.alvo = { ...alvoVazio(), nome: chefe.nome };
      this.notaDoAlvo.set(
        "Este chefe ainda não tem atributos guardados: busque pelo ID ou preencha os atributos do alvo.",
      );
    }
  }

  /** Copia os atributos do monstro para o formulário; o que a fonte não trouxe fica em branco. */
  private usarMonstro(monstro: MonstroAlvo, nome?: string): void {
    this.alvo = {
      nome: nome ?? monstro.nome ?? `Monstro ${monstro.idJogo}`,
      nivel: monstro.nivel,
      hp: monstro.hp,
      def: monstro.def,
      mdef: monstro.mdef,
      vit: monstro.vit,
      int: monstro.int,
      res: monstro.res,
      mres: monstro.mres,
      tamanho: monstro.tamanho ?? "MEDIO",
      elemento: monstro.elemento ?? "NEUTRO",
      nivelElemento: monstro.nivelElemento ?? 1,
      danoRecebidoPct: monstro.danoRecebidoPct ?? 100,
    };
    const faltam = [
      ...CAMPOS_ALVO.filter(([chave]) => chave !== "danoRecebidoPct" && monstro[chave] === null).map(
        ([, rotulo]) => rotulo,
      ),
      ...(monstro.tamanho === null ? ["tamanho"] : []),
      ...(monstro.elemento === null || monstro.nivelElemento === null ? ["propriedade"] : []),
    ];
    this.notaDoAlvo.set(
      [
        monstro.origem === "LATAM_TOOLS"
          ? "Atributos do simulador da latam-tools (RO LATAM)."
          : monstro.origem === "DIVINE_PRIDE"
            ? `Atributos da Divine Pride${monstro.servidor ? ` (servidor ${monstro.servidor})` : ""}.`
            : "Atributos de referência (banco de dados do kRO pela Divine Pride), não conferidos no LATAM.",
        monstro.raca ? `Raça: ${ROTULOS_RACA[monstro.raca] ?? monstro.raca}.` : "",
        monstro.chefe ? "É chefe." : "",
        faltam.length ? `A fonte não trouxe: ${faltam.join(", ")}. Preencha ou deixe em zero.` : "",
        monstro.fonte ? `Fonte: ${monstro.fonte}` : "",
      ]
        .filter((x) => x !== "")
        .join(" "),
    );
  }

  /** D58: procura pelo nome entre os monstros guardados (os do simulador da latam-tools e os já buscados). */
  async buscarPorNome(): Promise<void> {
    const busca = this.buscaMonstro.trim();
    if (busca.length < 2 || this.ocupado()) return;
    this.ocupado.set(true);
    this.erro.set(null);
    try {
      this.encontrados.set(
        await firstValueFrom(this.http.get<MonstroAlvo[]>("/api/simulador/monstros", { params: { busca } })),
      );
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
    } finally {
      this.ocupado.set(false);
    }
  }

  escolherEncontrado(monstro: MonstroAlvo): void {
    this.idMonstro = monstro.idJogo;
    this.usarMonstro(monstro);
    if (this.chefe()?.idMonstro !== monstro.idJogo) this.chefeId.set(null);
    this.encontrados.set(null);
  }

  async buscarMonstro(): Promise<void> {
    const id = this.idMonstro;
    if (!id || this.ocupado()) return;
    this.ocupado.set(true);
    this.erro.set(null);
    try {
      this.usarMonstro(await firstValueFrom(this.http.get<MonstroAlvo>(`/api/simulador/monstros/${id}`)));
      if (this.chefe()?.idMonstro !== id) this.chefeId.set(null);
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
    } finally {
      this.ocupado.set(false);
    }
  }

  private async recarregarAlvos(): Promise<void> {
    const alvos = await firstValueFrom(this.http.get<AlvosSimulacao>("/api/simulador/alvos"));
    this.instancias.set(alvos.instancias);
  }

  async cadastrarChefe(instancia: InstanciaAlvo): Promise<void> {
    const idMonstro = this.idMonstro;
    if (!idMonstro || this.ocupado()) return;
    this.ocupado.set(true);
    this.erro.set(null);
    try {
      const nome = this.nomeNovoChefe.trim();
      await firstValueFrom(
        this.http.post(`/api/simulador/instancias/${instancia.id}/chefes`, {
          idMonstro,
          ...(nome ? { nome } : {}),
        }),
      );
      this.nomeNovoChefe = "";
      await this.recarregarAlvos();
      this.escolherChefe(idMonstro);
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
    } finally {
      this.ocupado.set(false);
    }
  }

  async removerChefe(instancia: InstanciaAlvo, chefe: ChefeAlvo): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.erro.set(null);
    try {
      await firstValueFrom(
        this.http.delete(`/api/simulador/instancias/${instancia.id}/chefes/${chefe.idMonstro}`),
      );
      this.chefeId.set(null);
      await this.recarregarAlvos();
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
    } finally {
      this.ocupado.set(false);
    }
  }

  /** Corpo de POST /api/simulador/simular: campos em branco vão como zero, e o HP só se informado. */
  corpoDaSimulacao(): object {
    const semNulos = <T extends object>(dados: T): T =>
      Object.fromEntries(
        Object.entries(dados).map(([chave, valor]) => [chave, valor === null ? 0 : valor]),
      ) as T;
    const a = this.alvo;
    return {
      tipo: this.tipo,
      atacante: semNulos(this.atacante),
      arma: semNulos(this.arma),
      elementoAtaque: this.elementoAtaque,
      bonus: semNulos(this.tipo === "FISICO" ? this.bonusFisico : this.bonusMagico),
      habilidade: this.habilidade,
      alvo: {
        nivel: a.nivel ?? 1,
        def: a.def ?? 0,
        mdef: a.mdef ?? 0,
        vit: a.vit ?? 0,
        int: a.int ?? 0,
        res: a.res ?? 0,
        mres: a.mres ?? 0,
        tamanho: a.tamanho,
        elemento: a.elemento,
        nivelElemento: a.nivelElemento,
        danoRecebidoPct: a.danoRecebidoPct ?? 100,
        ...(a.hp ? { hp: a.hp } : {}),
      },
    };
  }

  async simular(): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.erro.set(null);
    try {
      this.resultado.set(
        await firstValueFrom(
          this.http.post<RespostaSimulacao>("/api/simulador/simular", this.corpoDaSimulacao()),
        ),
      );
    } catch (e) {
      this.resultado.set(null);
      this.erro.set(mensagemDeErro(e));
    } finally {
      this.ocupado.set(false);
    }
  }
}
