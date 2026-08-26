// Jest transformer for plain-ESM `.js` files under node_modules/svelte.
// Jest ignores node_modules for transformation by default, but the
// compiled output of jest-transform-svelte-module.cjs imports Svelte's
// runtime directly from `svelte/internal/client`, which ships as raw ESM
// (`export { ... } from '...'`) - Jest's CJS module loader can't parse
// that without this down-leveling step. Pairs with the
// `transformIgnorePatterns` override in jest.config.ts that lets this
// transform actually reach files under node_modules/svelte.
// @ts-check
// @ts-check
const ts = require('typescript')

/** @type {import('@jest/transform').Transformer} */
module.exports = {
  process(sourceText, sourcePath) {
    // TypeScript's transpileModule handles both .ts *and* plain .js ESM files
    // (e.g. svelte v5 internals) when allowJs + checkJs are set correctly.
    const result = ts.transpileModule(sourceText, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        // ES2022, not ES2020: Svelte 5's own reactivity sources subclass
        // built-ins (`class SvelteMap extends Map`) and use class fields,
        // which TypeScript's ES2020 class down-level emits as a `super`
        // reference Node rejects with "'super' keyword unexpected here".
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        experimentalDecorators: true,
        useDefineForClassFields: false,
        // Required to transpile third-party .js ESM files:
        allowJs: true,
        checkJs: false,
      },
      fileName: sourcePath,
    })
    return { code: result.outputText }
  },
}
