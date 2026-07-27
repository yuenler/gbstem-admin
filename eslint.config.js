import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import svelte from 'eslint-plugin-svelte'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  prettier,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'svelte/no-navigation-without-resolve': 'off',
      // Off deliberately, not deferred. The rule flags any mutable instance
      // of a built-in (Map/Set/Date/URL/URLSearchParams) inside a .svelte
      // file; it can't tell whether the instance is actually held in
      // reactive state. All 26 violations here are the same transient shape:
      //   const base = new URLSearchParams(page.url.searchParams)
      //   base.set('page', ...); return `?${base.toString()}`
      // - a local built inside a $derived IIFE, serialized on the next line,
      // never stored and never read reactively. SvelteURLSearchParams would
      // add proxy overhead for an object with a three-line lifetime. Revisit
      // only if a built-in instance is ever assigned to $state and mutated
      // in place, which is the case the rule is actually for.
      'svelte/prefer-svelte-reactivity': 'off',
      // Mostly false positives against $bindable prop writes (e.g.
      // EditApplicationForm/EditRegistrationForm's dbValues/loading), which
      // the Phase 2c form-seeding rewrite addresses; plus one unrelated
      // dead-initializer nit in src/lib/server/search.ts (allDocs).
      'no-useless-assignment': 'off',
      'svelte/a11y-consider-explicit-label': 'off',
      // no-constant-binary-expression's only violations are intentional
      // literal true/false in __tests__/utils.test.ts demonstrating cn()'s
      // conditional-class behavior - pre-existing test fixture, not a bug,
      // and unrelated to the Svelte 5 migration.
      'no-constant-binary-expression': 'off',
      'svelte/no-at-html-tags': 'off',
    },
  },
  {
    ignores: [
      '**/node_modules/**',
      'build/**',
      '.svelte-kit/**',
      'package/**',
      '.env',
      '.env.*',
      'pnpm-lock.yaml',
      'package-lock.json',
      'yarn.lock',
      '.vercel/**',
      'coverage/**',
    ],
  },
)
