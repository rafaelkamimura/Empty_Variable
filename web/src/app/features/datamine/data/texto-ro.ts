// Marcação de texto do cliente do Ragnarok (descrições de item, skill e quest), como vem no report.json.
// Porta do `roText()` do relatório do rolatam-dm.
//
// - `^RRGGBB` troca a cor até o próximo `^RRGGBB`; `^000000` volta à cor padrão.
// - `<NAVI>rótulo<INFO>mapa,x,y,…</INFO></NAVI>`, `<ITEM>rótulo<INFO>id</INFO></ITEM>`,
//   `<URL>rótulo<INFO>endereço</INFO></URL>` e `<TIPBOX>rótulo<INFO>id</INFO></TIPBOX>` são atalhos
//   clicáveis no jogo; aqui fica só o rótulo (e, na navegação, o mapa e a posição).

/** Um pedaço de linha com uma cor só. `cor` nula é a cor padrão do texto. */
export interface TrechoRo {
  readonly texto: string;
  /** `#RRGGBB` em maiúsculas, como veio do jogo (sem ajuste de contraste). */
  readonly cor: string | null;
}

const NAVEGACAO = /<NAVI>([\s\S]*?)<INFO>([\s\S]*?)<\/INFO>\s*<\/NAVI>/gi;
const ATALHO = /<([A-Z_]+)>([\s\S]*?)<INFO>[\s\S]*?<\/INFO>\s*<\/\1>/gi;
const ETIQUETA_SOLTA = /<\/?(?:NAVI|ITEM|URL|OPENURL|TIPBOX|INFO)>/gi;
const COR = /\^([0-9a-fA-F]{6})/g;
const COR_PADRAO = "000000";
/** No cliente o fundo é claro: texto branco é o truque das descrições para deixar um espaço em branco. */
const COR_INVISIVEL = "FFFFFF";

/** `mapa,x,y,…` vira `mapa x,y`. Sem as três partes, ou se a primeira não é nome de mapa, não há destino. */
function destinoDe(info: string): string {
  const partes = info.split(",").map((p) => p.trim());
  const [mapa = "", x = "", y = ""] = partes;
  return partes.length > 2 && /^[a-z0-9_@]+$/i.test(mapa) ? `${mapa} ${x},${y}` : "";
}

/** Tira os atalhos do jogo e deixa o rótulo: `<NAVI>[Kafra]<INFO>prontera,150,180,…` → `[Kafra] (prontera 150,180)`. */
export function semAtalhos(linha: string): string {
  return linha
    .replace(NAVEGACAO, (_tudo, rotulo: string, info: string) => {
      const destino = destinoDe(info);
      return destino === "" ? rotulo : `${rotulo} (${destino})`;
    })
    .replace(ATALHO, (_tudo, _etiqueta: string, rotulo: string) => rotulo)
    .replace(ETIQUETA_SOLTA, "");
}

/**
 * Quebra uma linha de texto do jogo em trechos de uma cor só, já sem os atalhos. Trechos vizinhos
 * da mesma cor são unidos, e o texto "invisível" do cliente (branco) vira espaços.
 */
export function tokenizarTextoRo(linha: string): TrechoRo[] {
  const texto = semAtalhos(linha);
  const trechos: TrechoRo[] = [];
  let cor: string | null = null;
  let inicio = 0;

  const empurrar = (pedaco: string): void => {
    if (pedaco === "") return;
    const invisivel = cor === `#${COR_INVISIVEL}`;
    const conteudo = invisivel ? " ".repeat(pedaco.length) : pedaco;
    const corDoTrecho = invisivel ? null : cor;
    const ultimo = trechos[trechos.length - 1];
    if (ultimo !== undefined && ultimo.cor === corDoTrecho) {
      trechos[trechos.length - 1] = { texto: ultimo.texto + conteudo, cor: corDoTrecho };
    } else {
      trechos.push({ texto: conteudo, cor: corDoTrecho });
    }
  };

  for (const marca of texto.matchAll(COR)) {
    empurrar(texto.slice(inicio, marca.index));
    const hex = (marca[1] ?? COR_PADRAO).toUpperCase();
    cor = hex === COR_PADRAO ? null : `#${hex}`;
    inicio = marca.index + marca[0].length;
  }
  empurrar(texto.slice(inicio));
  return trechos;
}

/** A linha sem cores nem atalhos, para busca e para comparar descrições. */
export function textoPuroRo(linha: string): string {
  return tokenizarTextoRo(linha)
    .map((t) => t.texto)
    .join("");
}
