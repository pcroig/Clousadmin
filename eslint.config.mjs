import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import pluginImport from "eslint-plugin-import";

const INTERNAL_MODULE_FOLDERS = [
  "app",
  "components",
  "lib",
  "types",
  "tests",
  "docs",
  "scripts",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      import: pluginImport,
    },
    settings: {
      "import/resolver": {
        typescript: true,
        node: true,
      },
    },
    rules: {
      // React Compiler rules - convertir a warnings para no bloquear el desarrollo
      // Estos errores indican código que el compilador no puede optimizar, pero funcionan correctamente
      "react-hooks/rules-of-hooks": "error", // Mantener como error - reglas fundamentales
      "react-hooks/exhaustive-deps": "warn", // Dependencias en hooks
      "react-hooks/preserve-manual-memoization": "warn", // Memoization que el compiler no puede preservar
      "react-hooks/set-state-in-effect": "warn", // setState en effects
      "react-hooks/static-components": "warn", // Componentes definidos durante render

      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "sort-imports": [
        "warn",
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
        },
      ],
      "import/order": [
        "warn",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index", "object", "type"],
          pathGroups: INTERNAL_MODULE_FOLDERS.map((folder) => ({
            pattern: `${folder}/**`,
            group: "internal",
            position: "after",
          })),
          pathGroupsExcludedImportTypes: ["internal"],
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
          "newlines-between": "always",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
