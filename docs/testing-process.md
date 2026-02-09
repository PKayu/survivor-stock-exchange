# Testing Process (Lightweight)

This repository uses Vitest for unit and component tests.
Use this doc to keep testing consistent and visible.

## When tests are expected
- New area = new route (`app/**/page.tsx`), API route (`app/api/**/route.ts`), new lib module (`lib/*.ts`), or a new feature component folder.
- Expectation: add tests that cover the new behavior.
- If you skip tests, add a short rationale and a follow-up note in the PR/commit message.

## Minimal expectations by area
- Utilities/business logic: happy path + one edge case.
- API routes: validate inputs + auth checks + error path (or manual checklist until tests exist).
- UI surfaces: verify key states (loading, empty, error, success) or document manual steps.

## Agent workflow (use this order)
1. Identify behavior added/changed.
2. Add or update tests for that behavior.
3. Run lint/build/tests as available.
4. Report what was validated (automated or manual).

## Manual verification checklist (until tests exist)
- Open the affected page/route in dev mode.
- Trigger primary flow and confirm expected UI or response.
- Confirm edge case behavior (empty state, invalid input, error path).
- Note the steps in the PR/commit message.

## Test placement conventions (recommended)
- Co-locate tests near the code they cover.
- Example conventions (use whichever the repo adopts later):
  - `lib/foo.test.ts`
  - `app/api/some-route/route.test.ts`
  - `components/feature/feature.test.tsx`

## Single-test command (placeholder)
- Single test: `npm run test -- path/to/file.test.ts`
- Single run (CI/local): `npm run test:run`

## Example skip note (for PR/commit message)
- "Tests skipped: new admin page is static UI only; add Playwright smoke test after auth seed is available."
