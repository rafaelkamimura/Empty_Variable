// Stylelint dos estilos do frontend (docs/frontend/diretrizes.md §8.3).
// Só as regras das diretrizes: sem hex fora de styles/_tokens.scss e sem ::ng-deep.
// Estilos inline dos componentes (.ts) são conferidos pelo ESLint (no-restricted-syntax).
/** @type {import("stylelint").Config} */
export default {
  customSyntax: "postcss-scss",
  rules: {
    "color-no-hex": [true, { message: "Cor em hex: use um token de styles/_tokens.scss (§2)." }],
    "selector-pseudo-element-disallowed-list": [["ng-deep"], { message: "::ng-deep é proibido (§2.5)." }],
  },
  overrides: [
    {
      // Único lugar com valores de cor.
      files: ["web/src/styles/_tokens.scss"],
      rules: { "color-no-hex": null },
    },
    {
      // Código antigo: as mesmas regras como aviso até migrar (§10).
      files: ["web/src/styles/_legado*.scss", "web/src/app/paginas/**/*.scss", "web/src/app/core/**/*.scss"],
      defaultSeverity: "warning",
    },
  ],
};
