# DistributionOS Agent Instructions

## Mission

DistributionOS grows CareerScore through analysis, execution, and measurement.

The product should help turn product memory, project context, market insight, and measured outcomes into better growth decisions and repeatable distribution execution.

## Mandatory Workflow

Before making any change:

1. Read `PROJECT_MEMORY.md`.
2. Read any task-specific architecture or roadmap file named by the user.
3. Confirm the current phase and explicit exclusions.
4. Make one scoped change at a time.
5. Keep the diff minimal.

After making a change:

1. Run the required verification commands.
2. Fix every discovered issue.
3. Update `PROJECT_MEMORY.md` only after verified success.
4. Summarize what changed and what was verified.

## One Task At A Time

Do exactly the task requested.

Do not expand scope into adjacent features, cleanup, refactors, or product ideas unless the user explicitly asks.

## Minimal Diff Rule

Prefer the smallest working change.

Do not rewrite files, move folders, rename concepts, or introduce abstractions unless required for the current task.

## Security Rules

- Never commit secrets.
- Never hardcode API keys, database passwords, tokens, session cookies, private URLs, or service-role credentials.
- Use `.env.example` for placeholder variables only.
- Do not log secrets.
- Do not expose Supabase service-role keys to the frontend.

## External Action Rules

Do not post, email, publish, scrape, message, upload, or trigger external outreach without explicit user approval.

Planning and drafting are allowed. External execution requires approval.

## Required Verification

Every implementation task must run:

```bash
npm run format
npm run lint
npm run typecheck
cd backend && .\.venv\Scripts\python.exe -m pytest
npm run build
```

If a command fails, fix the cause and rerun the relevant command.

## Project Memory Rule

Update `PROJECT_MEMORY.md` only after all required verification passes.

Do not update project memory for failed or partial work unless the user asks for a status record.

## QA Agent Rules

When acting as a QA agent:

- Prioritize correctness, regressions, security, data loss risk, auth boundaries, and broken user flows.
- Check whether the implementation violates explicit exclusions.
- Verify RLS, route protection, environment handling, and form validation when relevant.
- Prefer concrete file and line references.
- Separate blockers from minor polish.
- Do not rewrite the implementation unless asked.

## Hallucination Control

Separate:

- Facts: directly observed in files, command output, or user instructions.
- Assumptions: reasonable but unverified inferences.
- Sources: files, command outputs, or cited docs used.
- Confidence: high, medium, or low.

Do not invent product facts, customer details, metrics, competitors, pricing, or strategy.

CareerScore-specific facts must come from user input, saved product memory, or explicitly cited sources.

## Self-Healing Rules

Retry safe failures when the cause is clear.

Safe retries include:

- rerunning formatters
- rerunning lint/typecheck/tests/build
- retrying installs after dependency resolution fixes
- restarting local dev servers

Do not self-heal by:

- auto-editing production code outside the current task
- weakening tests
- disabling lint rules
- removing validation
- bypassing auth
- relaxing RLS
- forcing destructive git commands
- deleting user data

Never auto-edit production behavior to hide a failure. Fix the root cause or report the blocker.

## Current Build Order

Current DistributionOS v0.1 build order:

1. Project operating system files
2. MVP architecture
3. Production-grade skeleton
4. Dashboard UI skeleton
5. Supabase authentication
6. Project CRUD persistence
7. Product Memory module
8. Campaign planning module
9. Experiment tracking module
10. Manual measurement module
11. Reporting summaries
12. Only then consider AI, RAG, agents, or automation

## Current Explicit Exclusions

Do not build unless explicitly requested:

- AI agents
- RAG
- OpenAI integration
- content generation
- publishing
- analytics automation
- external integrations
- CareerScore automation
- CRM
- multi-tenant architecture
- billing
- workflow engines
