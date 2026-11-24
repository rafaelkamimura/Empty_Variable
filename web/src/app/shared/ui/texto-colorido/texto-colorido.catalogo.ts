import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TextoColoridoComponent, type TrechoColorido } from "./texto-colorido.component";

/** Exemplos do catálogo: ui-texto-colorido com cores legíveis, cores escuras e texto longo. */
@Component({
  selector: "ui-texto-colorido-catalogo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TextoColoridoComponent],
  template: `
    <h3>Descrição de item (cores do jogo)</h3>
    <div class="quadro">
      @for (linha of descricao; track $index) {
        <ui-texto-colorido [trechos]="linha" />
      }
    </div>
    <h3>Cores escuras, ajustadas até 4,5:1 sobre o cartão</h3>
    <div class="quadro">
      @for (linha of escuras; track $index) {
        <ui-texto-colorido [trechos]="linha" />
      }
    </div>
    <h3>Texto longo sem espaço e linha em branco</h3>
    <div class="quadro estreito">
      <ui-texto-colorido [trechos]="longo" />
      <ui-texto-colorido [trechos]="[]" />
      <ui-texto-colorido [trechos]="depoisDoBranco" />
    </div>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
    h3 {
      margin: var(--esp-3) 0 0;
      font-size: var(--fs-m);
      color: var(--texto-suave);
    }
    .quadro {
      padding: var(--esp-4);
      border: 1px solid var(--borda);
      border-radius: var(--raio-g);
      background: var(--cartao);
      color: var(--texto);
    }
    .estreito {
      max-width: 240px;
    }
  `,
})
export class TextoColoridoCatalogoComponent {
  protected readonly descricao: TrechoColorido[][] = [
    [{ texto: "Uma carta com o poder do inverno." }],
    [{ texto: "Tipo: " }, { texto: "Carta", cor: "#777777" }],
    [{ texto: "Equipa em: " }, { texto: "Armadura", cor: "#777777" }],
    [
      { texto: "ATQM + 30", cor: "#FF0000" },
      { texto: " ao usar " },
      { texto: "Nevasca", cor: "#0000FF" },
      { texto: "." },
    ],
  ];
  protected readonly escuras: TrechoColorido[][] = [
    [{ texto: "Azul do jogo (#0000FF)", cor: "#0000FF" }],
    [{ texto: "Azul-marinho (#000088)", cor: "#000088" }],
    [{ texto: "Verde escuro (#006400)", cor: "#006400" }],
    [{ texto: "Roxo (#663399)", cor: "#663399" }],
    [{ texto: "Cinza (#777777)", cor: "#777777" }],
  ];
  protected readonly longo: TrechoColorido[] = [
    {
      texto: "data\\luafiles514\\lua files\\datainfo\\accessoryid_com_um_nome_bem_comprido.lub",
      cor: "#008800",
    },
  ];
  protected readonly depoisDoBranco: TrechoColorido[] = [{ texto: "Linha depois de uma linha em branco." }];
}
