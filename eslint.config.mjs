import js from "@eslint/js";
import globals from "globals";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import nextPlugin from "@next/eslint-plugin-next";

const tsParserOptions = {
  project: "./tsconfig.json",
  tsconfigRootDir: new globalThis.URL(".", import.meta.url).pathname,
  ecmaVersion: "latest",
  sourceType: "module",
};

const nextRules = {
  ...nextPlugin.configs.recommended.rules,
  ...nextPlugin.configs["core-web-vitals"].rules,
};

export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "coverage/**",
      "dist/**",
      "playwright-report/**",
      "next-env.d.ts",
    ],
  },
  js.configs.recommended,
  {
    // TS/TSX — tsc khud karta hai: core no-undef type-positions par false
    // positive deta hai (React.ReactNode wagera). no-explicit-any is
    // codebase ki existing style hai. Images deliberately raw <img> hain
    // (ImageKit already optimized) — next/image migration alag task.
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: tsParserOptions,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "@next/next": nextPlugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...nextRules,
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-console": "off",
      "no-control-regex": "off",
      "@next/next/no-img-element": "off",
      "@next/next/no-page-custom-font": "off",
    },
  },
  {
    // Plain JS/.mjs scripts + load tests — node runtime (console/process/Buffer).
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-console": "off",
      "no-control-regex": "off",
    },
  },
  {
    // k6 load tests — k6 ke runtime globals (script ke andar define nahi hote).
    files: ["tests/load/**/*.js"],
    languageOptions: {
      globals: {
        __ENV: "readonly",
      },
    },
  },
];
