import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.angular/**",
      "**/coverage/**",
      "docs/**",
      "web/**",
      // Código de terceiros copiado sem alteração (D59).
      "packages/motor-latam/vendor/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
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
  {
    files: ["**/test/**/*.ts", "**/*.spec.ts"],
    rules: { "@typescript-eslint/no-non-null-assertion": "off" },
  },
);
