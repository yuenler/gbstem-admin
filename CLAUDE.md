@AGENTS.md

# Codebase Conventions for AI Assistants

This supplements [README.md](README.md) (architecture, setup, Firestore semester schema) with code-level conventions the README doesn't cover. Read the README first.

## Tightly coupled with `../portal`

Admin and portal share the **same Firestore database and Firebase project**, the same `firestore.rules` (merged by hand for production deploys — see README), and each keeps its own copy of `src/lib/data/collections.ts`, `semesterDates.json`, and the course-catalog JSON (`springCourses.json`/`fallCourses.json`) that must be updated **in both repos together** during a semester rollover (see README's "Adding a New Semester"). If you change a collection path, a security rule, or the `Data` type namespace here, check whether `../portal` needs the identical change.

## Route groups are auth gates, not just folders

- `(signedIn)/+layout.server.ts` redirects to `/signin` if `locals.user === null`.
- `(signedIn)/(emailVerified)/+layout.server.ts` additionally redirects to `/profile` if the email isn't verified.
- `locals.user` is populated in `src/hooks.server.ts` from the `__session` cookie via `adminAuth.verifySessionCookie`; only `admin`/`reviewer` custom-claim roles are accepted — everyone else is redirected to `portal.gbstem.org`.
- **New protected page → put it under `src/routes/(signedIn)/(emailVerified)/<name>/+page.svelte`.** Don't add manual auth checks; the layout hierarchy already gates it.

## Written in Svelte 4 idiom, despite the Svelte 5 dependency

`package.json` pins `svelte@^5`, but the codebase uses **zero runes** (`$state`/`$derived`/`$effect`/`$props`) anywhere. Match the existing style: `export let prop`, top-level `$:` reactive statements, `<slot />`, and `svelte/store` (`writable`, see `src/lib/stores.ts`) for shared state. Don't introduce runes in new components — it would make the codebase inconsistent.

## Forms: SPA Superforms, not server actions

Nearly every form writes directly to Firestore client-side; only `(signedOut)/signup` uses a real SvelteKit form `action`. The pattern (see `EditClassForm.svelte`):

```js
superForm(defaults(initialValues, zod(schema)), {
  SPA: true, validators: zod(schema), resetForm: false, applyAction: false,
  async onUpdate({ form }) { /* setDoc(...) then alert.trigger(...) on failure */ }
})
```

Schemas live in `src/lib/components/forms/schemas.ts` (also reused by `scripts/seed.ts`). Field wrapper components (`FormInput`, `FormNativeSelect`, `FormCheckbox`) take `form`, `name`, `label`, `bind:value`.

## The semester-derivation rule (a real bug we've hit before)

`src/lib/data/collections.ts` exports both static current-semester collection constants (`decisionsCollection`, `applicationsCollection`, ...) **and** `semesterCollectionPath(semesterId, name)` / `semesterIdFromPath(path)` / `withSemester(values, semesterId?)`. Admins can browse a past semester's applications/registrations via `?semester=`. **Any component that receives a semester-scoped `collection` path as a prop must derive the semester it writes to from that prop — never from a static current-semester constant** — or writes silently land in the wrong semester (or, if the same uid also has a current-semester document, overwrite unrelated data with no error surfaced). Follow the pattern already used in `EditApplicationForm.svelte`/`EditRegistrationForm.svelte`: `semesterIdFromPath(collection) ?? currentSemester`.

## Firestore access

- `src/lib/client/firebase.ts` → client SDK, used in `.svelte` components/forms, gated by `firestore.rules`.
- `src/lib/server/firebase.ts` → Admin SDK, used only in `hooks.server.ts` and `src/routes/api/*/+server.ts`.
- API routes: guard with `verifyAdmin(locals)` / `verifyAuthenticated(locals)` and wrap the body in `try { ... } catch (err) { throw handleApiError(err) }` (both from `src/lib/server/apiHelpers.ts`).

## Types

Domain types live in `src/lib/data/types/` plus a global ambient `Data` namespace in `src/data.d.ts` (e.g. `Data.User.Peek`, `Data.Role`) — usable unimported anywhere. `tsconfig.json` sets `strict: true` and `verbatimModuleSyntax: true`, so type-only imports must use `import type`.

## Error handling

Client-side: the `alert` store (`src/lib/stores.ts`) drives toast UI — `alert.trigger('error', err.code ?? err.message, true)`. Server-side: `handleError` in `hooks.server.ts` logs non-404s; API routes use `handleApiError`.

## Testing

Jest, one `<module>.test.ts` per `src/lib` module under `__tests__/`. `firebase-admin`/Firestore calls are mocked with hand-rolled `DocumentReference`/`Query`/`CollectionReference` classes (see `firebase.test.ts`) — no emulator needed for unit tests. `collections.test.ts` asserts against `currentSemester` via a `^(Spring|Fall)\d\d$` regex rather than a hardcoded string, so it survives semester rollovers unedited; keep that pattern for new semester-aware tests.
