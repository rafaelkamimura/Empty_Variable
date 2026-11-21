/** Configuração lida do ambiente (ver .env.example). Injetada pelo token CONFIGURACAO. */
export interface Configuracao {
  /** Origem pública do sistema (ex.: https://betel.exemplo.com). Usada no redirect pós-login e na checagem de Origin. */
  appOrigin: string;
  /**
   * Prefixo de caminho quando o sistema divide o domínio com outro e fica numa sub-rota
   * (ex.: "/emptyvariable"). Vazio quando está na raiz. Entra no redirect pós-login e nos cookies.
   */
  caminhoBase: string;
  sessionSecret: string;
  /** Cookies com a flag Secure. Só desligue em desenvolvimento sem HTTPS. */
  cookieSecure: boolean;
  /** IDs do Discord que viram ADMIN ao entrar (bootstrap do primeiro admin). */
  adminDiscordIds: ReadonlySet<string>;
  /** null quando o OAuth do Discord não está configurado. */
  discord: { clientId: string; clientSecret: string; guildId: string; redirectUri: string } | null;
  /** Login simulado (POST /api/auth/dev-login). Nunca fica ativo com NODE_ENV=production. */
  devLogin: boolean;
  /** Segredo das rotas @Integracao() (INTEGRACAO_TOKEN). null deixa a integração desligada. */
  tokenIntegracao: string | null;
  /** Servidor do Discord do grupo, mesmo sem o OAuth configurado: delimita o que a integração enxerga. */
  guildId: string | null;
  /**
   * D53: chave da API da Divine Pride (DIVINE_PRIDE_API_KEY) e o servidor dos nomes
   * (DIVINE_PRIDE_SERVER, padrão LATAM, com nomes em português). null deixa a busca de nomes por ID desligada; as imagens
   * pelo ID (D41) não precisam de chave.
   */
  divinePride: { chave: string; servidor: string } | null;
}

export const CONFIGURACAO = Symbol("CONFIGURACAO");

const MIN_SEGREDO = 32;

/** Lê APP_BASE_PATH: vazio (raiz) ou um caminho como "/emptyvariable", sem barra no fim. */
export function caminhoBaseDe(env: Record<string, string | undefined>): string {
  const caminho = (env["APP_BASE_PATH"] ?? "").trim().replace(/\/+$/, "");
  if (caminho !== "" && !/^(\/[A-Za-z0-9._~-]+)+$/.test(caminho)) {
    throw new Error('APP_BASE_PATH precisa ser um caminho como "/emptyvariable" (ou vazio para a raiz).');
  }
  return caminho;
}

export function carregarConfiguracao(env: NodeJS.ProcessEnv = process.env): Configuracao {
  const sessionSecret = env["SESSION_SECRET"] ?? "";
  if (sessionSecret.length < MIN_SEGREDO) {
    throw new Error(`SESSION_SECRET precisa ter pelo menos ${MIN_SEGREDO} caracteres.`);
  }
  const appOrigin = (env["APP_ORIGIN"] ?? "").replace(/\/+$/, "");
  if (!/^https?:\/\/[^/]+$/.test(appOrigin)) {
    throw new Error("APP_ORIGIN precisa ser uma origem (ex.: https://betel.exemplo.com), sem caminho.");
  }
  const clientId = env["DISCORD_CLIENT_ID"] ?? "";
  const clientSecret = env["DISCORD_CLIENT_SECRET"] ?? "";
  const guildId = env["DISCORD_GUILD_ID"] ?? "";
  const caminhoBase = caminhoBaseDe(env);
  const redirectUri = env["DISCORD_REDIRECT_URI"] || `${appOrigin}${caminhoBase}/api/auth/discord/callback`;
  const discordCompleto = clientId !== "" && clientSecret !== "" && guildId !== "";
  const tokenIntegracao = env["INTEGRACAO_TOKEN"] ?? "";
  const chaveDivinePride = (env["DIVINE_PRIDE_API_KEY"] ?? "").trim();
  const servidorDivinePride = (env["DIVINE_PRIDE_SERVER"] ?? "").trim() || "LATAM";
  if (!/^[A-Za-z]{2,10}$/.test(servidorDivinePride)) {
    throw new Error("DIVINE_PRIDE_SERVER precisa ser o código de um servidor da Divine Pride (ex.: LATAM).");
  }
  if (tokenIntegracao !== "" && tokenIntegracao.length < MIN_SEGREDO) {
    throw new Error(`INTEGRACAO_TOKEN precisa ter pelo menos ${MIN_SEGREDO} caracteres.`);
  }

  return {
    appOrigin,
    caminhoBase,
    sessionSecret,
    cookieSecure: env["COOKIE_SECURE"] !== "false",
    adminDiscordIds: new Set(
      (env["ADMIN_DISCORD_IDS"] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== ""),
    ),
    discord: discordCompleto ? { clientId, clientSecret, guildId, redirectUri } : null,
    devLogin: env["AUTH_DEV_LOGIN"] === "true" && env["NODE_ENV"] !== "production",
    tokenIntegracao: tokenIntegracao === "" ? null : tokenIntegracao,
    guildId: guildId === "" ? null : guildId,
    divinePride: chaveDivinePride === "" ? null : { chave: chaveDivinePride, servidor: servidorDivinePride },
  };
}
