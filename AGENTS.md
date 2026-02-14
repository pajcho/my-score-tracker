# AGENTS

## Project
My Team Tracker is a Vite + React + TypeScript app for tracking game scores.

- **Package manager:** `npm`
- **Format/lint:** `npm run lint` (ESlint)
- **After every change:** run `npm run lint` to verify format and linting are ok.
- **Testing policy:** after each code change, write or update corresponding tests for the changed behavior.
- **Coverage gate:** test coverage must never be below `98%`.
- **Coverage check:** after changes, run coverage (`npm run test:coverage`) and ensure the threshold is satisfied.
- **Code language:** All comments, variable names, and function names must be in English.
- **Naming:** Use readable, meaningful names for variables and function parameters; avoid single-letter or cryptic abbreviations (e.g. prefer `payment` over `p`, `selectedMonthValue` over `sel`). Names should not be excessively long.

## Project Structure

| Folder | Purpose | Conventions |
| --- | --- | --- |
| [`src/components/`](src/components/README.md) | Reusable UI components and feature building blocks | [README](src/components/README.md) |
| [`src/hooks/`](src/hooks/README.md) | Custom React hooks | [README](src/hooks/README.md) |
| [`src/pages/`](src/pages/README.md) | Route-level page components | [README](src/pages/README.md) |
| [`src/routes/`](src/routes/README.md) | Route configuration | [README](src/routes/README.md) |
| [`src/lib/`](src/lib/README.md) | Shared utilities and data-access helpers | [README](src/lib/README.md) |
| [`src/integrations/`](src/integrations/README.md) | Third-party integrations | [README](src/integrations/README.md) |
| [`src/integrations/supabase/`](src/integrations/supabase/README.md) | Supabase client and types | [README](src/integrations/supabase/README.md) |
