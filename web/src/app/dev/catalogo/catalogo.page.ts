import { NgComponentOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
  type Type,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { agruparPorNivel, entradaSelecionada, ROTULO_NIVEL } from "./catalogo.modelos";
import { ENTRADAS_CATALOGO } from "./entradas";

type Exemplos =
  | { estado: "carregando" }
  | { estado: "erro"; mensagem: string }
  | { estado: "pronto"; componente: Type<unknown> };

/**
 * Catálogo vivo de shared/ui (docs/frontend/diretrizes.md §8.2). Só existe fora de produção
 * (dev.routes.ts vira uma lista vazia no build de produção, por fileReplacements).
 */
@Component({
  selector: "app-catalogo-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet, RouterLink],
  template: `
    <header class="topo">
      <h1>Catálogo de componentes</h1>
      <p>Peças de shared/ui em todas as variantes e estados. Só aparece fora de produção.</p>
    </header>
    <div class="corpo">
      <nav aria-label="Componentes do catálogo" class="indice">
        @for (grupo of grupos; track grupo.nivel) {
          <h2 class="nivel">{{ grupo.rotulo }}</h2>
          <ul>
            @for (e of grupo.entradas; track e.id) {
              <li>
                <a
                  [routerLink]="['/dev/catalogo', e.id]"
                  [class.ativo]="e.id === atual()?.id"
                  [attr.aria-current]="e.id === atual()?.id ? 'page' : null"
                  data-testid="catalogo-link"
                  >{{ e.nome }}</a
                >
              </li>
            }
          </ul>
        }
      </nav>
      <section class="area" aria-label="Exemplos" data-testid="catalogo-area">
        @if (atual(); as e) {
          <h2 class="titulo">
            {{ e.nome }} <span class="selo-nivel">{{ rotuloNivel[e.nivel] }}</span>
          </h2>
          <p class="descricao">{{ e.descricao }}</p>
          @switch (exemplos().estado) {
            @case ("carregando") {
              <div class="esqueleto" aria-hidden="true"></div>
              <span class="sr-only" role="status">Carregando os exemplos</span>
            }
            @case ("erro") {
              <p role="alert" class="erro">Não foi possível carregar os exemplos. {{ mensagemErro() }}</p>
            }
            @case ("pronto") {
              <ng-container *ngComponentOutlet="componente()" />
            }
          }
        } @else {
          <p>O catálogo ainda não tem entradas. Registre a primeira em dev/catalogo/entradas.ts.</p>
        }
      </section>
    </div>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-5);
      max-width: var(--largura-conteudo);
      margin: 0 auto;
    }
    .topo h1 {
      margin: 0 0 var(--esp-1);
      font-size: var(--fs-2xl);
      color: var(--texto-forte);
    }
    .topo p,
    .descricao {
      margin: 0;
      color: var(--texto-suave);
    }
    .corpo {
      display: grid;
      grid-template-columns: minmax(160px, 220px) 1fr;
      gap: var(--esp-5);
      align-items: start;
    }
    .indice ul {
      margin: 0 0 var(--esp-4);
      padding: 0;
      list-style: none;
    }
    .nivel {
      margin: 0 0 var(--esp-2);
      font-size: var(--fs-xs);
      font-weight: 600;
      text-transform: uppercase;
      color: var(--texto-apagado);
    }
    .indice a {
      display: block;
      min-height: 40px;
      padding: var(--esp-2) var(--esp-3);
      box-sizing: border-box;
      border-radius: var(--raio-m);
      color: var(--texto);
      text-decoration: none;
    }
    .indice a:hover {
      background: var(--elevado);
    }
    .indice a.ativo {
      background: var(--acento-fundo);
      color: var(--texto-forte);
    }
    .area {
      display: grid;
      gap: var(--esp-4);
      min-width: 0;
    }
    .titulo {
      margin: 0;
      font-size: var(--fs-xl);
      color: var(--texto-forte);
    }
    .selo-nivel {
      margin-left: var(--esp-2);
      padding: 0 var(--esp-2);
      border: 1px solid var(--borda-forte);
      border-radius: var(--raio-total);
      font-size: var(--fs-xs);
      font-weight: 600;
      color: var(--texto-suave);
      vertical-align: middle;
    }
    .esqueleto {
      height: 160px;
      border-radius: var(--raio-g);
      background: var(--cartao);
    }
    .erro {
      margin: 0;
      padding: var(--esp-3);
      border-radius: var(--raio-m);
      background: var(--erro-fundo);
      color: var(--erro);
    }
    @container conteudo (max-width: 600px) {
      .corpo {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class CatalogoPage {
  /** Id da entrada vindo da URL (/dev/catalogo/:entrada). */
  readonly entrada = input<string>();

  protected readonly grupos = agruparPorNivel(ENTRADAS_CATALOGO);
  protected readonly rotuloNivel = ROTULO_NIVEL;
  protected readonly atual = computed(() => entradaSelecionada(ENTRADAS_CATALOGO, this.entrada()));
  protected readonly exemplos = signal<Exemplos>({ estado: "carregando" });
  protected readonly componente = computed(() => {
    const x = this.exemplos();
    return x.estado === "pronto" ? x.componente : null;
  });
  protected readonly mensagemErro = computed(() => {
    const x = this.exemplos();
    return x.estado === "erro" ? x.mensagem : "";
  });

  constructor() {
    effect(() => {
      const e = this.atual();
      if (!e) return;
      this.exemplos.set({ estado: "carregando" });
      e.carregar().then(
        (componente) => {
          if (this.atual() === e) this.exemplos.set({ estado: "pronto", componente });
        },
        (erro: unknown) => {
          // Mesma guarda do sucesso: a falha atrasada de uma entrada antiga não sobrescreve a atual.
          if (this.atual() === e)
            this.exemplos.set({ estado: "erro", mensagem: erro instanceof Error ? erro.message : "" });
        },
      );
    });
  }
}
