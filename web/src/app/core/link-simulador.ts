/** Endereços de onde vem um link de compartilhamento do simulador da latam-tools: o site e o encurtador. */
export const SITE_DO_SIMULADOR = "simulador.latam-tools.com.br";
export const ENCURTADOR_DO_SIMULADOR = "short.latam-tools.com.br";

/** Maior link que a API aceita (o mesmo limite da importação para a ficha). */
export const LINK_MAXIMO = 65_536;

/** Link colado pelo membro, já limpo, ou a mensagem que diz como corrigir. */
export type LinkColado = { link: string } | { erro: string };

/**
 * Confere, antes de chamar a API, se o texto colado é um endereço do simulador da latam-tools ou
 * do encurtador dele. A leitura da build fica com a API: aqui só se recusa o que é de outro lugar.
 * @param texto Texto do campo "Link do simulador"
 * @returns O link limpo, ou a mensagem de erro para mostrar junto do campo
 */
export function lerLinkColado(texto: string): LinkColado {
  const limpo = texto
    .trim()
    .replace(/^<(.*)>$/, "$1")
    .trim();
  if (limpo === "") {
    return { erro: "Cole o link de compartilhamento do simulador da latam-tools." };
  }
  if (limpo.length > LINK_MAXIMO) {
    return { erro: "Esse link é grande demais para ser aberto aqui. Use o link curto do simulador." };
  }
  let endereco: URL | null;
  try {
    endereco = new URL(/^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`);
  } catch {
    endereco = null;
  }
  if (endereco?.hostname !== SITE_DO_SIMULADOR && endereco?.hostname !== ENCURTADOR_DO_SIMULADOR) {
    return {
      erro: `Esse endereço não é do simulador. Cole um link de ${SITE_DO_SIMULADOR} ou de ${ENCURTADOR_DO_SIMULADOR}.`,
    };
  }
  return { link: limpo };
}
