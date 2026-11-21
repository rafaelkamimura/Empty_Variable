/** Check-in como os totais o enxergam (o que a API devolve em GET /api/farm/checkins). */
export interface CheckinParaTotal {
  personagemId: string;
  instanciaId: string;
  drops: readonly { itemId: string; quantidade: number }[];
}

export interface LinhaItem {
  itemId: string;
  quantidade: number;
  /** null quando o item não tem preço. */
  precoUnitario: number | null;
  /** null quando o item não tem preço. */
  subtotal: number | null;
}

export interface LinhaGrupo {
  id: string;
  checkins: number;
  itens: number;
  valor: number;
}

export interface Totais {
  checkins: number;
  itens: number;
  /** Soma dos itens com preço (D52). */
  valor: number;
  /** Quantidade de itens sem preço, que ficam fora do valor. */
  itensSemPreco: number;
  porItem: LinhaItem[];
  porInstancia: LinhaGrupo[];
  porPersonagem: LinhaGrupo[];
}

/** Totais de um conjunto de check-ins. O preço vigente de cada item vem de `precoDe` (null = sem preço). */
export function totalizar(
  checkins: readonly CheckinParaTotal[],
  precoDe: (itemId: string) => number | null,
): Totais {
  const itens = new Map<string, LinhaItem>();
  const instancias = new Map<string, LinhaGrupo>();
  const personagens = new Map<string, LinhaGrupo>();
  let totalItens = 0;
  let valor = 0;
  let semPreco = 0;

  const grupo = (mapa: Map<string, LinhaGrupo>, id: string) => {
    let g = mapa.get(id);
    if (g === undefined) {
      g = { id, checkins: 0, itens: 0, valor: 0 };
      mapa.set(id, g);
    }
    return g;
  };

  for (const c of checkins) {
    let valorCheckin = 0;
    let itensCheckin = 0;
    for (const d of c.drops) {
      if (d.quantidade <= 0) continue;
      const preco = precoDe(d.itemId);
      let linha = itens.get(d.itemId);
      if (linha === undefined) {
        linha = {
          itemId: d.itemId,
          quantidade: 0,
          precoUnitario: preco,
          subtotal: preco === null ? null : 0,
        };
        itens.set(d.itemId, linha);
      }
      linha.quantidade += d.quantidade;
      itensCheckin += d.quantidade;
      if (preco === null) semPreco += d.quantidade;
      else {
        linha.subtotal = (linha.subtotal ?? 0) + preco * d.quantidade;
        valorCheckin += preco * d.quantidade;
      }
    }
    totalItens += itensCheckin;
    valor += valorCheckin;
    for (const g of [grupo(instancias, c.instanciaId), grupo(personagens, c.personagemId)]) {
      g.checkins += 1;
      g.itens += itensCheckin;
      g.valor += valorCheckin;
    }
  }

  const porValor = (a: LinhaGrupo, b: LinhaGrupo) => b.valor - a.valor || b.checkins - a.checkins;
  return {
    checkins: checkins.length,
    itens: totalItens,
    valor,
    itensSemPreco: semPreco,
    porItem: [...itens.values()].sort(
      (a, b) => (b.subtotal ?? -1) - (a.subtotal ?? -1) || b.quantidade - a.quantidade,
    ),
    porInstancia: [...instancias.values()].sort(porValor),
    porPersonagem: [...personagens.values()].sort(porValor),
  };
}
