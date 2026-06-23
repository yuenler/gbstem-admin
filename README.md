# gbSTEM Admin

<https://www.gbstem.org/>

## Description

> Inspiring the Next Generation of STEM Innovators

Greater Boston STEM Program's website for administering the portal. It serves as the administrative interface for managing applications, registrations, classes, and users.

This website is part of the gbSTEM ecosystem. **It is primarily maintained by a rotating group of High School and college students.** Because of this, maintaining clear, readable code and robust documentation is highly prioritized.

## Frameworks and Libraries

This project relies on several key modern web technologies:

- **[SvelteKit](https://kit.svelte.dev/)**: The core Svelte framework used for building the site. We use SvelteKit's filesystem-based routing, server hooks, and server-side loading logic.
- **[Svelte](https://svelte.dev/)**: The reactive component framework (using Svelte 5 runes) for building lightweight, highly responsive user interfaces.
- **[TypeScript](https://www.typescriptlang.org/)**: A strongly typed programming language that builds on JavaScript, giving you better tooling and strict type-checking at any scale.
- **[Tailwind CSS](https://tailwindcss.com/)**: A utility-first CSS framework packed with classes that can be composed to build any design, directly in your markup.
- **[Firebase](https://firebase.google.com/)**: Client-side SDK used for interacting with the database (Cloud Firestore) and Firebase Authentication.
- **[Firebase Admin SDK](https://firebase.google.com/docs/admin)**: Node.js SDK used for server-side management tasks, backend hooks, and admin-level database operations.
- **[Algolia Search](https://www.algolia.com/)**: Integrated search client (`algoliasearch`) used for indexing and searching portal entries efficiently.
- **[SendGrid](https://sendgrid.com/)**: Transactional email service used to send system notifications, confirmations, and reminders.
- **[Jest](https://jestjs.io/) & [Svelte Testing Tools](https://testing-library.com/)**: Our primary testing suite. We use Jest to write unit tests for utility functions and helper files.
- **[SvelteKit Superforms](https://superforms.rocks/)**: Form state management library for SvelteKit, used to handle form loading states, bindings, validation, and progressive enhancement.
- **[Zod](https://zod.dev/)**: A schema declaration and validation library, used to declare form schemas and validate client/server payloads.
- **[Formsnap](https://formsnap.dev/)**: Accessible, accessible-first form builder library for Svelte, integrating SvelteKit-Superforms validation with shadcn/bits-ui components.
- **[Bits UI](https://bits-ui.com/)**: A headless component library for Svelte providing accessible, unstyled components that serve as the foundation for Formsnap and shadcn components.

## Getting Started with Development

### 1. Environment Configuration

Before running the development server, you must configure your local environment variables:

1. Copy the `.env.example` file to create a `.env.local` file:

   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and adjust the placeholder values with your actual service credentials, preferably development credentials if available.

> [!WARNING]
> **Never commit your `.env.local` file or actual secrets to GitHub.** This file is configured to be ignored by Git to prevent exposing sensitive API keys and credentials. For details on how `.env` files work and how to avoid exposing credentials, read the [dotenv environment secrets guide](https://github.com/motdotla/dotenv#should-i-commit-my-env-file) and [GitHub's guide on ignoring files](https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files).

### 2. Firebase Emulator Suite (Local Development)

For local development and testing, you can use the **Firebase Emulator Suite** to run local instances of Firebase products (Firestore, Authentication, and Storage). This allows you to test application features offline without affecting production or development cloud resources.

1. Follow the official [Firebase Emulator Suite: Connect and Prototype](https://firebase.google.com/docs/emulator-suite/connect_and_prototype?database=Firestore) guide to set up and run the emulators on your local machine.
2. Update your `.env.local` file to point to the local emulators by uncommenting the relevant lines at the bottom of the file (see snippet below). The Firebase Admin SDK automatically routes operations to the emulators when the following environment variables are set:

   ```env
   FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
   FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
   STORAGE_EMULATOR_HOST="127.0.0.1:9199"
   ```

   Make sure the host and port values match your emulator configurations in `firebase.json`.

3. For new emulator instances, run `npm run seed` to seed the database with a demo admin user and a demo signup token.
   - Email: <demo@gbstem.org>
   - Password: `penguin`
   - Signup Token: `demo-token`

> [!WARNING]
> By default, the Firestore emulator runs in-memory. This means all seeded data and modifications are lost whenever you restart the emulator. If you want to persist the database state across restarts, start the emulator with the `--import` and `--export-on-exit` flags:
>
> ```bash
> firebase emulators:start --log-verbosity=quiet --import=./emulator-data --export-on-exit
> ```
>
> Otherwise, you must re-run the seed script every time you restart the emulator.

### 3. Run the Development Server

```bash
# install dependencies
npm install

# run the development server
npm run dev

# start the development server and open in browser
npm start

# preview the production build locally
npm run preview

# automatically format code
npm run format

# check for type errors
npm run check

# check for type errors and watch for changes
npm run check:watch

# check for style and lint issues
npm run lint

# run unit tests
npm test

# build for production
npm run build

# build and deploy to Firebase
npm run deploy
```

Open [http://localhost:5173](http://localhost:5173) with your browser to see the result for `npm run dev` or `npm start`. You can start editing any page or component, and when running in development mode, your changes will be reflected in the browser automatically.

## Adding a New Semester

To transition the gbSTEM system to a new semester (e.g., from `Spring26` to `Fall26`), you must update the configuration in both the admin and portal codebases and configure the Algolia search extension in Firebase.

### 1. Update the Semester List

In the admin repository, update [collectionsList.json](src/lib/data/collectionsList.json). Add the new semester configuration to the **top** of the array so it is selected by default in the admin dashboard:

```json
[
  {
    "id": "Fall26",
    "name": "Fall 2026"
  },
  ...
]
```

### 2. Update Codebase Suffixes and Courses

To ensure both applications write to and read from the new semester's Firestore collections, update the suffix variables and course catalogs:

- **Admin Repository:**
  - Update the `suffix` constant at the top of [`src/lib/data/collections.ts`](src/lib/data/collections.ts) (e.g., `const suffix = 'Fall26'`).
  - Review and update course catalog data in [springCourses.json](src/lib/data/springCourses.json) or [fallCourses.json](src/lib/data/fallCourses.json) under [`src/lib/data/`](src/lib/data/).
- **Portal Repository:**
  - Update the `suffix` constant at the top of portal [`src/lib/data/collections.ts`](https://github.com/gbstem/portal/blob/main/src/lib/data/collections.ts) (e.g., `const suffix = 'Fall26'`).
  - Copy the updated `springCourses.json` or `fallCourses.json` catalog file directly from the admin repository (`admin/src/lib/data/`) to the portal repository (`portal/src/lib/data/`).

### 3. Configure Algolia Search Indexing

gbSTEM uses the free tier of [Algolia Search](https://www.algolia.com/pricing/) for performant admin website text queries. This relies on the [Search Firestore with Algolia](https://extensions.dev/extensions/algolia/firestore-algolia-search) Firebase extension to automatically sync Firestore records.

Because our database uses separate Firestore collections per semester (e.g., `registrationsFall26`), you must create a new Algolia extension instance for the new semester's collections:

1. View existing extension instances on the [Firebase Console Extensions List page](https://console.firebase.google.com/project/gbstem-core/extensions).
2. Click the **Manage** button on the existing instances to see their configured **Collection Path** values. This will tell you which collections (like `registrationsSpring26` or `applicationsSpring26`) are currently indexed.
3. Install new instances of the Algolia extension pointing to the corresponding collections of the new semester (e.g., `registrationsFall26`).

> [!WARNING]
> While the codebase automatically falls back to in-memory local searches with caching if Algolia is unreachable or unconfigured, doing so retrieves all documents in a collection. This can significantly increase Firestore read operations and lead to higher billing charges under our Firebase Blaze plan if the database grows.

### 4. Firestore Security Rules

> [!NOTE]
> Previously, you had to manually edit [firestore.rules](firestore.rules) for every new semester and upload them to the [Firestore console rules page](https://console.firebase.google.com/project/gbstem-core/firestore/databases/-default-/security/rules).
>
> We now use regular expressions like `(Spring|Fall)\d+` in our rules (e.g. `colId.matches('classes(Spring|Fall)\\d+')`). You only need to manually update and upload the security rules if you use a custom semester ID name format that does not match this regex pattern.

## Updating Dependencies

It is important to periodically update the project's dependencies to address security vulnerabilities, receive bug fixes, improve performance, and keep up with the latest features. Since this project is maintained by a rotating group of students, regular updates prevent the codebase from falling behind or becoming incompatible with modern deployment platforms.

We use the [npm-check-updates (ncu)](https://github.com/raineorshine/npm-check-updates) tool to check for and apply updates. Refer to the [installation instructions](https://github.com/raineorshine/npm-check-updates#installation) to install it.

Once `ncu` is installed, follow this sequence of commands to update dependencies:

> [!IMPORTANT]
> **Pin Zod to version 3 (`^3.x.x`)**: We currently restrict Zod to v3 because SvelteKit Superforms and Formsnap adapters have known type resolution and shape-generation compatibility issues with Zod v4 (refer to the public discussion at [ciscoheat/sveltekit-superforms #630](https://github.com/ciscoheat/sveltekit-superforms/issues/630)). When executing `ncu -u`, ensure Zod is not upgraded to v4 which the commands below avoid, or manually revert its version in `package.json` before installing.

```bash
# Update the dependencies in package.json to the latest versions (minor/patch)
ncu -t minor -u zod
ncu --peer --reject zod -u

# Install the updated packages and update package-lock.json
npm install

# Run unit tests to verify no breaking changes were introduced
npm test

# Run type checks
npm run check

# Run lint checks to ensure code style consistency
npm run lint

# Go to http://localhost:5173 and do manual visual checks and tests

# Build the project for production to verify compatibility and compile-time checks
npm run build
```

After verifying that the tests, linting, and build pass successfully, commit and submit both `package.json` and `package-lock.json` to the repository.

## Directory and File Index

Below is an alphabetical list of the top-level directories and significant configuration files to help you navigate the codebase:

### Directories

- **`.husky/`**: Configuration for Husky, managing Git hooks like pre-commit formatting and linting.
- **`.svelte-kit/`**: Automatically generated directory containing SvelteKit configuration, generated routes, and typings.
- **`__tests__/`**: Contains all of our Jest unit tests (such as utility tests and form validation schema scenario tests).
- **`cypress/`**: Contains the Cypress e2e test suite, test configurations, fixtures, and page object/support configurations.
- **`node_modules/`**: Contains the project's dependencies.
- **`scripts/`**: Contains development and setup script utilities (such as the database seeding script `seed.ts`).
- **`src/`**: The core SvelteKit application source code.
- **`src/lib/`**: Reusable libraries, utility modules, and components:
  - **`src/lib/client/`**: Client-side specific integrations, such as clients for Firestore.
  - **`src/lib/components/`**: Reusable Svelte UI components (e.g. tables, buttons, and form components like `FormInput.svelte`).
    - **`src/lib/components/forms/`**: Sub-components containing form structures and validation logic (`schemas.ts`).
  - **`src/lib/data/`**: Centralized static data constants, models, mock data, and TS types.
  - **`src/lib/server/`**: Server-side specific integrations, such as initializing Firebase Admin.
- **`src/routes/`**: Handles application URL routing based on the filesystem. Subdirectories (like `applications/`, `registrations/`, `user/`) represent URL paths.
- **`static/`**: Static assets such as images and icons that can be accessed publicly by the browser.

### Files

- **`.env.example`**: Template file defining required local environment variables.
- **`.firebaserc`**: Firebase project configuration mapping aliases to Firebase project IDs.
- **`.gitignore`**: Specifies which files and directories Git should ignore (like `node_modules/` and `.svelte-kit/`).
- **`.prettierignore`**: Specifies which files and directories Prettier should ignore when formatting.
- **`cypress.config.ts`**: The configuration file for the Cypress e2e testing interface and environmental triggers.
- **`eslint.config.js`**: ESLint configuration mapping coding rules and checks (replacing the legacy `.eslintrc.cjs`).
- **`firebase.json`**: Defines local configurations for Firebase emulator environments and project builds.
- **`firestore.rules`**: Firebase security rules defining read/write permissions for the Cloud Firestore database. This is applied by the Firebase emulators for local testing, but needs to be manually pushed to production because it has to be merged with the `curriculum` repo version of this file in production (simple copy-and-paste).
- **`jest.config.ts`**: The configuration file for our Jest testing environment, specifically tailored to work alongside TypeScript and Svelte.
- **`jest.setup.ts`**: Initial setup code that runs before our Jest tests, importing tools like `@testing-library/jest-dom` for custom DOM matchers.
- **`package.json`**: Defines the project's details, scripts, and dependencies (the npm packages we rely on).
- **`package-lock.json`**: An automatically generated file that locks down the exact versions of dependencies used, ensuring that all developers have identical, reproducible environments.
- **`postcss.config.js`**: Configuration for PostCSS, typically used for transforming CSS with plugins.
- **`prettier.config.js`**: Configuration rules for Prettier, ensuring consistent code formatting across the project.
- **`svelte.config.js`**: SvelteKit-specific configuration (like adapter configurations and compiler options).
- **`TEST_PLAN.md`**: A comprehensive test plan outlining testing strategies, test scenarios, coverage, and instructions for running Jest and Cypress tests.
- **`tsconfig.json`**: Configuration settings for the TypeScript compiler.
- **`vite.config.js`**: Vite configuration file for compiling, bundling, and configuring build plugins.
