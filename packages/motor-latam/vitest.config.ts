import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const vendor = fileURLToPath(new URL("./vendor/latam-ro-calc/src/", import.meta.url));
const ambiente = fileURLToPath(new URL("./src/ambiente.ts", import.meta.url));

// O código de origem importa por "src/..." e lê o ambiente do site, que aqui é `src/ambiente.ts`.
// Os testes resolvem as importações do mesmo jeito que o pacote compilado (tsconfig.json).
export default defineConfig({
  resolve: {
    alias: [
      { find: /^src\/environments\/environment$/, replacement: ambiente },
      { find: /^src\//, replacement: vendor },
    ],
  },
  test: { include: ["test/**/*.test.ts"] },
});
