# DistributionOS Project Memory

## Purpose

DistributionOS is an AI-powered growth and distribution platform.

Its first customer and proving ground is CareerScore.

The project exists to turn product context, customer knowledge, market research, AI agents, and execution workflows into a repeatable growth operating system.

## North Star

DistributionOS should answer this every week:

> What should we do to grow, why should we do it, what assets are needed, who owns it, how will we measure it, and what did we learn?

## Current Repository State

Status: Supabase auth and project persistence complete.

Current known facts:

- Workspace: `D:\Distribution_os`
- Frontend skeleton: `apps/web` using Next.js 15, TypeScript, and Tailwind CSS
- Dashboard MVP routes: `/`, `/projects`, `/projects/new`, `/projects/[id]`
- Dashboard data source: Supabase `projects` table
- Authentication: Supabase email/password
- Protected routes: `/`, `/projects`, `/projects/new`, `/projects/[id]`
- Backend skeleton: `backend` using FastAPI
- Database directory: includes `projects` table migration only
- Tests: backend health test only
- Infrastructure: Dockerfiles and local compose file only
- CI: GitHub Actions for frontend and backend quality gates
- First customer: CareerScore
- Primary goal: build a maintainable AI-assisted distribution platform
- Current phase: authenticated project CRUD MVP

## Supabase Auth and Project Persistence Notes

Created Supabase email/password authentication and real project persistence.

Included:

- `/login` page
- `/signup` page
- logout action in app navigation
- server-side route protection for dashboard and project pages
- Supabase browser client
- Supabase server client
- typed `projects` table contract
- `projects` table migration SQL
- row-level security policies scoped to authenticated project owners
- project create form backed by Supabase insert
- project list backed by Supabase select
- project detail page backed by Supabase select
- project edit form backed by Supabase update
- project delete action backed by Supabase delete
- dashboard metrics backed by saved projects
- loading, empty, and error states
- Supabase environment variable examples

Explicitly not included:

- AI
- RAG
- agents
- OpenAI integration
- analytics
- CareerScore automation
- broader database schema
- FastAPI project endpoints

Last auth and persistence verification:

- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `pytest`
- `npm run build`

## Dashboard MVP Notes

Created a mock-data frontend dashboard for DistributionOS v0.1.

Included:

- persistent app shell navigation
- `/` dashboard page
- `/projects` project list page
- `/projects/new` create project UI skeleton
- `/projects/[id]` project detail page
- local mock project data
- status badges
- responsive desktop/sidebar and mobile/top navigation

Explicitly not included:

- AI
- RAG
- agents
- OpenAI integration
- backend project routes
- database persistence
- business logic
- CareerScore-specific backend code

Last dashboard verification:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Phase 1 Skeleton Notes

Created skeleton only. The repository now has a working frontend and backend foundation.

Included:

- root npm workspace
- Next.js 15 frontend app
- TypeScript config
- Tailwind config
- frontend ESLint
- Prettier
- FastAPI backend app
- backend health route
- backend pytest health test
- backend Ruff, Black, and mypy config
- Dockerfile for frontend
- Dockerfile for backend
- local Docker Compose file
- GitHub Actions CI
- environment examples
- documentation placeholders

Explicitly not included:

- AI agents
- RAG
- OpenAI integration
- business logic
- database schema
- CareerScore-specific application code
- CRM
- multi-tenant architecture
- workflow engine

Last verified:

- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `black --check .`
- `ruff check . --no-cache`
- `mypy app`
- `pytest`

## Product Definition

DistributionOS is a platform for planning, executing, tracking, and improving growth and distribution work.

It should support:

- Customer and product memory
- Positioning and ICP modeling
- Market and competitor research
- Campaign planning
- Channel strategy
- Content generation
- Outreach planning
- Experiment tracking
- Analytics and learnings
- AI-assisted execution
- Human approval gates

DistributionOS is not just a content generator. It is a system of record and execution layer for growth.

## First Customer: CareerScore

CareerScore is the first real customer context.

CareerScore should be used to validate:

- Whether the memory system captures useful business context
- Whether agents can turn that context into practical growth actions
- Whether campaigns and experiments can be planned consistently
- Whether weekly growth execution improves over time

CareerScore-specific work belongs in customer/domain memory, not in core platform assumptions.

## Operating Principles

### Solo Founder Execution

The system must be small enough for one person to understand, operate, and evolve.

Prefer:

- fewer moving parts
- boring infrastructure
- explicit workflows
- strong conventions
- practical automation

Avoid:

- premature microservices
- complex orchestration
- agent autonomy without logs
- over-abstracted platform code

### AI-Assisted Development

The repository should be optimized for AI agents to help without losing project coherence.

This means:

- clear memory files
- explicit architecture decisions
- small task documents
- stable naming
- low ambiguity
- strong separation between generic platform logic and customer-specific context

### Token Efficiency

Memory should be concise and structured.

AI agents should be able to retrieve the right context quickly without reading the entire repository.

Preferred pattern:

```text
Purpose
Current State
Key Decisions
Open Questions
Next Actions
```

### Maintainability

DistributionOS should be built as a modular monorepo with clear ownership boundaries.

Every major concept should have one obvious home.

## Project Memory Map

Canonical operating files:

- `PROJECT_MEMORY.md`: durable project context
- `ARCHITECTURE.md`: system design and technical direction
- `ROADMAP.md`: phased product roadmap and milestones
- `TASKS.md`: execution backlog

Future memory folders:

```text
memory/
  company/
  product/
  architecture/
  decisions/
  agents/
  roadmap/
  customers/
  experiments/
```

## Recommended Future Folder Structure

```text
Distribution_os/
  apps/
    web/
    api/
    worker/
    agent-console/

  packages/
    core/
    database/
    auth/
    integrations/
    agents/
    workflows/
    analytics/
    ui/
    config/

  domains/
    careerscore/
      memory/
      workflows/
      campaigns/
      experiments/
      assets/
      docs/

  memory/
    company/
    product/
    architecture/
    decisions/
    agents/
    roadmap/
    customers/
    experiments/

  docs/
    product/
    engineering/
    operations/
    security/
    deployment/

  infra/
    docker/
    terraform/
    railway/
    vercel/
    supabase/
    github-actions/

  scripts/
    setup/
    maintenance/
    data/
    evaluation/

  tests/
    unit/
    integration/
    e2e/
    agents/
```

## Key Decisions

### Decision 1: Start File-First

The project starts with markdown operating files before application code.

Reason:

- faster iteration
- lower complexity
- easier AI collaboration
- clearer product thinking before implementation

### Decision 2: CareerScore Is a Domain Pack

CareerScore should be modeled as the first domain/customer pack.

Reusable platform logic belongs in shared packages. CareerScore-specific memory, workflows, campaigns, and experiments belong under a CareerScore domain.

### Decision 3: Agents Must Be Auditable

Agents should produce logs, inputs, outputs, decisions, and reviewable artifacts.

No external action should happen without approval until the platform has strong reliability and safety controls.

### Decision 4: Postgres Is the Source of Truth

The first production database should be Postgres.

Vector search can be added with `pgvector` when semantic memory retrieval is needed.

### Decision 5: Manual Before Automated

DistributionOS should first make growth execution clear and repeatable manually. Automation should come after workflows prove useful.

## Product Surfaces

Initial product surfaces:

- Internal founder dashboard
- Customer memory view
- Campaign planner
- Experiment tracker
- Agent run log
- Weekly growth review

Later product surfaces:

- Multi-customer workspace dashboard
- Channel-specific workflow screens
- Integration management
- Approval inbox
- Analytics cockpit

## Agent Memory Rules

Agents should:

- read project memory before major work
- cite the files they used when useful
- update memory after meaningful decisions
- keep customer context separate from platform context
- log assumptions
- avoid unsupported claims

Agents should not:

- silently overwrite durable decisions
- execute external campaigns without approval
- mix customer-specific logic into core architecture
- create large opaque outputs where structured artifacts would work better

## Open Questions

- What is CareerScore's exact product positioning?
- Who is CareerScore's primary ICP?
- Which growth channels matter first?
- What are CareerScore's current acquisition metrics?
- Should the MVP use Clerk or Supabase Auth?
- Should background workflows use Trigger.dev, Inngest, or a simple queue first?
- Should the first UI be a full app or an internal admin console?

## Immediate Next Actions

1. Finalize CareerScore customer memory.
2. Define CareerScore ICP and personas.
3. Choose first three growth channels.
4. Design first 10 growth experiments.
5. Initialize project structure.
6. Create first architecture decision records.
7. Define initial database schema.
8. Build internal MVP only after the operating system is stable.
