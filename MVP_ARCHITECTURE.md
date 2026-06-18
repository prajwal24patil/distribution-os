# DistributionOS v0.1 MVP Architecture

## Purpose

DistributionOS v0.1 is the smallest useful version of the product.

It is built for one solo founder serving the first customer: CareerScore.

The goal is not to build a large platform. The goal is to create a working AI-assisted growth operating system that can:

- store CareerScore knowledge
- plan campaigns
- create content
- track experiments
- summarize results
- improve weekly growth decisions

## MVP Stack

```text
Frontend: Next.js 15
Language: TypeScript
Styling: Tailwind CSS

Backend: FastAPI
Language: Python

Database: Supabase Postgres
Vector Search: pgvector in Supabase

AI: OpenAI APIs

Deployment:
  Frontend: Vercel
  Backend: Railway
  Database: Supabase
```

## MVP Architecture

```text
User
  -> Next.js Web App
  -> FastAPI Backend
  -> Supabase Postgres
  -> OpenAI APIs
```

There is no separate worker, no microservice boundary, no organization system, and no complex orchestration.

FastAPI handles:

- CRUD operations
- AI calls
- simple RAG retrieval
- agent execution
- analytics summaries

Next.js handles:

- dashboard UI
- forms
- lists
- detail pages
- simple visualizations

Supabase handles:

- Postgres database
- pgvector search
- file storage later if needed

## 1. Exact Folder Structure

```text
Distribution_os/
  frontend/
    app/
      page.tsx
      layout.tsx
      globals.css

      dashboard/
        page.tsx

      knowledge/
        page.tsx
        [id]/
          page.tsx

      campaigns/
        page.tsx
        [id]/
          page.tsx

      experiments/
        page.tsx
        [id]/
          page.tsx

      content/
        page.tsx
        [id]/
          page.tsx

      analytics/
        page.tsx

    components/
      layout/
        AppShell.tsx
        Sidebar.tsx
        Header.tsx

      ui/
        Button.tsx
        Input.tsx
        Textarea.tsx
        Select.tsx
        Card.tsx
        Badge.tsx
        Table.tsx

      domain/
        KnowledgeEditor.tsx
        CampaignForm.tsx
        ExperimentForm.tsx
        ContentEditor.tsx
        AgentRunPanel.tsx

    lib/
      api.ts
      types.ts
      utils.ts

    public/

    package.json
    next.config.ts
    tailwind.config.ts
    tsconfig.json
    .env.example

  backend/
    app/
      main.py

      api/
        health.py
        knowledge.py
        campaigns.py
        experiments.py
        content.py
        agents.py
        analytics.py

      core/
        config.py
        database.py
        openai_client.py

      models/
        knowledge.py
        campaign.py
        experiment.py
        content.py
        agent_run.py
        analytics.py

      services/
        rag_service.py
        knowledge_service.py
        campaign_service.py
        experiment_service.py
        content_service.py
        analytics_service.py

      agents/
        research_agent.py
        content_agent.py
        analytics_agent.py

      prompts/
        research_agent.md
        content_agent.md
        analytics_agent.md

    requirements.txt
    .env.example

  database/
    schema.sql
    seed.sql

  memory/
    careerscore/
      profile.md
      positioning.md
      icp.md
      channels.md
      experiments.md

  docs/
    MVP_ARCHITECTURE.md

  PROJECT_MEMORY.md
  ARCHITECTURE.md
  ROADMAP.md
  TASKS.md
  MVP_ARCHITECTURE.md
  README.md
```

## Folder Rules

- `frontend/` contains only the Next.js app.
- `backend/` contains only the FastAPI app.
- `database/` contains SQL schema and seed data.
- `memory/` contains founder-facing markdown memory.
- Application code should not be placed in root.
- CareerScore-specific markdown belongs in `memory/careerscore/`.
- CareerScore-specific database records belong in normal tables with `customer_id`.

## 2. Exact Database Tables

Use Supabase Postgres.

Use a single default customer record for CareerScore in v0.1.

No multi-tenancy.
No organizations.
No teams.
No billing.

### Required Extensions

```sql
create extension if not exists vector;
```

## Table: customers

Stores the product/company being grown.

```text
id uuid primary key
name text not null
website text
description text
positioning text
created_at timestamptz not null
updated_at timestamptz not null
```

v0.1 expected row:

```text
CareerScore
```

## Table: knowledge_documents

Stores durable knowledge for RAG.

```text
id uuid primary key
customer_id uuid not null references customers(id)
title text not null
category text not null
body text not null
embedding vector(1536)
source text
created_at timestamptz not null
updated_at timestamptz not null
```

Allowed `category` values:

```text
profile
positioning
icp
persona
channel
campaign
experiment
learning
note
```

## Table: campaigns

Stores growth campaigns.

```text
id uuid primary key
customer_id uuid not null references customers(id)
name text not null
goal text not null
channel text not null
audience text
status text not null
start_date date
end_date date
created_at timestamptz not null
updated_at timestamptz not null
```

Allowed `status` values:

```text
idea
planned
active
completed
paused
```

Allowed `channel` values for MVP:

```text
linkedin
seo
email
partnership
manual
```

## Table: experiments

Stores measurable growth experiments.

```text
id uuid primary key
customer_id uuid not null references customers(id)
campaign_id uuid references campaigns(id)
name text not null
hypothesis text not null
metric text not null
status text not null
result text
learning text
created_at timestamptz not null
updated_at timestamptz not null
```

Allowed `status` values:

```text
idea
running
completed
invalidated
paused
```

## Table: content_items

Stores generated and manually written content.

```text
id uuid primary key
customer_id uuid not null references customers(id)
campaign_id uuid references campaigns(id)
experiment_id uuid references experiments(id)
title text not null
content_type text not null
channel text
body text not null
status text not null
created_at timestamptz not null
updated_at timestamptz not null
```

Allowed `content_type` values:

```text
linkedin_post
email
seo_brief
article_outline
landing_copy
note
```

Allowed `status` values:

```text
draft
reviewed
published
archived
```

## Table: agent_runs

Stores every AI agent execution.

```text
id uuid primary key
customer_id uuid not null references customers(id)
agent_type text not null
task text not null
input jsonb not null
output jsonb
status text not null
error text
model text
created_at timestamptz not null
completed_at timestamptz
```

Allowed `agent_type` values:

```text
research
content
analytics
```

Allowed `status` values:

```text
queued
running
completed
failed
```

## Table: metrics_snapshots

Stores simple manual analytics snapshots.

```text
id uuid primary key
customer_id uuid not null references customers(id)
campaign_id uuid references campaigns(id)
experiment_id uuid references experiments(id)
snapshot_date date not null
metric_name text not null
metric_value numeric
notes text
created_at timestamptz not null
```

Examples:

```text
linkedin_impressions
linkedin_comments
website_visits
signups
demo_requests
email_replies
```

## MVP Database Summary

Only seven tables:

```text
customers
knowledge_documents
campaigns
experiments
content_items
agent_runs
metrics_snapshots
```

Do not add more tables until the product needs them.

## Simple RAG Layer

The RAG layer should be intentionally small.

### RAG Inputs

- user task
- customer id
- optional category filter

### RAG Process

```text
1. Create embedding for user task.
2. Search knowledge_documents by vector similarity.
3. Return top 5 documents.
4. Inject those documents into the agent prompt.
5. Save the agent run.
```

### RAG Scope

RAG only searches `knowledge_documents` in v0.1.

Do not build:

- document chunk pipelines
- web crawlers
- complex retrieval graphs
- hybrid search
- memory ranking engines

## MVP Agents

Only three agents exist in v0.1.

## Research Agent

Purpose:

- summarize market context
- propose campaign ideas
- identify audience angles
- turn knowledge into research notes

Inputs:

- task
- relevant knowledge documents

Outputs:

- summary
- findings
- recommendations
- suggested next actions

## Content Agent

Purpose:

- draft LinkedIn posts
- draft email copy
- draft SEO briefs
- draft landing page copy

Inputs:

- task
- campaign
- experiment
- relevant knowledge documents

Outputs:

- title
- content type
- draft body
- notes

## Analytics Agent

Purpose:

- summarize campaign performance
- summarize experiment results
- identify learnings
- recommend next experiments

Inputs:

- metrics snapshots
- campaign data
- experiment data
- relevant knowledge documents

Outputs:

- performance summary
- learning
- recommendation
- next action

## 3. Exact Development Order

## Step 1: Create Repository Structure

Create only:

```text
frontend/
backend/
database/
memory/careerscore/
```

Do not create extra packages yet.

## Step 2: Create Supabase Project

In Supabase:

1. Create project.
2. Enable `vector` extension.
3. Create the seven MVP tables.
4. Add seed customer: `CareerScore`.
5. Store database URL.

## Step 3: Create FastAPI Backend

Build backend in this order:

1. health route
2. database connection
3. customer read route
4. knowledge CRUD routes
5. campaign CRUD routes
6. experiment CRUD routes
7. content CRUD routes
8. metrics snapshot routes
9. agent run logging
10. OpenAI client
11. RAG retrieval
12. Research Agent endpoint
13. Content Agent endpoint
14. Analytics Agent endpoint

## Step 4: Create Next.js Frontend

Build frontend in this order:

1. app shell
2. sidebar navigation
3. dashboard page
4. knowledge list page
5. knowledge detail/editor page
6. campaign list page
7. campaign detail page
8. experiment list page
9. experiment detail page
10. content list page
11. content detail/editor page
12. analytics page
13. agent run panel

## Step 5: Add CareerScore Knowledge

Create initial knowledge records:

1. CareerScore profile
2. CareerScore positioning
3. CareerScore ICP
4. CareerScore personas
5. CareerScore channels
6. CareerScore first campaign ideas
7. CareerScore first experiment ideas

## Step 6: Build First Working Loop

The first product loop:

```text
Add knowledge
  -> Create campaign
  -> Create experiment
  -> Generate content with Content Agent
  -> Add metric snapshot manually
  -> Summarize with Analytics Agent
  -> Save learning as knowledge
```

This is the MVP.

## Step 7: Polish Only the Main Loop

Improve only:

- form usability
- page loading states
- error states
- basic dashboard
- agent output readability

Do not broaden scope.

## 4. Exact Deployment Order

## Step 1: Supabase

Deploy database first.

Actions:

1. Create Supabase project.
2. Enable `pgvector`.
3. Run schema SQL.
4. Add CareerScore seed row.
5. Save database connection string.

Required environment variables:

```text
SUPABASE_DB_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

## Step 2: Railway Backend

Deploy FastAPI second.

Actions:

1. Create Railway project.
2. Connect backend directory.
3. Add environment variables.
4. Deploy FastAPI service.
5. Verify `/health`.

Required environment variables:

```text
DATABASE_URL
OPENAI_API_KEY
FRONTEND_URL
```

## Step 3: Vercel Frontend

Deploy Next.js third.

Actions:

1. Create Vercel project.
2. Set root directory to `frontend`.
3. Add backend API URL.
4. Deploy.
5. Verify dashboard loads.

Required environment variables:

```text
NEXT_PUBLIC_API_URL
```

## Step 4: Connect Frontend to Backend

Verify:

- dashboard loads
- knowledge list loads
- campaign creation works
- experiment creation works
- content creation works
- agent call works
- analytics summary works

## Step 5: Production Smoke Test

Run this exact flow:

```text
1. Add CareerScore knowledge document.
2. Create campaign.
3. Create experiment.
4. Generate LinkedIn post with Content Agent.
5. Add manual metric snapshot.
6. Run Analytics Agent.
7. Save learning as knowledge.
```

If this works, v0.1 is deployed.

## 5. What NOT To Build

Do not build these in v0.1:

- Terraform
- Kubernetes
- Docker Compose unless locally necessary
- microservices
- event bus
- separate worker service
- complex workflow engine
- multi-tenant architecture
- organizations
- teams
- role-based access control
- billing
- CRM
- contact enrichment
- lead database
- integration marketplace
- approval inbox
- notification system
- calendar integration
- browser automation
- LinkedIn automation
- email sending automation
- full document ingestion pipeline
- web crawler
- large agent framework
- multi-agent orchestration
- agent memory graph
- custom vector database
- complex analytics warehouse
- advanced attribution
- admin panel
- public landing page
- mobile app
- plugin system
- template marketplace

## MVP Non-Goals

DistributionOS v0.1 does not need to:

- support multiple customers
- invite users
- send emails
- post to social media
- sync with CRMs
- automate outreach
- run scheduled jobs
- handle billing
- support enterprise security
- provide perfect analytics

It only needs to help one founder run better growth work for CareerScore.

## MVP Success Criteria

DistributionOS v0.1 is successful when the founder can:

1. Store CareerScore knowledge.
2. Plan a campaign.
3. Define an experiment.
4. Generate useful content.
5. Record manual metrics.
6. Ask AI what happened.
7. Save the learning.
8. Decide the next action.

## Founder Rule

If a feature does not improve the weekly CareerScore growth loop, do not build it yet.
