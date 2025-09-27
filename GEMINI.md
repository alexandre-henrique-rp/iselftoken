## Project Overview

This is a Next.js project that serves as a web application to connect investors and startups. It is built with a modern tech stack, including:

*   **Framework:** Next.js 15.4.6 (with App Router)
*   **Language:** TypeScript 5
*   **UI:** React 19.1.0, Tailwind CSS 4, and Radix UI
*   **Forms:** react-hook-form and zod for validation
*   **Internationalization:** next-intl
*   **Testing:** Jest and React Testing Library

The project follows Clean Architecture, Clean Code, and SOLID principles.

## Building and Running

### Development

To run the development server, use:

```bash
npm run dev
```

### Build

To create a production build, use:

```bash
npm run build
```

### Start

To start the production server, use:

```bash
npm run start
```

### Test

To run the tests, use:

```bash
npm run test
```

### Lint

To lint the code, use:

```bash
npm run lint
```

## Development Conventions

*   **Code Style:** The project uses ESLint and Prettier to enforce a consistent code style. The configuration can be found in `eslint.config.mjs` and `.prettierrc.json`.
*   **Type Safety:** The project uses TypeScript with strict mode enabled.
*   **Path Aliases:** The project uses the `@/*` alias to refer to the `src` directory.
*   **Commits:** While not explicitly stated, it is recommended to use conventional commits to maintain a clear and consistent commit history.
