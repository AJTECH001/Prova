// Flat ESLint config for the Prova monorepo (ESLint v9+/v10).
// Packages run `eslint src/` from their own dir; ESLint walks up to this root config.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  // Ignore generated / build / vendored output across all packages.
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.vercel/**',
      '**/out/**',
      '**/coverage/**',
      'contracts/artifacts/**',
      'contracts/cache/**',
      'contracts/typechain-types/**',
      'contracts/fhe-assistant/**',
      'app/src/generated/**',
      '**/next-env.d.ts',
      '**/*.config.{js,cjs,mjs,ts}',
      '**/*.tsbuildinfo',
    ],
  },

  // Baseline JS + TypeScript recommended rules for all source files.
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Project-wide language options.
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      // Allow intentionally-unused args/vars when prefixed with `_`.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Pre-existing `any` usage is tracked as debt (warning), not a hard failure.
      // Tighten back to 'error' once the codebase is cleaned up.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Standalone Node scripts and ESM tooling files use Node globals.
  {
    files: ['**/*.mjs', '**/*.cjs', '**/scripts/**/*.{ts,js,mjs}'],
    languageOptions: { globals: { ...globals.node } },
  },

  // Backend: Node runtime globals.
  {
    files: ['backend/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },

  // App: browser globals + React hooks rules.
  {
    files: ['app/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },

  // Contracts tooling (Hardhat scripts) run on Node.
  {
    files: ['contracts/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },

  // Test files: relax rules that fight common test patterns.
  {
    files: ['**/__tests__/**', '**/*.test.{ts,tsx}', '**/test-setup.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
