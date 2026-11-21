import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  Directive,
  input,
  output,
  TemplateRef,
} from "@angular/core";
import { type Carregavel, vazioPadrao } from "../../utils/carregavel";
import { AvisoComponent } from "../aviso/aviso.component";
import { BotaoComponent } from "../botao/botao.component";
import { type FormatoSkeleton, SkeletonComponent } from "../skeleton/skeleton.component";
import { VazioComponent } from "../vazio/vazio.component";

/** Contexto do template de conteúdo: `let-dados` (ou `let-x`) recebe os dados prontos. */
export interface ContextoEstado<T> {
  $implicit: T;
}

/**
 * Marca o template dos dados prontos e tipa o `let-`:
 * `<ng-template uiEstadoPronto [tipo]="estoque()" let-dados>…</ng-template>`.
 * Sem a diretiva, um `<ng-template let-dados>` comum também funciona (sem tipagem).
 */
@Directive({ selector: "ng-template[uiEstadoPronto]" })
export class EstadoProntoDirective<T> {
  /** Só para inferir o tipo dos dados: passe o mesmo Carregavel do `ui-estado`. */
  readonly tipo = input<Carregavel<T>>();

  static ngTemplateContextGuard<T>(_d: EstadoProntoDirective<T>, _ctx: unknown): _ctx is ContextoEstado<T> {
    return true;
  }
}

/**
 * Renderiza um `Carregavel<T>` (diretrizes §4.5 e §6.2): skeleton enquanto carrega, aviso de
 * erro com "Tentar novamente", estado vazio com a marca {∅_}, ou o template com os dados.
 * Slot `[slot=vazio-acao]`: a ação que preenche o vazio.
 *
 * @nivel organismo
 */
@Component({
  selector: "ui-estado",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, AvisoComponent, BotaoComponent, SkeletonComponent, VazioComponent],
  template: `
    @switch (valor().estado) {
      @case ("carregando") {
        <ui-skeleton [formato]="formatoCarregando()" [quantidade]="quantidadeCarregando()" />
        <span class="sr-only" role="status">{{ textoCarregando() }}</span>
      }
      @case ("erro") {
        <ui-aviso tom="erro" [titulo]="tituloErro()">
          {{ mensagemErro() }}
          <button uiBotao tamanho="p" slot="acoes" (click)="tentarNovamente.emit()">Tentar novamente</button>
        </ui-aviso>
      }
      @default {
        @if (vazio()) {
          <ui-vazio [mensagem]="mensagemVazio()"
            ><ng-content select="[slot=vazio-acao]" ngProjectAs="[slot=acao]"
          /></ui-vazio>
        } @else {
          <ng-container *ngTemplateOutlet="conteudo() ?? null; context: contexto()" />
        }
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class EstadoComponent<T> {
  /** O estado da área. */
  readonly valor = input.required<Carregavel<T>>();
  /** Formato do skeleton (o mais parecido com o conteúdo). */
  readonly formatoCarregando = input<FormatoSkeleton>("linhas");
  /** Quantos blocos o skeleton mostra. */
  readonly quantidadeCarregando = input(3);
  /** Anúncio para leitores de tela durante o carregamento. */
  readonly textoCarregando = input("Carregando");
  /** Título do aviso de erro. */
  readonly tituloErro = input("Não foi possível carregar.");
  /** Frase do estado vazio. */
  readonly mensagemVazio = input("Nada por aqui ainda.");
  /** Quando os dados contam como vazios. Padrão: lista vazia, null ou undefined. */
  readonly estaVazio = input<(dados: T) => boolean>(vazioPadrao);
  /** Clique em "Tentar novamente" no erro. */
  readonly tentarNovamente = output();

  protected readonly conteudo = contentChild(TemplateRef<ContextoEstado<T>>);

  protected readonly mensagemErro = computed(() => {
    const v = this.valor();
    return v.estado === "erro" ? v.mensagem : "";
  });
  protected readonly vazio = computed(() => {
    const v = this.valor();
    return v.estado === "pronto" && this.estaVazio()(v.dados);
  });
  protected readonly contexto = computed<ContextoEstado<T> | null>(() => {
    const v = this.valor();
    return v.estado === "pronto" ? { $implicit: v.dados } : null;
  });
}
