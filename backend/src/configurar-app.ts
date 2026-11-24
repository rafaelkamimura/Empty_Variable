import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import type { IncomingMessage } from "node:http";

/** D63: a publicação de um patch minerado traz o relatório inteiro (HTML + JSON, alguns MB) no corpo. */
export const LIMITE_CORPO_DATAMINE = "24mb";
const ROTA_DATAMINE = "/api/integracao/datamine/";

/** Só a publicação do datamine aceita um JSON grande; o resto da API fica no limite padrão (100 kB). */
export function corpoGrandeDoDatamine(req: IncomingMessage): boolean {
  const tipo = req.headers["content-type"] ?? "";
  return (req.url ?? "").startsWith(ROTA_DATAMINE) && /json/i.test(tipo);
}

/** Configuração comum à aplicação real e aos testes de integração. */
export function configurarApp(app: INestApplication): void {
  app.setGlobalPrefix("api");
  app.use(cookieParser());
  // O parser do datamine lê o corpo com o limite maior só nessa rota. Como o Nest deixa de registrar
  // os parsers padrão quando já existe um "jsonParser" na pilha, os dois padrão (JSON de 100 kB e
  // urlencoded) entram aqui explicitamente, logo depois: um corpo já lido pelo primeiro é pulado por eles.
  const express = app as NestExpressApplication;
  express.useBodyParser("json", { limit: LIMITE_CORPO_DATAMINE, type: corpoGrandeDoDatamine });
  express.useBodyParser("json");
  express.useBodyParser("urlencoded", { extended: true });
  // A API roda atrás do nginx/Caddy; confia no primeiro proxy para IP e protocolo.
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
}
