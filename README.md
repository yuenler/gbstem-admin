#

## Setup

Once you've installed dependencies with `npm install`, start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Changes

```bash
git checkout -B branch_name
```

The `branch_name` should be concise but descriptive. E.g., if making a page for profile settings, a possible branch name is `profile_settings`.

After finishing a feature, create a pull request. Never commit directly to the main branch.

## Major Dependency Upgrades (TODO)

Below is a list of major dependency updates that were skipped during the dependency cleanup because they require manual migrations, configuration updates, or code changes.

| Package | Current Version | Available Version | Migration Impact & Upgrade Guide |
| :--- | :--- | :--- | :--- |
| `vite` | `^7.3.3` | `^8.0.14` | **Rolldown Compiler:** Vite 8 replaces Rollup and esbuild with a unified Rust-based compiler (**Rolldown**), and uses **Oxc** instead of esbuild. Requires Node.js 20.19+. Follow the [Vite 8 Migration Guide](https://vite.dev/guide/migration) and verify plugin compatibility. |
| `tailwindcss` | `^3.4.19` | `^4.3.0` | **CSS-First Configuration:** Tailwind CSS v4 is a ground-up rewrite that replaces `tailwind.config.js` with `@theme` design tokens in CSS. Drops PostCSS by default and automatically detects source files. Run `npx @tailwindcss/upgrade@latest` to automate the migration. |
| `typescript` | `^5.9.3` | `^6.0.3` | **Strict Defaults & Type Scoping:** `strict` now defaults to `true`. `types` now defaults to `[]` (no longer auto-includes all types from `node_modules/@types`). Namespaces are unsupported. Declare global types explicitly in `tsconfig.json` and resolve type-check errors. |
| `eslint` | `^8.57.1` | `^10.4.0` | **Flat Config Mandatory:** Completely removes support for legacy `.eslintrc.cjs` and `.eslintignore`. Config must be rewritten to `eslint.config.js` or `eslint.config.mjs` format. Run `npx @eslint/migrate-config .eslintrc.cjs` as a starting point. |
| `@typescript-eslint/*` | `^6.21.0` | `^8.60.0` | **ESLint v9/10 Compatibility:** Deprecates and renames multiple rules. RuleTester defaults to Flat Config options. Upgrade in tandem with ESLint. |
| `eslint-config-prettier` | `^8.10.2` | `^10.1.8` | **ESLint v9/10 Compatibility:** Upgrade in tandem with ESLint Flat Config migration. |
| `eslint-plugin-svelte` | `^2.46.1` | `^3.18.0` | **ESLint v9/10 Compatibility:** Upgrade in tandem with ESLint Flat Config migration. |
| `@sveltejs/adapter-vercel` | `^5.10.3` | `^6.3.3` | **Node Polyfill Removal:** Drops support for Node 18 (requires 20+). Node polyfills are removed. Deprecates `RequestContext` in favor of `@vercel/functions`. |
| `algoliasearch` | `^4.27.0` | `^5.52.1` | **API Redesign:** Removes `client.initIndex()` pattern. Methods must be called directly on `client` with an `indexName` parameter. Imports are now named exports (`import { algoliasearch }`). Refactor operations waiting on task IDs. |
| `date-fns` | `^2.30.0` | `^4.3.0` | **Named Exports Only:** Removes default exports (e.g. `import addDays from 'date-fns/addDays'`). Code must be refactored to use named exports (e.g. `import { addDays } from 'date-fns'`). |
| `firebase` | `^10.14.1` | `^12.14.0` | **SDK Version Upgrade:** Verify all clientside SDK method calls and typescript signatures. |
| `firebase-admin` | `^11.11.1` | `^13.10.0` | **FCM Deprecations:** Deprecates `sendAll` in favor of `sendEach`. Upgrades internal dependencies (like `jose`) which can break Jest mocking. Refactor messaging calls and check tests. |
| `nanoid` | `^4.0.2` | `^5.1.11` | **Async API Removed:** Asynchronous `nanoid()` is removed since the Web Crypto API is synchronous. Verify the codebase does not use `await nanoid()`. |
| `prettier-plugin-svelte` | `^3.5.2` | `^4.0.1` | **Svelte 5 Support & Format Changes:** Removes options like `svelteBracketNewLine` and `svelteStrictMode`. Upgrading will change formatting style for Svelte elements, resulting in widespread git diffs. |
| `svelte-check` | `^3.8.6` | `^4.4.8` | **TS Peer Dependency:** Moves TypeScript to a peer dependency. Outputs ESM. |
| `tailwind-merge` | `^1.14.0` | `^3.6.0` | **Tailwind CSS v4 Compatibility:** v3 drops support for Tailwind CSS v3. Do not upgrade until Tailwind CSS v4 is adopted. |

