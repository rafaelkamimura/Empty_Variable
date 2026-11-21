import js from "@eslint/js";
import angular from "angular-eslint";
import tseslint from "typescript-eslint";
import fronteiras from "./tools/eslint/fronteiras-frontend.mjs";

// ---------- Frontend (docs/frontend/diretrizes.md §8.3) ----------
// Código novo (shared/, features/, layout/, dev/) recebe as regras como ERRO; o código antigo
// (paginas/, core/ e arquivos da raiz do app) recebe as mesmas regras como AVISO até migrar (§10).
const WEB_ANTIGO = ["web/src/app/paginas/**", "web/src/app/core/**", "web/src/app/*.ts", "web/src/main.ts"];
const WEB_ANTIGO_HTML = [
  "web/src/app/paginas/**/*.html",
  "web/src/app/core/**/*.html",
  "web/src/app/*.ts/**/*.html",
];
const SEM_HTTP_CLIENT = [
  "web/src/app/shared/**",
  "web/src/app/layout/**",
  "web/src/app/features/*/componentes/**",
  "web/src/app/features/*/paginas/**",
];

const HEX = "/#[0-9a-fA-F]{3,8}\\b/";
const NG_DEEP = "/::ng-deep/";
/** Estilos inline do componente (`styles: ...`): sem hex e sem ::ng-deep, como no Stylelint. */
const estilosInline = [HEX, NG_DEEP].flatMap((re) => {
  const msg =
    re === HEX
      ? "Cor em hex no componente: use um token de styles/_tokens.scss (§2)."
      : "::ng-deep é proibido (§2.5).";
  return [
    { selector: `Property[key.name='styles'] TemplateElement[value.raw=${re}]`, message: msg },
    { selector: `Property[key.name='styles'] Literal[value=${re}]`, message: msg },
  ];
});

const regraHttpClient = [
  "error",
  {
    paths: [
      {
        name: "@angular/common/http",
        importNames: ["HttpClient"],
        message: "HttpClient só em features/*/data/*.api.ts ou core/ (§4.5).",
      },
    ],
  },
];

const regrasTs = {
  "@angular-eslint/component-selector": ["error", { type: "element", prefix: "app", style: "kebab-case" }],
  "@angular-eslint/directive-selector": ["error", { type: "attribute", prefix: "app", style: "camelCase" }],
  // Páginas roteadas terminam em Page (CatalogoPage), o resto em Component (§3.2).
  "@angular-eslint/component-class-suffix": ["error", { suffixes: ["Component", "Page"] }],
  "@angular-eslint/prefer-on-push-component-change-detection": "error",
  "@angular-eslint/prefer-signals": "error",
  "@angular-eslint/no-input-rename": "error",
  "@angular-eslint/no-output-rename": "error",
  "betel/fronteiras": "error",
  "no-restricted-syntax": ["error", ...estilosInline],
};

const configWebTs = {
  files: ["web/src/**/*.ts"],
  extends: [...angular.configs.tsRecommended],
  plugins: { betel: fronteiras },
  processor: angular.processInlineTemplates,
  rules: regrasTs,
};
const configWebHtml = {
  files: ["web/src/**/*.html"],
  extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
  rules: {},
};

/** Copia as regras ativas das configs dadas como "warn", mantendo as opções. */
function comoAviso(configs) {
  const regras = new Map();
  for (const c of configs.flat(Infinity)) {
    for (const [nome, valor] of Object.entries(c.rules ?? {})) {
      const nivel = Array.isArray(valor) ? valor[0] : valor;
      if (nivel === "off" || nivel === 0) regras.delete(nome);
      else regras.set(nome, Array.isArray(valor) ? ["warn", ...valor.slice(1)] : "warn");
    }
  }
  return Object.fromEntries(regras);
}

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.angular/**",
      "**/coverage/**",
      "docs/**",
      "web/public/**",
      "web/tools/**",
      // Código de terceiros copiado sem alteração (D59).
      "packages/motor-latam/vendor/**",
    ],
  },
  {
    // JS/TS de todo o repositório (os templates .html do Angular têm config própria abaixo).
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      // Módulos NestJS são classes vazias decoradas com @Module.
      "@typescript-eslint/no-extraneous-class": ["error", { allowWithDecorator: true }],
    },
  },
  {
    // Scripts Node em JavaScript (ex.: tests/e2e/servidor.mjs)
    files: ["tests/**/*.mjs", "packages/*/scripts/**/*.mjs"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly", setTimeout: "readonly", URL: "readonly" },
    },
  },

  // ---------- Frontend ----------
  configWebTs,
  configWebHtml,
  {
    // shared/ui usa o prefixo ui- (elemento) e ui (atributo), §3.2.
    files: ["web/src/app/shared/ui/**/*.ts"],
    rules: {
      "@angular-eslint/component-selector": ["error", { type: "element", prefix: "ui", style: "kebab-case" }],
      "@angular-eslint/directive-selector": [
        "error",
        { type: "attribute", prefix: "ui", style: "camelCase" },
      ],
    },
  },
  {
    // HttpClient só em features/*/data/ e core/ (§4.5).
    files: SEM_HTTP_CLIENT.map((g) => `${g}/*.ts`),
    rules: { "no-restricted-imports": regraHttpClient },
  },
  {
    // Código antigo: mesmas regras, como aviso (§8.3).
    files: WEB_ANTIGO.map((g) => (g.endsWith(".ts") ? g : `${g}/*.ts`)),
    rules: comoAviso([
      js.configs.recommended,
      tseslint.configs.strict,
      angular.configs.tsRecommended,
      { rules: regrasTs },
    ]),
  },
  {
    // Páginas antigas: HttpClient direto vira aviso até a feature ganhar data/*.api.ts (§4.5).
    files: ["web/src/app/paginas/**/*.ts"],
    rules: comoAviso([{ rules: { "no-restricted-imports": regraHttpClient } }]),
  },
  {
    files: WEB_ANTIGO_HTML,
    rules: comoAviso([angular.configs.templateRecommended, angular.configs.templateAccessibility]),
  },
  {
    // Testes podem usar "!" (vale também para o código antigo do web, por isso fica por último).
    files: ["**/test/**/*.ts", "**/*.spec.ts"],
    rules: { "@typescript-eslint/no-non-null-assertion": "off" },
  },
);
