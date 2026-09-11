import { defineConfig } from "oxfmt";

export default defineConfig({
  // Markdown prose (README, Japanese design specs) must stay as written, not get reflowed.
  // The generated worker-configuration.d.ts is never hand-edited.
  ignorePatterns: ["worker-configuration.d.ts", "**/*.md"],
  printWidth: 100,
  semi: true,
  singleQuote: false,
  sortImports: {
    groups: [
      "type-import",
      ["value-builtin", "value-external"],
      "type-internal",
      "value-internal",
      ["type-parent", "type-sibling", "type-index"],
      ["value-parent", "value-sibling", "value-index"],
      "unknown",
    ],
  },
  trailingComma: "all",
  useTabs: false,
});
