# DistributionOS QA Checklist

## Purpose

This checklist defines the minimum QA gate for DistributionOS v0.1 changes.

Run it before updating `PROJECT_MEMORY.md`.

## Required Command

```bash
npm run verify
```

`npm run verify` must run:

- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `pytest`
- `npm run build`

## Auth Routes

- [ ] `/login` renders for unauthenticated users.
- [ ] `/signup` renders for unauthenticated users.
- [ ] Login uses Supabase email/password auth.
- [ ] Signup uses Supabase email/password auth.
- [ ] Logout clears the Supabase session and returns the user to `/login`.
- [ ] Protected routes redirect unauthenticated users to `/login`.

## Project CRUD Routes

- [ ] `/` dashboard loads only for authenticated users.
- [ ] `/projects` lists saved Supabase projects.
- [ ] `/projects/new` creates a Supabase project.
- [ ] `/projects/[id]` loads a single owned project.
- [ ] `/projects/[id]` updates an owned project.
- [ ] `/projects/[id]` deletes an owned project.
- [ ] Empty project state is visible when no projects exist.
- [ ] Project errors are shown in the UI.

## Product Memory Route

- [ ] `/projects/[id]/memory` loads only for authenticated users.
- [ ] Product memory can be created for an owned project.
- [ ] Product memory can be updated for an owned project.
- [ ] Empty state appears when no product memory exists.
- [ ] Loading state exists for the route.
- [ ] Save success confirmation appears after save.
- [ ] Error state appears when loading or saving fails.

## Secrets

- [ ] No API keys are committed.
- [ ] No Supabase service-role key is exposed to frontend code.
- [ ] No database password is committed.
- [ ] No real session token or cookie is committed.
- [ ] `.env` and `.env.*` files remain ignored except `.env.example`.

## Environment Variables

- [ ] Root `.env.example` documents required public frontend variables.
- [ ] `apps/web/.env.example` documents required Supabase frontend variables.
- [ ] Backend `.env.example` documents backend placeholders.
- [ ] Placeholder values are clearly non-secret examples.

## Migrations

- [ ] Database migrations live in `database/migrations`.
- [ ] `0001_create_projects.sql` documents the projects table and RLS.
- [ ] `0002_create_product_memory.sql` documents the product memory table and RLS.
- [ ] New persistence features include migration SQL before UI is considered complete.

## Explicit Non-Goals

The QA gate should fail scope review if a chunk adds any of these without explicit approval:

- AI agents
- RAG
- OpenAI integration
- content generation
- publishing
- analytics automation
- external integrations
- CareerScore automation
