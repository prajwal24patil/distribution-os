# DistributionOS Tasks

## Purpose

This file is the execution backlog for DistributionOS.

It is organized by phase and designed for AI-assisted development. Tasks should be small enough to delegate, review, and complete without losing architectural context.

## Task Status Legend

```text
[ ] Not started
[~] In progress
[x] Complete
[!] Blocked
```

## Phase 0: Project Operating System

### Operating Files

- [x] Analyze repository state
- [x] Define project purpose
- [x] Define architecture direction
- [x] Define roadmap
- [x] Define task backlog
- [ ] Review and approve project operating system

### Repository Foundation

- [ ] Initialize git repository
- [ ] Create recommended folder structure
- [ ] Add root README
- [ ] Add contribution/development notes
- [ ] Add architecture decision record folder
- [ ] Add first architecture decision records

### Architecture Decisions

- [ ] Decide frontend framework
- [ ] Decide backend shape
- [ ] Decide ORM
- [ ] Decide auth provider
- [ ] Decide queue/job system
- [ ] Decide deployment providers
- [ ] Decide AI provider adapter strategy

## Phase 1: CareerScore Manual Growth OS

### CareerScore Memory

- [ ] Create CareerScore product profile
- [ ] Define CareerScore target customers
- [ ] Define CareerScore ICP
- [ ] Define primary personas
- [ ] Define buyer/user journey
- [ ] Define CareerScore positioning
- [ ] Define CareerScore current growth constraints
- [ ] Define CareerScore growth goals

### Channel Strategy

- [ ] Evaluate LinkedIn as a channel
- [ ] Evaluate SEO as a channel
- [ ] Evaluate email as a channel
- [ ] Evaluate partnerships as a channel
- [ ] Evaluate referrals as a channel
- [ ] Rank initial channels by speed, cost, and confidence
- [ ] Choose first three channels

### Campaign Planning

- [ ] Define campaign template
- [ ] Define campaign brief format
- [ ] Define audience targeting format
- [ ] Define content asset requirements
- [ ] Define launch checklist
- [ ] Define campaign review checklist

### Experiments

- [ ] Define experiment template
- [ ] Define success metric format
- [ ] Define learning summary format
- [ ] Create first 10 CareerScore experiment ideas
- [ ] Prioritize experiments by impact, confidence, and effort
- [ ] Select first weekly experiment

### Weekly Operating Rhythm

- [ ] Define Monday planning workflow
- [ ] Define midweek execution check
- [ ] Define Friday review workflow
- [ ] Define monthly strategy review
- [ ] Define memory update procedure

## Phase 2: Internal Product MVP

### Product Definition

- [ ] Define MVP user stories
- [ ] Define MVP screens
- [ ] Define MVP non-goals
- [ ] Define acceptance criteria
- [ ] Define admin/internal-only constraints

### Application Foundation

- [ ] Create monorepo structure
- [ ] Create web app shell
- [ ] Create API boundary
- [ ] Create shared config package
- [ ] Create shared UI package
- [ ] Add linting and formatting
- [ ] Add test framework

### Authentication and Workspaces

- [ ] Add authentication
- [ ] Create user model
- [ ] Create workspace model
- [ ] Create workspace membership model
- [ ] Add authorization helpers
- [ ] Add workspace scoping tests

### Customer and Memory

- [ ] Create customer model
- [ ] Create customer profile model
- [ ] Create memory document model
- [ ] Add memory CRUD screens
- [ ] Add memory search
- [ ] Add customer profile screen

### Campaigns and Experiments

- [ ] Create campaign model
- [ ] Create campaign list screen
- [ ] Create campaign detail screen
- [ ] Create experiment model
- [ ] Create experiment list screen
- [ ] Create experiment detail screen
- [ ] Add status transitions

### Content

- [ ] Create content item model
- [ ] Create content library screen
- [ ] Link content to campaigns
- [ ] Link content to experiments
- [ ] Add draft/review/approved states

## Phase 3: Agent Runtime

### Agent Foundation

- [ ] Define agent registry format
- [ ] Define agent task schema
- [ ] Define agent run schema
- [ ] Define agent message schema
- [ ] Define model adapter interface
- [ ] Define tool permission model

### Memory Retrieval

- [ ] Define memory retrieval strategy
- [ ] Add keyword search
- [ ] Add semantic search plan
- [ ] Add memory citations
- [ ] Add memory freshness checks

### Agent Execution

- [ ] Implement research agent
- [ ] Implement growth strategist agent
- [ ] Implement content agent
- [ ] Implement QA agent
- [ ] Implement memory agent
- [ ] Implement analytics agent

### Agent Safety

- [ ] Add human approval requirement
- [ ] Add external action guardrails
- [ ] Add agent output review states
- [ ] Add cost tracking
- [ ] Add failure handling
- [ ] Add audit logs

### Agent Evaluation

- [ ] Define evaluation criteria
- [ ] Create sample tasks
- [ ] Create expected output rubrics
- [ ] Add QA review workflow
- [ ] Track accepted/rejected outputs

## Phase 4: Distribution Workflows

### LinkedIn Workflow

- [ ] Define LinkedIn content strategy
- [ ] Define post formats
- [ ] Define weekly publishing cadence
- [ ] Define engagement workflow
- [ ] Define measurement approach

### SEO Workflow

- [ ] Define keyword research workflow
- [ ] Define content brief format
- [ ] Define article production workflow
- [ ] Define internal linking workflow
- [ ] Define SEO metrics

### Email Workflow

- [ ] Define audience segments
- [ ] Define email sequence format
- [ ] Define personalization rules
- [ ] Define approval checklist
- [ ] Define reply tracking

### Partnership Workflow

- [ ] Define partner categories
- [ ] Define partner research workflow
- [ ] Define outreach messaging
- [ ] Define follow-up process
- [ ] Define partnership success metrics

### Referral Workflow

- [ ] Define referral audience
- [ ] Define referral ask
- [ ] Define referral tracking
- [ ] Define reward/incentive assumptions
- [ ] Define measurement approach

## Phase 5: Analytics and Learning

### Event Tracking

- [ ] Define event taxonomy
- [ ] Define campaign events
- [ ] Define experiment events
- [ ] Define content events
- [ ] Define agent events

### Dashboards

- [ ] Create weekly growth dashboard
- [ ] Create campaign dashboard
- [ ] Create experiment dashboard
- [ ] Create channel dashboard
- [ ] Create agent cost dashboard

### Reporting

- [ ] Define weekly report template
- [ ] Define monthly report template
- [ ] Add learning summaries
- [ ] Add recommendation summaries
- [ ] Add trend analysis

## Phase 6: Multi-Customer Platform

### Multi-Tenancy

- [ ] Harden workspace isolation
- [ ] Add customer onboarding flow
- [ ] Add role-based permissions
- [ ] Add organization-level settings
- [ ] Add admin controls

### Templates

- [ ] Create reusable campaign templates
- [ ] Create reusable experiment templates
- [ ] Create reusable agent templates
- [ ] Create reusable channel playbooks
- [ ] Create customer domain pack format

### Commercial Readiness

- [ ] Define pricing assumptions
- [ ] Add billing architecture
- [ ] Add usage tracking
- [ ] Add plan limits
- [ ] Add customer export capability

## Immediate Next Tasks

Recommended next execution order:

1. Review and approve these operating files.
2. Initialize git.
3. Create the folder structure.
4. Create CareerScore memory.
5. Define CareerScore ICP.
6. Design first 10 CareerScore experiments.
7. Choose MVP technical stack.
8. Create architecture decision records.

## AI Agent Task Rules

Before starting a task, an AI agent should:

- read `PROJECT_MEMORY.md`
- read `ARCHITECTURE.md`
- read the relevant phase in `ROADMAP.md`
- check this task list
- state assumptions

After completing a task, an AI agent should:

- update task status
- update project memory if needed
- record decisions if durable
- summarize what changed
- identify the next task
