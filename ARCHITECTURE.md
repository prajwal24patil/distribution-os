# DistributionOS Architecture

## Purpose

This document defines the target architecture for DistributionOS.

DistributionOS is an AI-powered platform for growth strategy, campaign planning, execution support, analytics, and continuous learning.

The architecture optimizes for:

- solo founder execution
- maintainability
- scalability
- token-efficient AI collaboration
- customer-specific extensibility
- auditable agent behavior

## Architectural Thesis

DistributionOS should begin as a modular monorepo with a small number of deployable apps and shared packages.

It should avoid premature microservices while preserving clear internal boundaries.

The system should be designed around durable business primitives:

- workspaces
- customers
- memory
- campaigns
- experiments
- content
- contacts
- agents
- events

## High-Level System

```text
Users
  -> Web App
  -> API Layer
  -> Application Services
  -> Agent Runtime
  -> Data Layer
  -> External Integrations
```

## Recommended Application Boundary

```text
apps/
  web/
    User-facing and internal product UI

  api/
    HTTP API, auth boundary, application orchestration

  worker/
    Background jobs, scheduled jobs, long-running agent tasks

  agent-console/
    Internal agent inspection, replay, approval, and debugging
```

In the earliest implementation, `web` and `api` may live together in a single Next.js application. They should still be designed as separate logical layers.

## Recommended Package Boundary

```text
packages/
  core/
    Domain primitives and shared business types

  database/
    Schema, migrations, database client, query helpers

  auth/
    Authentication, authorization, workspace membership

  integrations/
    Third-party APIs and provider adapters

  agents/
    Agent registry, execution runtime, tools, prompts, evaluators

  workflows/
    Campaign, experiment, and channel workflow logic

  analytics/
    Events, metrics, attribution, reporting helpers

  ui/
    Shared UI components

  config/
    Environment and runtime configuration
```

## Domain Packs

Customer-specific logic should be isolated from reusable platform code.

```text
domains/
  careerscore/
    memory/
    workflows/
    campaigns/
    experiments/
    assets/
    docs/
```

CareerScore is the first domain pack.

This lets the project learn from a real customer without hardcoding CareerScore assumptions into the platform.

## Core Platform Modules

### Memory Module

Responsible for:

- customer memory
- project memory
- campaign memory
- experiment learnings
- semantic retrieval
- memory versioning

Early stage:

- markdown files are canonical

Product stage:

- Postgres records become canonical
- markdown may remain useful as developer/project memory

### Campaign Module

Responsible for:

- campaign planning
- goals
- target audience
- channels
- assets
- status
- ownership
- timeline

### Experiment Module

Responsible for:

- hypotheses
- metrics
- variants
- results
- learnings
- follow-up recommendations

### Agent Module

Responsible for:

- agent definitions
- task execution
- prompt templates
- tool access
- memory retrieval
- evaluations
- run logging
- human approval gates

### Analytics Module

Responsible for:

- event tracking
- campaign metrics
- experiment results
- attribution
- weekly reports
- trend detection

### Integration Module

Responsible for:

- CRM integrations
- email providers
- LinkedIn or social workflow support
- analytics providers
- enrichment APIs
- search/research APIs

Integrations should be adapter-based so providers can be swapped.

## Agent Architecture

### Agent Runtime

```text
Agent Request
  -> Task Planner
  -> Context Loader
  -> Agent Selection
  -> Tool Execution
  -> Draft Output
  -> Evaluation
  -> Human Approval
  -> Persistence
  -> Memory Update
```

### Core Agents

#### Principal Architect Agent

Owns technical direction, architecture decisions, system boundaries, and maintainability.

#### Product Strategist Agent

Turns business goals and customer context into product requirements and workflows.

#### Growth Strategist Agent

Designs growth strategies, channels, campaigns, and experiment plans.

#### Research Agent

Finds market, customer, competitor, keyword, and prospect insights.

#### Content Agent

Creates drafts for posts, emails, landing pages, briefs, and campaign assets.

#### QA Agent

Reviews outputs for quality, accuracy, brand fit, and risk.

#### Memory Agent

Maintains structured memory, summarizes decisions, and captures learnings.

#### Analytics Agent

Interprets campaign and experiment results.

### Agent Guardrails

Agents must:

- log inputs and outputs
- cite memory used where appropriate
- request approval before external action
- preserve tenant boundaries
- separate facts from assumptions

Agents must not:

- send messages externally without approval
- modify durable memory without a trace
- fabricate metrics
- create irreversible side effects without confirmation

## Database Architecture

Recommended database: Postgres.

Recommended vector extension: `pgvector` when semantic memory retrieval is needed.

### Core Entities

```text
users
workspaces
workspace_members
customers
customer_profiles
memory_documents
agents
agent_runs
agent_messages
campaigns
campaign_assets
channels
experiments
experiment_results
contacts
organizations
content_items
events
integrations
api_keys
audit_logs
```

### Entity Relationships

```text
Workspace
  has many Users through WorkspaceMembers
  has many Customers
  has many Agents
  has many MemoryDocuments

Customer
  belongs to Workspace
  has many Campaigns
  has many Experiments
  has many Contacts
  has many MemoryDocuments

Campaign
  belongs to Customer
  has many CampaignAssets
  has many Experiments
  has many Events

Experiment
  belongs to Campaign
  has many ExperimentResults

AgentRun
  belongs to Workspace
  optionally belongs to Customer
  has many AgentMessages
```

### Database Principles

- Postgres is the product source of truth.
- Markdown is the early project memory source of truth.
- Every agent run should be persisted.
- Every external action should have an audit log.
- Tenant isolation must be designed early.
- Soft deletion should be considered for user-facing objects.
- Migrations should be version-controlled.

## Event Architecture

Important actions should create events.

Examples:

- campaign created
- campaign launched
- content generated
- experiment started
- experiment completed
- agent run completed
- memory updated
- integration connected

Events support:

- analytics
- debugging
- auditability
- future automation

## Deployment Architecture

Recommended early deployment:

```text
Frontend: Vercel
API: Vercel or Railway
Workers: Railway
Database: Supabase Postgres
Storage: Supabase Storage or S3
Auth: Clerk or Supabase Auth
Queue: Trigger.dev, Inngest, or BullMQ
Observability: Sentry + PostHog
```

### Environment Strategy

```text
local
preview
staging
production
```

### Production Requirements

- environment validation
- database migrations
- error monitoring
- analytics
- rate limits
- audit logs
- queue retries
- backups
- secret management
- agent cost tracking

## Security Architecture

Core requirements:

- workspace-level authorization
- customer-level data scoping
- encrypted secrets
- least-privilege integration access
- audit logs for sensitive actions
- human approval for external communication
- separation of internal admin actions from customer actions

## Observability Architecture

Track:

- API errors
- background job failures
- agent run failures
- token usage
- model cost
- campaign activity
- experiment outcomes
- integration failures

Recommended tools:

- Sentry for errors
- PostHog for product analytics
- database logs for persistence
- structured agent run logs for AI behavior

## Scalability Path

### Stage 1: Single App

Next.js app with API routes, Postgres, simple jobs.

### Stage 2: App plus Worker

Move long-running jobs and agent execution into a worker.

### Stage 3: Modular Services

Split only when operational pressure demands it.

Likely future splits:

- agent execution service
- integration sync service
- analytics/event pipeline

## Preferred Technical Stack

Default stack:

- Frontend: Next.js
- API: Next.js API routes first, standalone Node API later if needed
- Language: TypeScript
- Database: Postgres
- ORM: Prisma or Drizzle
- Auth: Clerk or Supabase Auth
- Styling: Tailwind
- Jobs: Trigger.dev, Inngest, or BullMQ
- AI: provider SDKs behind internal adapter interfaces
- Vector search: `pgvector`
- Deployment: Vercel, Supabase, Railway

## Architecture Risks

### Risk: Overbuilding Too Early

Mitigation:

- start with manual workflows
- keep services together
- defer complex orchestration

### Risk: Agent Outputs Become Untrusted Noise

Mitigation:

- use evaluation agents
- log runs
- require approval
- preserve memory provenance

### Risk: CareerScore Logic Pollutes Platform

Mitigation:

- isolate CareerScore under `domains/careerscore`
- promote reusable patterns only after repetition

### Risk: Memory Becomes Stale

Mitigation:

- make memory updates part of task completion
- maintain short canonical files
- use decision records for durable choices

## Architectural Rule of Thumb

Build the smallest system that lets CareerScore run better growth experiments every week, while preserving enough structure to become a multi-customer platform.
