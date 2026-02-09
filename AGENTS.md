# AGENTS.md
# Guidance for agentic coding in this repository.

## Project overview
- Stack: Next.js App Router + TypeScript + Tailwind + Prisma + NextAuth.
- UI: shadcn/ui components in `components/ui`.
- Database: PostgreSQL via Prisma.

## Commands
### Install
- `npm install`

### Development
- `npm run dev` (Next dev server)

### Build
- `npm run build`
- `npm run start` (production server)

### Lint
- `npm run lint`
- Single file: `npm run lint -- app/(player)/dashboard/page.tsx`
- Alternative: `npx eslint app/(player)/dashboard/page.tsx`

### Tests
- `npm run test` (watch mode)
- `npm run test:run` (single run)
- Single test: `npm run test -- path/to/file.test.ts`

## Testing expectations (soft policy)
- When creating a new area (new route, API route, lib module, or feature component folder), add tests that cover the new behavior.
- If tests are skipped, record a brief rationale plus a follow-up note in the PR/commit message.
- Until a test runner exists, document manual verification steps for the new area.
- See `docs/testing-process.md` for the lightweight workflow.

### Database (Prisma)
- `npm run db:push`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run db:studio`

## Cursor/Copilot rules
- None detected in `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md`.

## Code style (TypeScript + React)
### Language and typing
- TypeScript is used throughout; `strict` is currently false.
- Use explicit types for public functions, component props, and API inputs.
- Use `import type` for type-only imports.
- Prefer `type` aliases for simple shapes; use `interface` when extending.

### React / Next.js patterns
- App Router structure in `app/`.
- Server components are default; add `"use client"` at top when using hooks or browser APIs.
- API routes live in `app/api/**/route.ts` and use `NextResponse`.
- Server actions appear in colocated `actions.ts` files.

### Imports
- Prefer absolute imports via `@/` (see `tsconfig.json` paths).
- Import order is not strictly enforced; match surrounding file style.
- Group related imports logically when editing a file.

### Formatting
- Mixed semicolon usage exists; follow the file you are editing.
- Indentation is 2 spaces.
- Use double quotes for strings (current codebase convention).
- Use trailing commas in multiline objects/arrays when present nearby.
- Keep JSX props and className strings readable; break long lines as needed.

### Naming conventions
- Components: `PascalCase` (e.g., `WelcomeBanner`).
- Hooks/functions/vars: `camelCase`.
- Constants: `UPPER_SNAKE_CASE`.
- Files: `kebab-case.tsx` for components; `page.tsx`/`route.ts` for routes.
- Prisma models/fields: follow schema (camelCase for fields).

### Tailwind and UI
- Tailwind is primary styling system.
- Prefer utility classes + design tokens (CSS variables defined in theme).
- Reuse shadcn/ui primitives from `components/ui`.
- Use `cn` from `@/lib/utils` for className composition.
- Favor `cva` patterns (see `components/ui/button.tsx`).

### Error handling
- API routes wrap logic in `try/catch` and return `NextResponse.json` with status codes.
- Validate request bodies with Zod before DB work.
- Log unexpected errors with `console.error` and return `500`.

### Data access
- Use the shared Prisma client from `@/lib/prisma`.
- Prefer `select`/`include` for only the fields you need.
- Use `findUnique`, `findFirst`, `findMany`, `upsert` as shown in API routes.
- Keep DB logic close to the route/component that needs it unless shared.

### Auth
- Use `auth()` from `@/lib/auth`.
- Gate server routes and pages by checking `session?.user`.
- Redirect unauthenticated users with `redirect("/login")`.

### UI/UX conventions
- Use existing typography tokens (display/heading/body fonts).
- Prefer cards and badges for grouped content.
- Use status color patterns similar to existing pages (green/red for change).

## File-specific cues
- `app/layout.tsx` defines global fonts and structure.
- `lib/utils.ts` provides common formatting helpers.
- `components/ui/*` files follow shadcn/ui patterns; keep them consistent.

## Notes for agents
- Do not introduce a formatter unless requested.
- Keep edits minimal and consistent with local file style.
- Document new commands if you add scripts or tooling.
