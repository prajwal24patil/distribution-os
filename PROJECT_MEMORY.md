# DistributionOS Project Memory

## Purpose

DistributionOS is an AI-powered growth and distribution platform.

Its first customer and proving ground is CareerScore.

The project exists to turn product context, customer knowledge, market research, AI agents, and execution workflows into a repeatable growth operating system.

## North Star

DistributionOS should answer this every week:

> What should we do to grow, why should we do it, what assets are needed, who owns it, how will we measure it, and what did we learn?

## Current Repository State

Status: Daily Autopilot locally QA-tested and performance optimized.

Current known facts:

- Workspace: `D:\Distribution_os`
- Frontend skeleton: `apps/web` using Next.js 15, TypeScript, and Tailwind CSS
- Dashboard MVP routes: `/`, `/projects`, `/projects/new`, `/projects/[id]`
- Dashboard data source: Supabase `projects` table
- Authentication: Supabase email/password
- Protected routes: `/`, `/projects`, `/projects/new`, `/projects/[id]`, `/projects/[id]/memory`, `/projects/[id]/research`, `/projects/[id]/actions`, `/projects/[id]/approvals`, `/projects/[id]/autopilot`, `/projects/[id]/campaigns`
- Backend skeleton: `backend` using FastAPI
- Database directory: includes `projects`, `product_memory`, `research_runs`, `growth_actions`, `execution_logs`, result recommendation, campaign, tracking, and autopilot run migrations
- Tests: backend health test only
- Infrastructure: Dockerfiles and local compose file only
- CI: GitHub Actions for frontend and backend quality gates
- First customer: CareerScore
- Primary goal: build a maintainable AI-assisted distribution platform
- Current phase: 24/7 Daily Autopilot MVP for CareerScore with optimized loading, local QA checks, full tracking URLs, approve/copy/manual posting, and manual result capture

## Daily Autopilot Local QA and Performance Notes

Fully tested, fixed, and optimized the local Autopilot flow for the current manual CareerScore growth loop.

Included:

- local QA script: `scripts/test-autopilot-flow.mjs`
- root npm script: `npm run test:autopilot`
- static QA checks for:
  - required public environment variables
  - core app route files
  - Autopilot service exports
  - optimized Autopilot data loader usage
  - ready-to-post card controls
  - tracking redirect behavior
  - CareerScore content quality markers
  - loading skeletons
- `apps/web/lib/autopilotData.ts` optimized loader
- Autopilot page now uses one loader instead of scattered direct Supabase queries
- Autopilot page fetches:
  - project
  - latest daily run
  - top 5 ready-to-post items
  - latest 10 campaign items for result summary
- Autopilot page now shows only:
  - What DistributionOS did today
  - Today's Ready-to-Post Work
  - Results
  - Next Best Action
- Campaigns page now limits visible campaign data:
  - latest 5 campaigns
  - latest 10 campaign items
  - simple `View more later` placeholder
- loading skeletons added for:
  - `/projects/[id]/autopilot`
  - `/projects/[id]/campaigns`
- button pending states added or confirmed for:
  - Run Today's Autopilot
  - Generate Viral Campaign
  - Approve
  - Mark Posted
  - Failed
  - Save Result
- Copy Post and Copy Link controls confirm copied state
- full tracking URLs use:
  - `NEXT_PUBLIC_APP_URL`
  - request origin fallback
  - `http://localhost:3001` local fallback
- tracking redirect route now has safer destination fallback:
  - tracking link destination URL
  - Product Memory website URL
  - CareerScore fallback: `https://incomeos-theta.vercel.app/`
- `/t/[tracking_link_id]` continues to:
  - record click events
  - increment click count
  - redirect with UTM params
- conversion tracking remains on existing campaign result fields:
  - views
  - clicks
  - signups
  - paid users
  - revenue
  - learning
- result saves revalidate Campaigns and Autopilot so Results, Best channel, Latest learning, and Next Best Action update from real saved data
- content copy cleaned up to remove robotic phrasing
- visible UI avoids technical terms where practical:
  - Tracking link
  - Ready to post
  - Posted
  - Result
  - What worked
  - Next action

Current mode:

- approve/copy/manual post
- manual result entry
- no auto-posting
- no OpenAI by default
- no fake metrics

Future mode:

- official connected auto-publishing through approved platform integrations
- stronger automated end-to-end browser QA once seeded local test data exists

Last local Autopilot QA verification:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:autopilot`

## Current MVP State - Production Cron JSON Hardening

Status: verified on local checks.

Fixed the production cron route hardening for:

- `POST /api/cron/distribution`

Root cause found:

- the cron route could still produce an unstructured Vercel 500 when server-only environment variables were missing before `createAdminClient()` returned a client
- the final due-publishing step ran outside the project-level isolation and could throw after all project work had completed
- some Supabase failures were returned as raw messages instead of structured `{ table, action, message }` JSON

### Cron Route Behavior

The cron route now:

- keeps `Authorization: Bearer ${CRON_SECRET}` required
- supports explicit `GET` method handling with JSON `405`
- validates required env vars before creating the Supabase admin client:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CRON_SECRET`
  - `NEXT_PUBLIC_APP_URL`
- returns JSON `500` with missing env variable names only when env is incomplete
- returns JSON for Supabase query failures with:
  - `table`
  - `action`
  - `message`
- isolates each project with per-project `try/catch`
- isolates the final `publishDuePosts` step
- logs only safe error metadata:
  - scope
  - project id
  - table
  - action
  - message
- avoids exposing secret values in responses or logs
- returns a stable JSON summary containing:
  - `ok`
  - `projects_checked`
  - `cycles_run`
  - `assets_created`
  - `scheduled`
  - `published`
  - `manual_required`
  - `errors`

### Regression Coverage

Added:

- `scripts/test-cron-production-route.mjs`
- `npm run test:cron-production-route`

The new QA check verifies:

- `POST` is supported
- `GET` has explicit method handling
- missing auth returns JSON `401`
- valid route path returns the expected JSON summary shape
- missing env and route failures return JSON
- Supabase failures include table/action metadata
- per-project and publishing failures are collected instead of escaping as unhandled exceptions

### Migration Required

No migration required.

### Checks Verified

Passed:

- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:cron-production-route`
- `npm run test:blog-auto-publish`
- `npm run test:dashboard-qc`
- `npm run test:system-runner`
- `npm run test:autopilot`
- `backend/.venv/Scripts/python.exe -m pytest` from `backend/`

## Current MVP State - Final Autopilot Production Cleanup

Status: verified on local checks.

Completed the focused final Autopilot production cleanup without changing auth, UI structure, database schema, tracking redirects, webhook behavior, cron protection, dashboard QC, or system health.

### Visible Copy Cleanup

Added shared CareerScore copy sanitization so stale stored/generated output is cleaned before it reaches the founder-facing UI.

Completed:

- old CareerScore problem phrase removed from visible output
- dashboard-ready data uses the shared sanitizer
- scheduled work titles/content use the shared sanitizer
- research summaries, actions, approvals, campaign cards, public publications, and generated fallbacks sanitize stale copy before rendering
- old blog title fallback now displays as: `Before applying to 100 jobs, check your CareerScore.`

### Blog Auto-Publishing

Due blog/SEO scheduled posts now publish internally when Autopilot or cron runs.

Behavior:

- due blog rows with `scheduled`, `ready`, `manual_required`, or `auto_publish_ready` status are eligible for internal publishing
- internal blog publishing creates a `/publications/[slug]` URL
- `published_url` is saved on the scheduled post and linked publisher queue item
- scheduled post status is marked `published`
- Blog published count reads from raw scheduled rows, so published blog posts increment the count
- published blog posts no longer appear as pending Scheduled Work
- social platforms remain `manual_required` until official accounts are connected

### Public Publication Page

Confirmed the publication route remains available:

- `/publications/[slug]`

The public page renders:

- sanitized title
- sanitized post/body content
- CareerScore tracking link
- readable article layout

### Regression Coverage

Added:

- `scripts/test-blog-auto-publish.mjs`
- `npm run test:blog-auto-publish`

The new QA check verifies:

- old banned phrase is not saved by the blog publisher
- due blog publishing path exists
- `published_url` is created
- published blog posts are excluded from pending scheduled work
- Blog published count increments from published rows
- social platforms remain manual-required

### Migration Required

No new migration required.

Note: local Supabase type definitions now include `auto_publish_ready` as a recognized scheduled-post status for compatibility with existing production-ready status handling.

### Checks Verified

Passed:

- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:blog-auto-publish`
- `npm run test:dashboard-qc`
- `npm run test:system-runner`
- `npm run test:publishing-system`
- `npm run test:autonomous-distribution`
- `npm run test:autopilot`
- `backend/.venv/Scripts/python.exe -m pytest` from `backend/`

## Daily Autopilot Ready-To-Post Usability Notes

Improved the Autopilot ready-to-post cards so a founder can immediately understand what to post, where to post it, and how to record the result.

Included:

- ready-to-post cards now show full tracking URLs instead of relative `/t/...` paths
- full tracking URL uses `NEXT_PUBLIC_APP_URL` when configured, otherwise request host/protocol, otherwise localhost fallback
- copied post text now includes the full tracking URL
- added `Best for` guidance per platform
- added `Add Result` button on each ready-to-post card
- `Add Result` links to the existing campaign result form for that campaign item
- campaign item cards on the Campaigns page now have stable anchors for Autopilot result links
- top helper now says: `Use one item today. Copy the post, paste it on the platform, include the tracking link, then come back and add the result.`
- Autopilot cards now show:
  - Platform
  - Best for
  - Post title
  - Ready-to-copy post
  - Tracking link
  - Approve
  - Copy Post
  - Copy Link
  - Mark Posted
  - Add Result
  - Failed
- improved CareerScore deterministic templates for:
  - LinkedIn
  - WhatsApp/community
  - Reddit/community
  - SEO
  - Landing page
  - Referral

Explicitly not included:

- new pages
- OpenAI
- auto-posting
- changes to tracking redirect behavior
- external publishing APIs
- fake metrics

Last ready-to-post usability verification:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Daily Autopilot UX and Tracking Fix Notes

Fixed the current 24/7 Daily Autopilot page so the workflow is simpler and ready items have usable tracking links.

Included:

- Run Today's Autopilot now backfills missing tracking links for existing campaign items when Product Memory has a CareerScore URL
- Run Today's Autopilot now updates existing publisher queue rows that previously had blank tracking URLs
- missing destination URL now shows one setup message: `Add CareerScore URL to create tracking links.`
- removed duplicate Autopilot work rendering
- replaced `Ready to approve` and `Today's posting plan` with one section: `Today's Ready-to-Post Work`
- limited visible ready-to-post work to 5 items
- added top instruction: `Pick one item, approve it, post it manually, then come back and mark it posted.`
- queue cards now show:
  - Platform
  - Title
  - Ready-to-copy post
  - Tracking link
  - Approve
  - Copy Post
  - Copy Link
  - Mark Posted
  - Failed
- Results section stays focused on:
  - Clicks
  - Signups
  - Paid users
  - Revenue
  - Best channel
  - Latest learning
- improved deterministic CareerScore content templates for:
  - LinkedIn
  - WhatsApp/community
  - Reddit/community
  - SEO
  - Landing page
  - Referral

Explicitly not included:

- new pages
- new tables
- OpenAI by default
- auto-posting
- external publishing APIs
- fake metrics
- changes to auth, projects, product memory, research, actions, campaigns, tracking, or results behavior beyond the requested Autopilot UX and tracking-link fixes

Last Daily Autopilot UX verification:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Daily Autopilot, Publisher Queue, and AI Content Engine Notes

Moved DistributionOS closer to a daily growth execution loop:

```text
product memory -> daily problem detection -> safe internal fix -> content/work generation -> publisher queue -> manual approval/posting -> results review
```

Included:

- `daily_autopilot_runs` Supabase table migration
- `publisher_queue` Supabase table migration
- owner-scoped RLS policies for daily autopilot runs and publisher queue items
- typed Supabase contracts for daily autopilot runs and publisher queue items
- `apps/web/lib/dailyAutopilotRunner.ts`
- `runDailyAutopilotForProject`
- `createDailyGrowthWork`
- `summarizeDailyAutopilotRun`
- `selectBestNextWork`
- `preventDuplicateDailyRun`
- `apps/web/lib/publisherQueue.ts`
- `createPublisherQueueItems`
- `approvePublisherItem`
- `markPublisherItemPosted`
- `markPublisherItemFailed`
- `getTodayPublisherQueue`
- `getPublisherSummary`
- `apps/web/lib/aiContentEngine.ts`
- AI content engine deterministic fallback by default
- optional server-side AI provider wrapper for `GEMINI_API_KEY` or `OPENAI_API_KEY`
- `.env.example` entries for `GEMINI_API_KEY` and `OPENAI_API_KEY`
- future official publisher adapter interface for:
  - LinkedIn
  - Reddit
  - Facebook
  - Instagram
  - YouTube
  - Blog
- all publisher adapters return `manual_approval_required`
- simplified `/projects/[id]/autopilot` page focused on:
  - What DistributionOS did today
  - Ready to approve
  - Today's posting plan
  - Results
  - Run Today's Autopilot

Daily Autopilot behavior:

- detects the current growth problem from saved product memory, research, actions, campaigns, tracking, and results
- applies only safe internal fixes
- creates top daily growth work
- creates publisher queue items
- saves the daily run summary
- prevents duplicate daily run inserts for the same project, owner, and date

Publisher Queue current mode:

- approve/copy/manual post only
- no automatic publishing
- no email sending
- no social media API execution
- no fake metrics
- no scraping
- no spending money

Platform-specific content generated for:

- LinkedIn founder post
- Reddit/community reply
- WhatsApp community message
- SEO blog outline
- YouTube Shorts script
- Instagram/Facebook short caption

CareerScore default angles used by deterministic generation:

- CareerScore like CIBIL for career
- freshers not getting shortlisted
- salary gap
- skill gap
- job readiness
- INR 99 detailed report
- INR 199 advanced report
- shareable CareerScore badge
- referral/invite friend

Future mode:

- official connected auto-publishing can be added through the publisher adapter interface
- official account connection must be validated before any external publishing
- manual approval remains the safety gate unless explicitly changed

Last Daily Autopilot verification:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Magic URL Growth Autopilot Notes

DistributionOS is now shaped as a Magic URL Growth Autopilot:

```text
user enters URL -> backend applies safe growth fixes -> user sees work and results -> system selects next winning move
```

Current mode:

- approval/manual-posting only
- no auto-posting
- no email sending
- no external APIs
- no OpenAI
- no RAG
- no fake metrics

Created:

- URL-first new project setup
- new projects redirect directly to `/projects/[id]/autopilot`
- starter CareerScore Product Memory from product name, product URL, and goal
- `apps/web/lib/autopilotOrchestrator.ts`
- `apps/web/lib/publisherAdapters.ts`
- `apps/web/lib/dailyAutopilot.ts`
- `startGrowthAutopilotAction`
- `createTodayGrowthPlan`
- `work_created` field for `autopilot_runs`
- compatibility migration for `autopilot_runs.work_created`
- simple result-first Autopilot UI

Autopilot orchestration now safely:

- creates Product Memory if missing
- runs internal research if missing
- generates growth actions if missing
- generates viral campaign work if missing
- generates tracking links if missing
- detects the current growth problem
- applies safe internal fixes
- saves an Autopilot run summary
- shows ready-to-use work
- shows real results
- selects the next winning move

Autopilot page now shows:

- Autopilot status
- Growth score
- Last problem found
- Last fix applied
- Next winning move
- What DistributionOS did
- top 5 ready-to-use work items
- Copy Post
- Copy Link
- Mark Posted
- Add Result
- real clicks, signups, paid users, revenue
- best channel
- best message
- latest learning

Publisher preparation:

- LinkedIn adapter interface
- Reddit adapter interface
- Facebook adapter interface
- Instagram adapter interface
- YouTube adapter interface
- Blog adapter interface
- all return `manual_approval_required`
- future mode supports official connected publisher integrations

Daily automation preparation:

- `planDailyAutopilotRun`
- `selectProjectsForDailyRun`
- `createDailyGrowthPlan`
- `summarizeDailyResults`
- local MVP button: Create Today's Growth Plan
- future mode can connect to Vercel Cron, Inngest, or Trigger.dev

CareerScore defaults:

- career score like CIBIL
- freshers not getting shortlisted
- salary gap
- skill gap
- job readiness
- before applying to 100 jobs, know your score
- INR 99 detailed report
- INR 199 advanced report
- shareable CareerScore badge
- invite friend / referral loop
- LinkedIn
- WhatsApp
- Reddit
- SEO blog
- communities
- YouTube shorts script

Last Magic URL Autopilot verification:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Growth Problem Solver Engine Notes

Shifted DistributionOS from an analysis dashboard toward a problem-solution-execution loop:

```text
problem detection -> safe fix application -> result tracking -> next fix
```

Created:

- `apps/web/lib/growthProblemSolver.ts`
- deterministic `detectGrowthProblems`
- deterministic `recommendFixes`
- deterministic `applySafeFixes`
- deterministic `generateFixTasks`
- deterministic `verifyFixReadiness`
- deterministic `getNextExecutionStep`
- `autopilot_runs` Supabase table migration
- owner-scoped RLS policies for autopilot runs
- typed Supabase contract for autopilot runs
- `Fix Next Growth Problem` server action
- simplified Autopilot page focused on:
  - What problem did we find?
  - What fix did DistributionOS apply?
  - What should you do now?
  - Ready-to-use work
  - Result check

Problems detected:

- no product memory
- no research
- no campaign created
- no ready-to-post content
- no clicks
- clicks but no signups
- signups but no paid users
- paid users but no sharing
- failed channel
- winning channel found

Safe fixes applied:

- send founder to Product Memory when memory is missing
- run internal research from Product Memory
- generate internal campaign content
- generate campaign items and tracking links
- generate stronger hooks, curiosity headlines, sharper CTAs, and variants
- generate landing page copy fixes
- generate pricing and upsell copy fixes
- generate referral/share assets
- generate alternative channel or angle
- generate more work in a winning pattern
- save every applied fix in `autopilot_runs`

CareerScore-specific fix templates:

- freshers angle
- salary angle
- skill gap angle
- CIBIL analogy angle
- urgency angle
- INR 99 report pitch
- INR 199 advanced report pitch
- referral and share-loop copy

Explicitly not included:

- OpenAI
- RAG
- external APIs
- auto-posting
- emailing people
- scraping private data
- spending money
- editing external CareerScore production code
- fake metrics

Last Growth Problem Solver verification:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Tracking and CareerScore URL System Notes

Created first-party campaign link tracking so DistributionOS can attribute CareerScore campaign clicks to generated content.

Included:

- `tracking_links` Supabase table migration
- `click_events` Supabase table migration
- typed Supabase contracts for tracking links and click events
- public tracking redirect route: `/t/[tracking_link_id]`
- click event insertion when a tracking link is opened
- tracking link click counter increment
- redirect to destination URL with UTM params
- generated tracking links for new viral campaign items
- campaign generation setup field for CareerScore destination URL when Product Memory website URL is missing
- campaign item tracking URL display
- copy tracking URL button
- tracking click count display per campaign item
- campaign summary total tracked clicks
- best source
- best campaign item
- best content angle
- Autopilot campaign clicks now use tracked clicks

Explicitly not included:

- OpenAI
- auto-posting
- external APIs
- external analytics services
- RAG
- visitor identity tracking
- signup or paid-user automation
- changes to existing Product Memory, Research, Actions, Approvals, Results, or manual campaign result behavior

Last Tracking System verification:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Viral Growth Engine Notes

Created the manual Viral Growth Engine layer for turning CareerScore growth context into organic acquisition campaigns.

Included:

- `campaigns` Supabase table migration
- `campaign_items` Supabase table migration
- `campaign_results` Supabase table migration
- owner-scoped RLS policies for campaigns, campaign items, and campaign results
- typed Supabase contracts for campaigns, campaign items, and campaign results
- deterministic campaign item generation
- `/projects/[id]/campaigns` protected route
- Campaigns link on project detail page
- `Generate Viral Campaign` button
- generated campaign types:
  - LinkedIn founder post
  - SEO blog
  - WhatsApp/community share
  - Reddit/community reply
  - Landing page headline
  - Referral campaign
- every generated campaign item includes:
  - channel
  - hook
  - content
  - target audience
  - CTA
  - expected outcome
  - UTM source
  - UTM medium
  - UTM campaign
  - UTM content
  - UTM link
  - status
- campaign item statuses:
  - draft
  - approved
  - posted
  - completed
  - failed
- copy button for each campaign item
- manual campaign result fields:
  - views
  - clicks
  - signups
  - paid users
  - revenue
  - learning
- winner detection for:
  - best channel
  - best hook
  - best CTA
  - best campaign
- deterministic next viral move logic:
  - repeat winners
  - rewrite weak hooks
  - change failed channel
  - create more of best-performing format
- Autopilot summary for:
  - campaigns created
  - posts ready
  - clicks
  - signups
  - paid users
  - revenue
  - next viral move

Explicitly not included:

- OpenAI
- RAG
- auto-posting
- external APIs
- external publishing
- fake metrics
- campaign scheduling
- CRM
- changes to auth, project CRUD, product memory, research, actions, approvals, results, or Autopilot behavior outside campaign summary integration

Last Viral Growth Engine verification:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

## CareerScore Growth Autopilot MVP Notes

Created a single project-scoped Autopilot page that combines the current manual DistributionOS workflow into one control center.

Included:

- `/projects/[id]/autopilot` protected route
- Autopilot link on project detail page
- Product Memory status
- Research status
- Actions status
- Approval status
- Execution status
- Results status
- Growth Score from 0 to 100
- Autopilot Status:
  - Not ready
  - Ready for research
  - Ready for action
  - Execution active
  - Learning mode
- state-aware main CTA:
  - Complete Product Memory
  - Run Research
  - Generate Growth Actions
  - Approve Best Actions
  - Execute Approved Action
  - Add Result
  - Generate Next Recommendation
- Growth Plan Today section with top 3 non-rejected actions
- action title, channel, reason, expected outcome, and status
- next best action display using saved recommendation or deterministic local fallback
- return path support for `Generate Next Recommendation` so Autopilot stays on the Autopilot page

Growth Score formula:

- product memory completed: +20
- research exists: +20
- actions generated: +20
- approved action exists: +15
- executed action exists: +15
- result or learning recorded: +10

Explicitly not included:

- OpenAI
- RAG
- auto-posting
- external APIs
- extra dashboards
- external execution
- fake metrics
- changes to database schema
- changes to auth, project CRUD, product memory, research, actions, or approvals behavior beyond the recommendation return path

Last Autopilot verification:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Results Dashboard and Next Best Action Notes

Completed the final MVP chunk that turns research, generated actions, approvals, and manual execution logs into a simple growth results view on the project detail page.

Included:

- Growth Results section on `/projects/[id]`
- total research runs
- total actions generated
- approved actions count
- executed actions count
- completed/success actions count
- failed actions count
- best channel so far based on successful manual execution logs
- latest learning based on manual execution logs
- next best action display
- `Generate Next Recommendation` button
- deterministic next recommendation server action
- `next_recommendation` project field
- manual result fields on execution logs:
  - `result_metric`
  - `result_value`
  - `learning`
  - `completed_at`
- migration SQL for result and recommendation fields
- approval execution form fields for result metric, result value, and learning

Recommendation logic:

- no research exists: recommend running research
- research exists but no actions: recommend generating growth actions
- actions exist but none are approved or executed: recommend approving the top pending action
- approved actions exist but none are executed: recommend manually executing an approved action
- pending execution results exist: recommend checking results after 24 hours
- LinkedIn success exists: recommend more LinkedIn founder posts
- SEO success exists: recommend more SEO blog ideas
- WhatsApp/community success exists: recommend more community distribution
- failed execution exists: recommend changing angle/channel and retrying

Explicitly not included:

- OpenAI
- RAG
- auto-posting
- external APIs
- extra dashboards
- fake metrics
- automated analytics
- changes to existing auth behavior
- changes to existing project CRUD behavior
- changes to existing product memory behavior
- changes to existing research/action generation behavior
- changes to manual approval/execution safety boundaries

Last results dashboard verification:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Approval Queue and Manual Execution Log Notes

Created the controlled execution layer that moves generated growth actions into approval and manual execution tracking.

Included:

- `execution_logs` Supabase table migration
- owner-scoped RLS policies for execution logs
- typed Supabase contract for execution logs
- `/projects/[id]/approvals` protected route
- approval queue grouped by action status
- pending draft actions waiting for approval
- approved actions ready for manual execution
- completed actions with execution logs
- rejected actions
- approve action control
- reject action control
- manual execution logging form
- execution URL field
- execution notes field
- result status field: pending, success, failed, needs follow-up
- completed status update after manual execution is logged
- loading, empty, error, and success states
- project detail navigation: Product Memory, Research, Actions, Approvals
- actions page link into the approval queue

Explicitly not included:

- automatic publishing
- email sending
- social media APIs
- fake metrics
- external integrations
- OpenAI
- RAG
- agents
- analytics automation
- changes to existing auth behavior
- changes to existing project CRUD behavior
- changes to existing product memory behavior
- changes to existing research/action generation behavior

Last approval/execution verification:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Research Engine and Action Generator Notes

Created deterministic local research and growth action generation for project-scoped growth planning.

Included:

- `research_runs` Supabase table migration
- `growth_actions` Supabase table migration
- owner-scoped RLS policies for research runs
- owner-scoped RLS policies for growth actions
- typed Supabase contracts for research and actions
- deterministic local research helper
- deterministic local growth action helper
- `/projects/[id]/research` protected route
- `/projects/[id]/actions` protected route
- “Run Research” button
- “Generate Growth Actions” button
- action status updates: approve, reject, complete
- navigation links from project detail to Product Memory, Research, and Actions
- loading, empty, error, and success states

Research output includes:

- audience insights
- competitor insights
- keyword opportunities
- channel opportunities
- pain points
- positioning angles
- assumptions
- confidence score

Growth actions generated:

- 5 LinkedIn post ideas
- 5 SEO blog ideas
- 3 WhatsApp/community messages
- 3 landing page improvements
- 3 founder next actions

Explicitly not included:

- OpenAI
- RAG
- agents
- publishing
- external APIs
- external posting
- external emailing
- analytics automation
- changes to existing auth behavior
- changes to existing project CRUD behavior
- changes to existing product memory behavior

Last research/action verification:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Product Memory Module Notes

Created the first project-scoped Product Memory module for storing the information DistributionOS needs to research, position, and grow a product.

Included:

- `product_memory` Supabase table migration
- project-scoped product memory records
- owner-scoped row-level security policies
- typed Supabase table contract
- `/projects/[id]/memory` protected route
- editable product memory form
- server-side validation for required product name and summary
- create and update behavior through one save action
- empty state for projects without product memory
- loading state for the product memory route
- error state for failed loads or failed saves
- success confirmation after save
- “Product Memory” link from project detail

Product memory fields:

- product name
- website URL
- product summary
- target users
- primary problem
- value proposition
- pricing
- current stage
- primary goal
- target countries
- preferred channels
- competitors
- brand voice
- constraints

Explicitly not included:

- AI
- RAG
- agents
- content generation
- publishing
- analytics
- external integrations
- CareerScore automation
- hardcoded CareerScore product memory values

Last product memory verification:

- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `pytest`
- `npm run build`

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

## Current MVP State - Autonomous Distribution Engine

Status: verified on local checks.

DistributionOS now supports a URL-first autonomous distribution workflow for CareerScore. The user can run the distribution engine from the project Autopilot page, generate ranked growth assets, QA them, place approved work into the publisher queue, attach tracking links, and review early performance signals without enabling unsafe auto-posting.

### Current User Flow

1. Create or open a project.
2. Add CareerScore product memory and URL.
3. Open the Autopilot page.
4. Start the Distribution Engine or run the daily autopilot.
5. Review the best assets prepared for posting.
6. Approve, copy, manually post, mark posted, and add results.
7. Use results and learning to choose the next winning move.

### Autopilot Page Shape

The Autopilot page is intentionally result-first and simple. It shows only:

- Distribution Engine Status
- What DistributionOS did
- Growth Results
- Channels prepared
- Best Assets Ready
- Next Winning Move

The page avoids extra dashboards and keeps the founder workflow focused on what was created, what is ready to post, what happened, and what to do next.

### Autonomous Distribution Services

Added backend service modules:

- `apps/web/lib/autonomousDistributionEngine.ts`
- `apps/web/lib/shortVideoEngine.ts`
- `apps/web/lib/contentSimulation.ts`
- `apps/web/lib/qaAgent.ts`
- `apps/web/lib/schedulerPlan.ts`

Core capabilities:

- ingest project and product URL context
- analyze CareerScore positioning and audience pain
- select organic channels
- generate distribution strategy
- generate multi-format content batches
- generate short video scripts without producing video files
- score content assets
- QA content assets
- create publisher queue items
- attach tracking links
- keep publishing manual unless official integrations are connected
- track result summaries
- learn from results
- generate the next cycle plan

### Content Intelligence

Content scoring currently uses deterministic local logic with this weighting:

- quality score: 35%
- platform fit: 20%
- hook strength: 15%
- CTA clarity: 10%
- previous performance: 15%
- business value potential: 5%

The QA agent rejects unsafe or weak content, including:

- guaranteed outcomes
- fake metrics
- spam language
- generic content
- overhyped claims
- misleading income claims
- robotic phrasing
- missing CareerScore relevance
- missing CTA
- missing tracking link

### Funnel Bottleneck Logic

The intelligence layer can detect simple bottlenecks:

- no clicks: improve hooks
- clicks but no signups: improve landing headline and CTA
- signups but no uploads: improve upload flow CTA
- uploads but no paid users: improve INR 99/199 report pitch
- paid users but no referrals: improve referral/share loop
- winner found: create variations of the winning format

### Publisher Mode

Current mode: approve, copy, and manually post.

Future mode: official connected auto-publishing.

All publisher adapters currently return manual approval required. No external platform posting is performed. No scraping, spam automation, message sending, or paid spend is allowed.

### Database Changes

New migrations:

- `database/migrations/0012_create_autonomous_distribution_core.sql`
- `database/migrations/0013_add_distribution_performance_indexes.sql`

Migration 0012 adds:

- `distribution_cycles`
- additional `product_memory` URL and positioning fields
- additional `publisher_queue` asset, QA, scoring, publishing, and result fields

Migration 0013 adds safe read-performance indexes for:

- `publisher_queue`
- `distribution_cycles`
- `daily_autopilot_runs`
- `tracking_links`
- `campaign_items`
- `click_events`
- `campaign_results`
- optional `conversion_events` if it exists

### Performance Updates

Autopilot data loading now uses a single optimized loader with parallel Supabase reads and smaller result limits. The Autopilot page no longer performs direct table reads in the component. Campaign data loading is limited to recent campaigns and recent campaign items instead of deep history.

Dev-only timing logs were added for:

- Autopilot data loading
- distribution asset generation
- distribution cycle execution
- full distribution run time

### QA Scripts

Added targeted QA scripts:

- `npm run test:autopilot`
- `npm run test:autonomous-distribution`

Available checks verified:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:autopilot`
- `npm run test:autonomous-distribution`

Root scripts for `test:growth-engine` and `test:growth-intelligence` are not currently defined.

### Current Constraints

DistributionOS still does not:

- auto-post to external platforms
- call unofficial social APIs
- scrape private data
- fake results
- send messages without approval
- spend money
- generate videos directly

### Next Build Priorities

1. Apply migrations 0012 and 0013 in Supabase.
2. Verify the Autopilot page against live Supabase data.
3. Add official publisher connection setup only when a real integration is selected.
4. Add real conversion events only after CareerScore can send trusted signup, upload, payment, and referral events.
5. Keep manual approval as the default operating mode until reliability is proven.

## Current MVP State - Auto Sharing and Best-Time Scheduler

Status: verified on local checks.

DistributionOS now has the first official-connection-ready publishing layer. The system can move CareerScore content from autonomous creation into scheduling, manual-ready publishing, tracking, and learning without posting externally or bypassing platform rules.

### Auto Sharing System

Added:

- publishing connections model
- scheduled posts model
- conversion events model
- best-time timing agent
- publishing scheduler
- publishing worker preparation
- safe cron/API route preparation
- Autopilot dashboard publishing status
- publishing-system QA script

Current mode remains safe by default:

- If official account connection is missing, scheduled work becomes manual required.
- If an official connection exists but the adapter is not implemented, the worker marks the post manual required.
- No browser automation, scraping, spam, fake metrics, or unauthorized posting exists.

### New Database Migration

New migration:

- `database/migrations/0014_create_publishing_system.sql`

It creates:

- `publishing_connections`
- `scheduled_posts`
- `conversion_events`

It adds safe indexes for:

- `scheduled_posts(project_id, owner_id, status, scheduled_for)`
- `publishing_connections(project_id, owner_id, platform)`
- `publisher_queue(project_id, owner_id, status, platform)`
- `conversion_events(project_id, owner_id, occurred_at)`

### Publishing Connections

Supported platforms:

- LinkedIn
- Reddit
- Facebook
- Instagram
- YouTube
- Blog

Connection statuses:

- not connected
- connected
- expired
- permission missing
- disabled

Token columns are placeholders only. Real token storage must wait for secure secret handling and official integration work.

### Scheduled Posts

Approved or QA-approved publisher queue items can now become scheduled posts with:

- platform
- content type
- title
- content
- tracking URL
- scheduled time
- timezone
- status
- publish mode
- publish attempts
- published URL
- failure reason

The scheduler prevents duplicate scheduled posts for the same queue item and enforces simple caps:

- max 12 scheduled assets per cycle
- max 3 per platform per day
- max 5 shown on the dashboard

### Best-Time Scheduling Agent

Added `apps/web/lib/platformTimingAgent.ts`.

Default timing assumptions:

- LinkedIn: weekday morning or early evening
- Reddit/community: evening or weekend
- WhatsApp/community: evening
- SEO/blog: morning preference
- YouTube Shorts: evening
- Instagram/Facebook: evening or weekend
- Referral: after successful user/result moments

These are starting assumptions, not guarantees. When real conversion events exist, the timing agent can favor windows that produced higher business value:

- paid reports
- revenue
- signups
- resume uploads
- clicks

### Publishing Scheduler

Added `apps/web/lib/publishingScheduler.ts`.

Exports:

- `scheduleApprovedAssets`
- `scheduleOneAsset`
- `getScheduledPosts`
- `getNextPostsToPublish`
- `markPostPublished`
- `markPostFailed`
- `skipUnsafePost`
- `summarizePublishingPlan`

Behavior:

- reads approved or ready publisher queue items
- checks publishing connections
- selects a best available posting time
- creates manual-required scheduled posts when no official connection exists
- prepares official-auto scheduled posts only when the product publishing mode and connection allow it

### Publishing Worker

Added `apps/web/lib/publishingWorker.ts`.

Exports:

- `runPublishingWorker`
- `publishDuePosts`
- `publishSinglePost`
- `collectPublishedPostMetrics`
- `handlePublishFailure`

Current behavior:

- finds due scheduled posts
- validates official connection
- marks missing connections as manual required
- marks unimplemented official adapters as manual required
- never fakes success
- never retries infinitely
- caps attempts at 3

No live cron is enabled yet.

### Cron Route Preparation

Added:

- `apps/web/app/api/cron/distribution-cycle/route.ts`

The route requires `CRON_SECRET`. It currently runs safe publishing worker preparation and returns a summary. Project-wide automatic daily cycles still need a secure server-side project selector before cron is enabled.

### Autopilot Dashboard

The Autopilot dashboard now shows:

- Distribution Engine Status
- Auto Publishing Status
- Scheduled Work
- Work Done
- Growth Results
- Next Move

It also shows the future tracking note:

- Connect CareerScore events to track signups and paid reports automatically.

### Tracking and Attribution

The tracking redirect route still:

- records a click event
- increments tracking link clicks
- redirects to CareerScore with UTM parameters

It now also records a `conversion_events` row for click events so scheduling intelligence can learn from a single event stream later.

Manual Add Result remains the source for signups, paid users, and revenue until CareerScore sends trusted automatic events.

### Checks Verified

Passed:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:publishing-system`
- `npm run test:autopilot`
- `npm run test:autonomous-distribution`

Not currently defined:

- `npm run test:growth-engine`
- `npm run test:growth-intelligence`

## Current MVP State - System Health Self-Test

Status: verified on local checks.

DistributionOS now includes a self-testing System Health layer so the founder does not need to manually check every button one by one.

### Run Full System Test

Added a one-button system check on the Autopilot dashboard:

- Run Full System Test

The test runner verifies:

- product setup exists
- CareerScore URL exists
- distribution strategy can run
- assets can be generated
- QA approves safe content and rejects unsafe content
- scheduled/manual-ready posts can be created
- tracking links can be created
- click tracking updates
- demo/test result tracking saves
- revenue/result summary data can update
- latest learning exists for the next move
- publishing remains safe/manual unless official connections exist

### System Test Runner

Added:

- `apps/web/lib/systemTestRunner.ts`
- `database/migrations/0015_create_system_test_runs.sql`
- `scripts/test-system-test-runner.mjs`

Runner exports:

- `runFullSystemTest`
- `testProjectSetup`
- `testDistributionCycle`
- `testAssetGeneration`
- `testQaScoring`
- `testScheduling`
- `testTrackingLinks`
- `testClickTracking`
- `testResultTracking`
- `testNextMove`
- `cleanupOldTestRuns`
- `generateFixInstruction`

Each test returns:

- name
- status
- message
- details
- duration in milliseconds
- fix instruction when failed

### System Test Storage

New table:

- `system_test_runs`

It stores:

- project
- owner
- status
- totals
- pass/fail/warning counts
- summary
- JSON result details
- created time

RLS restricts access to each owner.

### Auto Fix Instructions

When a test fails, DistributionOS now stores a plain-English Codex fix instruction.

Example:

- Tracking links failed. Ask Codex to fix `/t/[id]` redirect so it records clicks and redirects to the CareerScore URL.

### Demo Result Mode

Added a second Autopilot button:

- Create Demo Result

It creates clearly marked `system_test` / `system_test_demo` data:

- clicks: 10
- signups: 2
- resume uploads: 1
- paid reports: 1
- revenue: 99
- learning: Demo result: LinkedIn fresher shortlisted angle worked.

This lets the founder see dashboard behavior without manually posting content or waiting for real traffic.

### Autopilot Dashboard Shape

The Autopilot dashboard now shows:

- System Health
- Distribution Engine Status
- What DistributionOS did
- Growth Results
- Scheduled Work
- Best Assets
- Next Move

It avoids technical database/function names in the user-facing UI.

### Safety State

System Health and Demo Result mode do not:

- auto-post externally
- send messages
- scrape data
- spend money
- delete real user data
- touch other users' data
- silently fake production metrics

Demo data is clearly marked as test/demo data.

Official connected platform accounts are still required for real auto-publishing.

### Checks Verified

Passed:

- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:system-runner`
- `npm run test:publishing-system`
- `npm run test:autopilot`
- `npm run test:autonomous-distribution`
- `backend/.venv/Scripts/python.exe -m pytest` from `backend/`

## Current MVP State - 24/7 Production Automation Foundation

Status: verified on local checks.

DistributionOS now has the first production automation foundation for CareerScore while staying inside platform rules.

### CareerScore Webhook

Added:

- `apps/web/app/api/events/careerscore/route.ts`
- `npm run test:careerscore-webhook`

The webhook accepts CareerScore product events:

- `signup`
- `resume_upload`
- `free_score_generated`
- `paid_report`
- `referral_share`

Security and behavior:

- requires `x-careerscore-secret`
- uses server-only `CAREERSCORE_WEBHOOK_SECRET`
- resolves `tracking_id` against `tracking_links`
- writes trusted events into `conversion_events`
- stores paid report revenue in `event_value`
- does not expose webhook secrets to the browser

### 24/7 Cron Foundation

Added:

- `apps/web/app/api/cron/distribution/route.ts`
- `npm run test:cron-distribution`

The cron endpoint:

- requires `Authorization: Bearer ${CRON_SECRET}`
- finds active projects
- creates a daily distribution cycle when one does not already exist for the day
- creates campaign items, tracking links, publisher queue items, and scheduled posts
- runs dashboard QC at project level
- runs the publishing worker
- collects conversion metrics
- returns `projects_checked`, `cycles_run`, `assets_created`, `scheduled`, `published`, `manual_required`, and `errors`
- isolates per-project failures so one bad project does not crash the whole cron run

### Server Automation Client

Added:

- `apps/web/lib/supabase/admin.ts`

Server automation routes now use a server-only Supabase service role client through `SUPABASE_SERVICE_ROLE_KEY`.

This is required because webhooks and cron do not have a logged-in browser session.

### Publisher Connections

Added:

- `apps/web/lib/publisherConnections.ts`
- `npm run test:publisher-connections`
- `database/migrations/0016_add_publishing_connection_integration_status.sql`

Publisher connection framework now supports:

- LinkedIn
- Reddit
- Facebook
- Instagram
- YouTube
- Blog

Connection statuses now include:

- `not_connected`
- `connected`
- `expired`
- `permission_missing`
- `disabled`
- `integration_not_ready`

The framework explains exact setup needed without pretending a platform is connected.

### Blog Auto-Publishing

Added:

- `apps/web/lib/blogPublisher.ts`
- `apps/web/app/publications/[slug]/page.tsx`
- `npm run test:blog-publisher`

Blog/SEO scheduled posts can now be published internally to DistributionOS publication pages.

Behavior:

- generates a public `/publications/[slug]` URL
- marks the scheduled post as `published`
- saves `published_url`
- updates the linked publisher queue item
- keeps the tracking link inside the article
- does not rely on LinkedIn, Meta, Reddit, or YouTube approval

### Publisher Worker

Updated:

- `apps/web/lib/publishingWorker.ts`
- `apps/web/lib/publisherAdapters.ts`
- `apps/web/lib/publishingScheduler.ts`

Current worker behavior:

- publishes internal blog posts automatically
- marks missing social connections as `manual_required`
- marks unimplemented official adapters as `manual_required`
- caps attempts at 3
- never fakes published status
- never uses browser automation, scraping, or unofficial posting

Social adapter stubs now return:

- status
- platform
- reason
- exact setup needed

### Dashboard and Settings

Updated:

- Autopilot shows 24/7 Engine Status, Last cron run, CareerScore events received, blog published count, social manual-required status, webhook-driven signups/revenue, and next move
- Settings shows CareerScore webhook status, cron status, blog publishing readiness, and official setup requirements for LinkedIn, Reddit, Facebook, Instagram, and YouTube
- disabled placeholders show `Connect soon` / setup guidance only; no fake OAuth was added

### Environment Variables

Updated:

- `.env.example`
- `apps/web/.env.example`

Required server-side automation env vars:

- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `CAREERSCORE_WEBHOOK_SECRET`

Existing public frontend env vars still required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

### Migration Required

Yes.

Run:

- `database/migrations/0016_add_publishing_connection_integration_status.sql`

This migration only expands the `publishing_connections.connection_status` check constraint.

### Current Stable Mode

Truly automatic now:

- CareerScore webhook event intake
- conversion event storage
- protected cron route
- daily distribution asset creation
- tracking link creation
- scheduling
- dashboard QC checks
- internal blog auto-publishing
- dashboard result updates from webhook events

Still requires official platform approval:

- LinkedIn auto-publishing
- Reddit auto-publishing
- Facebook auto-publishing
- Instagram auto-publishing
- YouTube auto-publishing

No fake metrics, browser-bot posting, private scraping, spam automation, unauthorized external posting, or guaranteed results were added.

### Checks Verified

Passed:

- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:careerscore-webhook`
- `npm run test:cron-distribution`
- `npm run test:blog-publisher`
- `npm run test:publisher-connections`
- `npm run test:dashboard-qc`
- `npm run test:system-runner`
- `npm run test:publishing-system`
- `npm run test:autonomous-distribution`
- `npm run test:autopilot`
- `backend/.venv/Scripts/python.exe -m pytest` from `backend/`

### Production Next Step

Configure production env vars, run migration 0016 in Supabase, add a Vercel Cron call to `/api/cron/distribution`, connect CareerScore to `/api/events/careerscore`, then create official OAuth apps for each social platform when ready.

## Current MVP State - Production Readiness Cleanup

Status: verified on local checks.

Completed a focused production readiness cleanup without adding social OAuth, changing the database schema, or weakening existing Autopilot, tracking, system health, dashboard QC, webhook, cron, or blog publisher behavior.

### Public URL Handling

Added:

- `apps/web/lib/publicUrl.ts`

Tracking and publication links now use a single public URL helper:

- uses `NEXT_PUBLIC_APP_URL` when configured
- uses the current request origin when available
- falls back to `http://localhost:3001` only in local development
- returns relative paths instead of localhost when no production URL exists in production mode

Updated surfaces:

- Autopilot scheduled work tracking links
- Campaign tracking links and copy payloads
- public publication article CTA links
- internal blog published URLs
- Settings public URL display

### Blog Publishing Status

Blog publishing now displays as:

- `Auto-publish ready`

This applies to:

- Settings connection status
- Autopilot scheduled work cards for blog/SEO scheduled posts

Social platforms still show official connection/setup requirements and remain manual-required until real official integrations are connected.

### Results Separation

Autopilot data loading now separates production and demo/test data.

Production result totals exclude:

- `system_test` data
- demo/test campaign results
- demo/test tracking links
- demo/test conversion events

Demo/test totals are still available separately for UI validation.

Results page now defaults to production results and shows demo/test data in a separate section when present.

Autopilot Growth Results also shows production totals first and separates demo/test data visually.

### Settings Readiness Panel

Settings now shows:

- DistributionOS public URL
- CareerScore destination URL from Product Memory
- CareerScore webhook configured/not configured
- Cron secret configured/not configured
- Blog publishing auto-publish ready
- LinkedIn, Reddit, Facebook, Instagram, and YouTube need official connection

No fake OAuth or social posting was added.

### Migration Required

No new migration required for this cleanup.

The previously added migration 0016 is still required if not already applied.

### Checks Verified

Passed:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:dashboard-qc`
- `npm run test:system-runner`
- `npm run test:publishing-system`
- `npm run test:autonomous-distribution`
- `npm run test:autopilot`
- `backend/.venv/Scripts/python.exe -m pytest` from `backend/`

## Current MVP State - Three-Page Founder UX

Status: verified on local checks.

DistributionOS frontend is now simplified into a normal founder-facing three-page experience:

- Autopilot
- Results
- Settings

Backend logic, data models, migrations, tracking, scheduling, publisher queue, system health, and autonomous distribution services remain in place.

### Navigation Simplification

The normal app shell now shows only:

- Autopilot
- Results
- Settings

Top-level routes behave as founder-friendly entry points:

- `/` opens the latest project Autopilot page, or prompts project creation if no project exists
- `/results` opens the latest project Results page
- `/settings` opens the latest project Settings page

Project-scoped pages added:

- `/projects/[id]/results`
- `/projects/[id]/settings`

Internal pages remain available but are no longer normal sidebar items:

- Product Memory
- Research
- Actions
- Approvals
- Campaigns
- Project list/detail pages

They are reachable from small Advanced links for admin/debugging work.

### Autopilot Command Center

Autopilot is now the main command center and shows only the focused operating surface:

- Best Next Action
- System Health
- Growth Results
- Scheduled Work, capped to the top 5 scheduled assets
- Next Move
- small Advanced link cluster

The page keeps only one primary growth CTA:

- Run Autopilot

Scheduled Work cards keep the essential manual execution controls:

- Copy Post
- Copy Link
- Mark Posted
- Add Result

Confusing duplicate growth buttons and the main-flow demo result button were removed from the Autopilot page. The underlying demo/system-test action still exists for test/admin usage.

### Results

The Results page focuses on measured outcomes:

- clicks
- signups
- paid reports
- revenue
- resume uploads
- free scores
- referral shares
- best channel
- latest learning
- next best action

Demo/test data is still labeled when included.

### Settings

Settings now owns normal project configuration and small advanced/admin access.

Saving settings returns to `/projects/[id]/settings` through the existing `updateProject` action with a `return_to` field.

### Content Cleanup

The old broad CareerScore problem phrase is no longer visible in the dashboard or QA-tested app surface.

Visible stale content is sanitized to:

> Job seekers apply repeatedly but don’t know why they are not getting shortlisted.

Tracking placeholders continue to be replaced before rendering or copying.

### Current Stable Mode

Current mode remains:

- autonomous creation
- QA
- dashboard QC
- scheduling
- tracking
- manual-required publishing for unconnected platforms
- official publishing readiness only when real official integrations are connected

No backend model deletion, schema removal, unsafe auto-posting, scraping, external messaging, fake production metrics, or architecture rewrite was added.

### Checks Verified

Passed:

- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:dashboard-qc`
- `npm run test:system-runner`
- `npm run test:publishing-system`
- `npm run test:autopilot`
- `npm run test:autonomous-distribution`
- `backend/.venv/Scripts/python.exe -m pytest` from `backend/`

## Current MVP State - Auto QC Agent

Status: verified on local checks.

Added an Auto QC layer so DistributionOS cleans bad dashboard output before the founder sees it.

### Auto QC Agent

Added:

- `apps/web/lib/dashboardQcAgent.ts`
- `scripts/test-dashboard-qc-agent.mjs`
- `npm run test:dashboard-qc`

The QC agent detects:

- visible `system_test` / demo assets in normal dashboard lists
- duplicate scheduled work
- duplicate best assets
- raw tracking placeholders
- missing tracking URLs inside ready-to-post copy
- old robotic CareerScore phrasing
- meta-description copy instead of ready-to-post content
- too many scheduled items shown
- demo/test data requiring a clear label

### Dashboard Data Cleaning

The optimized Autopilot loader now returns cleaned dashboard data:

- filters `system_test` / demo assets from Scheduled Work and Best Assets
- dedupes Scheduled Work by platform, normalized title, and normalized content
- dedupes Best Assets by platform, title, and asset type
- prefers higher `quality_score` / `predicted_rank_score`
- prefers unique platforms
- returns max 5 visible Scheduled Work items
- returns max 5 visible Best Assets

No real database records are deleted. Cleanup is dashboard-data level first.

### Tracking Placeholder Cleanup

Before rendering/copying visible dashboard content, QC now:

- replaces `{tracking_link}`
- replaces `[tracking link]`
- appends the tracking URL if the content has no URL but a tracking URL exists

### Meta Description Conversion

QC converts meta descriptions into actual ready-to-post copy for:

- WhatsApp/community
- Reddit/community
- LinkedIn
- YouTube Shorts
- Blog/SEO

This prevents visible cards from showing planning descriptions like “A short community message...” instead of copy the founder can post.

### System Health QC

System Health now includes:

- Dashboard QC status
- dashboard clean check
- tracking placeholders fixed check
- duplicate assets hidden check
- scheduling idempotency check

The dashboard shows:

- `Dashboard QC: Passed`
- or `Dashboard QC: Needs Fix`

### Scheduling Idempotency

Scheduling now controls count inflation:

- skips queue items already scheduled
- skips same platform/title/content for the same project/date
- caps scheduled posts at 12 per project per day
- caps scheduled posts at 3 per platform per day

The distribution engine also avoids creating more than one normal distribution cycle per project per day.

### Current Stable Mode

Current stable mode remains:

- autonomous creation
- QA
- dashboard QC
- scheduling
- tracking
- manual-required publishing for unconnected platforms
- official publishing only after real official integrations are connected

No unsafe auto-posting, scraping, messaging, fake production metrics, or architecture rewrite was added.

### Checks Verified

Passed:

- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:dashboard-qc`
- `npm run test:system-runner`
- `npm run test:publishing-system`
- `npm run test:autopilot`
- `npm run test:autonomous-distribution`
- `backend/.venv/Scripts/python.exe -m pytest` from `backend/`

## Current MVP State - Dashboard Cleanup and Hardening

Status: verified on local checks.

Completed a focused Autopilot dashboard cleanup without adding new product surface area or changing the architecture.

### Cleanup Completed

The Autopilot dashboard still shows only:

- System Health
- Distribution Engine Status
- What DistributionOS did
- Growth Results
- Scheduled Work
- Best Assets
- Next Move

### Scheduled Work Cleanup

Scheduled Work now:

- shows max 5 items
- hides duplicate render-level items with the same platform, title, and content
- prefers higher `predicted_rank_score` / `quality_score` when linked queue data exists
- prefers unique platforms before filling remaining slots
- does not delete real scheduled records

### Content Cleanup

Visible Autopilot content now sanitizes old stored/generated content at render time:

- removes the old robotic CareerScore wording from dashboard-visible text
- replaces tracking placeholders with the actual full tracking URL before rendering or copying
- avoids showing raw tracking placeholders in Scheduled Work cards
- keeps generated copy focused on human CareerScore wording such as callbacks, shortlisting, and checking CareerScore before applying

### Demo/Test Data Labeling

Growth Results now clearly labels demo/test results:

- “Includes demo/test data”
- “Demo data is only for testing dashboard behavior.”

Demo/test results can still appear in totals for dashboard testing, but the UI no longer implies demo revenue is real production revenue.

### Real Winner Fallback

When no real winner exists, Growth Results now shows:

- “No real winner yet. Connect CareerScore events or add a real result after posting.”

The dashboard should not show vague fallback values like `na` for what worked.

### Current Stable Mode

Current mode remains:

- autonomous creation
- QA
- scheduling
- tracking
- manual-required publishing for unconnected platforms
- official publishing readiness only when real official integrations are connected

No unsafe auto-posting, scraping, external messaging, fake production metrics, or record deletion was added.

### Checks Verified

Passed:

- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:system-runner`
- `npm run test:publishing-system`
- `npm run test:autopilot`
- `npm run test:autonomous-distribution`
- `backend/.venv/Scripts/python.exe -m pytest` from `backend/`
