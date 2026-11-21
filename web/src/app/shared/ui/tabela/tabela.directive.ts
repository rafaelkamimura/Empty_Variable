import {
  type AfterViewInit,
  booleanAttribute,
  Directive,
  ElementRef,
  inject,
  input,
  type OnDestroy,
} from "@angular/core";

/**
 * Tabela sem barra de rolagem (diretrizes §5 e §6.6). Em espaço largo, as células quebram linha;
 * quando a área de conteúdo fica estreita (container query `conteudo`, 760 px), cada linha vira um
 * cartão "rótulo: valor". Os rótulos saem do cabeçalho: a diretiva copia o texto de cada `th`
 * para o `data-label` das células da coluna, inclusive nas linhas que aparecem depois.
 *
 * É diretiva, e não componente, porque também vai em `<table mat-table>` (o MatTable já é o
 * componente do elemento). O estilo fica em `tabela.scss`, escopado em `table.ui-tabela`. Com
 * `padrao`, a tabela também ganha a aparência das células (`<table uiTabela padrao>`).
 *
 * @nivel organismo
 */
@Directive({
  selector: "table[uiTabela]",
  host: { class: "ui-tabela", "[class.ui-tabela-padrao]": "padrao()" },
})
export class TabelaDirective implements AfterViewInit, OnDestroy {
  /**
   * Aparência padrão das células (espaçamento, linha, cabeçalho e `class="numero"`). Opcional para
   * não mudar as tabelas antigas, que têm estilo próprio; toda tabela nova usa.
   */
  readonly padrao = input(false, { transform: booleanAttribute });

  private readonly tabela = inject<ElementRef<HTMLTableElement>>(ElementRef).nativeElement;
  private observador: MutationObserver | null = null;

  ngAfterViewInit(): void {
    this.rotular();
    // Só a lista de nós: trocar atributos aqui não dispara o observador de novo.
    this.observador = new MutationObserver(() => this.rotular());
    this.observador.observe(this.tabela, { childList: true, subtree: true });
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
  }

  private rotular(): void {
    const cabecalho = Array.from(this.tabela.querySelectorAll("thead tr:first-child > th")).map(
      (th) => th.textContent?.trim() ?? "",
    );
    for (const linha of Array.from(this.tabela.querySelectorAll("tbody > tr"))) {
      Array.from(linha.children).forEach((celula, i) => {
        const rotulo = cabecalho[i] ?? "";
        if (celula.getAttribute("data-label") !== rotulo) celula.setAttribute("data-label", rotulo);
      });
    }
  }
}
