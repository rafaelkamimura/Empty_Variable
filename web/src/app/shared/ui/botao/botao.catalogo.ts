import { ChangeDetectionStrategy, Component } from "@angular/core";
import { BotaoComponent } from "./botao.component";

/** Exemplos do catálogo: button[uiBotao] em cada variante, tamanho e estado. */
@Component({
  selector: "ui-botao-catalogo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotaoComponent],
  template: `
    <h3>Variantes</h3>
    <div class="linha">
      <button uiBotao variante="principal">Registrar compra</button>
      <button uiBotao>Cancelar</button>
      <button uiBotao variante="fantasma">Ver extrato</button>
      <button uiBotao variante="perigo">Estornar pontos</button>
    </div>
    <h3>Tamanho p</h3>
    <div class="linha">
      <button uiBotao variante="principal" tamanho="p">Salvar</button>
      <button uiBotao tamanho="p">Editar</button>
      <button uiBotao variante="fantasma" tamanho="p">Detalhes</button>
    </div>
    <h3>Estados</h3>
    <div class="linha">
      <button uiBotao variante="principal" [carregando]="true">Enviando</button>
      <button uiBotao [disabled]="true">Desabilitado</button>
      <a uiBotao href="#exemplo">Link com cara de botão</a>
      <a uiBotao href="#exemplo" [disabled]="true">Link desabilitado</a>
    </div>
    <h3>Texto longo</h3>
    <div class="linha estreita">
      <button uiBotao variante="principal">Confirmar a entrega de todas as peças astrais</button>
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
    .linha {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-3);
      align-items: center;
    }
    .estreita {
      max-width: 240px;
    }
  `,
})
export class BotaoCatalogoComponent {}
