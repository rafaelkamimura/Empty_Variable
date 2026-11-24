import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import type { TextoPatch } from "../data/relatorio.modelos";
import { IdentificacaoComponent } from "./identificacao.component";
import { CorpoDaLinhaDirective, LinhaExpansivelComponent } from "./linha-expansivel.component";
import { LinhaDaListaDirective, ListaFiltradaComponent } from "./lista-filtrada.component";

type TipoDeLinha = "adicionada" | "removida" | "trecho" | "contexto";

/** O tipo da linha de um diff unificado, pelo primeiro caractere (os cabeçalhos `---`/`+++` são contexto). */
function tipoDaLinha(linha: string): TipoDeLinha {
  if (linha.startsWith("@@")) return "trecho";
  if (linha.startsWith("+++") || linha.startsWith("---")) return "contexto";
  if (linha.startsWith("+")) return "adicionada";
  if (linha.startsWith("-")) return "removida";
  return "contexto";
}

/**
 * Aba "Textos": o diff unificado de cada arquivo de texto do cliente. O próprio texto marca a
 * mudança (`+` e `-` no começo da linha); o fundo só reforça.
 */
@Component({
  selector: "app-aba-textos",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AvisoComponent,
    BadgeComponent,
    IdentificacaoComponent,
    LinhaDaListaDirective,
    CorpoDaLinhaDirective,
    LinhaExpansivelComponent,
    ListaFiltradaComponent,
  ],
  template: `
    <app-lista-filtrada
      [itens]="textos()"
      [textoDe]="textoDe"
      rotuloBusca="Buscar por arquivo"
      mensagemVazio="Este patch não alterou arquivos de texto."
    >
      <ng-template appLinhaDaLista [tipo]="textos()" let-t>
        <app-linha-expansivel>
          <ui-badge [tom]="t.situacao === 'novo' ? 'sucesso' : 'alerta'">{{
            t.situacao === "novo" ? "Novo" : "Alterado"
          }}</ui-badge>
          <app-identificacao caminho [nome]="t.arquivo" />
          <span class="meta">
            <span class="sr-only">{{ t.adicionadas }} linhas adicionadas, {{ t.removidas }} removidas</span>
            <span aria-hidden="true">+{{ t.adicionadas }} −{{ t.removidas }}</span>
          </span>
          <ng-template appCorpoDaLinha>
            @if (t.truncado) {
              <ui-aviso tom="info">O relatório traz só o começo das mudanças deste arquivo.</ui-aviso>
            }
            <div class="diff">
              @for (linha of t.linhas; track $index) {
                <span class="linha" [class]="tipo(linha)">{{ linha }}</span>
              }
            </div>
          </ng-template>
        </app-linha-expansivel>
      </ng-template>
    </app-lista-filtrada>
  `,
  styles: `
    :host {
      display: block;
    }
    .meta {
      font-family: var(--fonte-mono);
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
    .diff {
      margin: 0;
      padding: var(--esp-2) 0;
      border: 1px solid var(--borda);
      border-radius: var(--raio-p);
      background: var(--superficie);
      color: var(--texto);
      font-family: var(--fonte-mono);
      font-size: var(--fs-xs);
      line-height: 1.5;
    }
    .linha {
      display: block;
      min-height: 1lh;
      padding: 0 var(--esp-3);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .adicionada {
      background: var(--sucesso-fundo);
    }
    .removida {
      background: var(--erro-fundo);
    }
    .trecho {
      color: var(--texto-suave);
    }
  `,
})
export class AbaTextosComponent {
  readonly textos = input.required<readonly TextoPatch[]>();

  protected readonly tipo = tipoDaLinha;
  protected readonly textoDe = (t: TextoPatch): string => t.busca;
}
