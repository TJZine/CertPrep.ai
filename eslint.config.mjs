import nextConfig from "eslint-config-next";
import tseslintPlugin from "@typescript-eslint/eslint-plugin";

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'out/**', 'build/**', 'coverage/**', 'playwright-report/**', 'test-results/**'] },

  ...nextConfig,
  {
    plugins: {
      "@typescript-eslint": tseslintPlugin,
    },
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": "warn",
      "react/jsx-no-target-blank": "error",
      "no-console": [
        "warn",
        {
          allow: ["warn", "error"],
        },
      ],
    },
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },
];

export default config;
