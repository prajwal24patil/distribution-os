export type ProjectStatus = "active" | "planning" | "paused";

export type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  customer: string;
  status: ProjectStatus;
  channel: string;
  owner: string;
  goal: string;
  summary: string;
  progress: number;
  experiments: number;
  content_items: number;
  next_action: string;
  next_recommendation: string;
  created_at: string;
  updated_at: string;
};

export type ProjectInsert = {
  user_id: string;
  name: string;
  customer?: string;
  status?: ProjectStatus;
  channel?: string;
  owner?: string;
  goal: string;
  summary?: string;
  progress?: number;
  experiments?: number;
  content_items?: number;
  next_action?: string;
  next_recommendation?: string;
};

export type ProjectUpdate = Partial<Omit<ProjectInsert, "user_id">>;

export type ProductMemoryRow = {
  id: string;
  project_id: string;
  owner_id: string;
  product_name: string;
  website_url: string;
  product_summary: string;
  target_users: string;
  primary_problem: string;
  value_proposition: string;
  pricing: string;
  current_stage: string;
  primary_goal: string;
  target_countries: string;
  preferred_channels: string;
  competitors: string;
  brand_voice: string;
  constraints: string;
  product_url: string;
  product_goal: string;
  target_audience: string;
  offer: string;
  primary_cta: string;
  brand_tone: string;
  allowed_channels: string;
  publishing_mode: PublishingMode;
  created_at: string;
  updated_at: string;
};

export type PublishingMode = "manual_approval" | "official_auto_publish_ready" | "paused";

export type ProductMemoryInsert = {
  project_id: string;
  owner_id: string;
  product_name: string;
  website_url?: string;
  product_summary: string;
  target_users?: string;
  primary_problem?: string;
  value_proposition?: string;
  pricing?: string;
  current_stage?: string;
  primary_goal?: string;
  target_countries?: string;
  preferred_channels?: string;
  competitors?: string;
  brand_voice?: string;
  constraints?: string;
  product_url?: string;
  product_goal?: string;
  target_audience?: string;
  offer?: string;
  primary_cta?: string;
  brand_tone?: string;
  allowed_channels?: string;
  publishing_mode?: PublishingMode;
};

export type ProductMemoryUpdate = Partial<Omit<ProductMemoryInsert, "project_id" | "owner_id">>;

export type ResearchRunRow = {
  id: string;
  project_id: string;
  owner_id: string;
  audience_insights: string;
  competitor_insights: string;
  keyword_opportunities: string;
  channel_opportunities: string;
  pain_points: string;
  positioning_angles: string;
  assumptions: string;
  confidence_score: number;
  created_at: string;
  updated_at: string;
};

export type ResearchRunInsert = {
  project_id: string;
  owner_id: string;
  audience_insights: string;
  competitor_insights: string;
  keyword_opportunities: string;
  channel_opportunities: string;
  pain_points: string;
  positioning_angles: string;
  assumptions: string;
  confidence_score: number;
};

export type ResearchRunUpdate = Partial<Omit<ResearchRunInsert, "project_id" | "owner_id">>;

export type GrowthActionCategory =
  | "linkedin_post"
  | "seo_blog"
  | "whatsapp_community"
  | "landing_page"
  | "founder_next_action";

export type GrowthActionStatus = "pending" | "approved" | "rejected" | "completed";

export type GrowthActionRow = {
  id: string;
  project_id: string;
  research_run_id: string | null;
  owner_id: string;
  category: GrowthActionCategory;
  title: string;
  description: string;
  status: GrowthActionStatus;
  created_at: string;
  updated_at: string;
};

export type GrowthActionInsert = {
  project_id: string;
  research_run_id?: string | null;
  owner_id: string;
  category: GrowthActionCategory;
  title: string;
  description?: string;
  status?: GrowthActionStatus;
};

export type GrowthActionUpdate = Partial<
  Omit<GrowthActionInsert, "project_id" | "research_run_id" | "owner_id">
>;

export type ExecutionResultStatus = "pending" | "success" | "failed" | "needs_follow_up";

export type ExecutionLogRow = {
  id: string;
  project_id: string;
  owner_id: string;
  growth_action_id: string;
  execution_type: string;
  channel: string;
  executed_at: string;
  executed_by: string;
  external_url: string;
  notes: string;
  result_metric: string;
  result_value: string;
  learning: string;
  result_status: ExecutionResultStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ExecutionLogInsert = {
  project_id: string;
  owner_id: string;
  growth_action_id: string;
  execution_type?: string;
  channel: string;
  executed_at?: string;
  executed_by?: string;
  external_url?: string;
  notes?: string;
  result_metric?: string;
  result_value?: string;
  learning?: string;
  result_status?: ExecutionResultStatus;
  completed_at?: string | null;
};

export type ExecutionLogUpdate = Partial<
  Omit<ExecutionLogInsert, "project_id" | "owner_id" | "growth_action_id">
>;

export type CampaignType =
  | "linkedin_founder_post"
  | "seo_blog"
  | "whatsapp_community_share"
  | "reddit_community_reply"
  | "landing_page_headline"
  | "referral_campaign";

export type CampaignStatus = "draft" | "active" | "completed";

export type CampaignItemStatus = "draft" | "approved" | "posted" | "completed" | "failed";

export type CampaignRow = {
  id: string;
  project_id: string;
  owner_id: string;
  name: string;
  campaign_type: CampaignType;
  status: CampaignStatus;
  next_action: string;
  created_at: string;
  updated_at: string;
};

export type CampaignInsert = {
  project_id: string;
  owner_id: string;
  name: string;
  campaign_type: CampaignType;
  status?: CampaignStatus;
  next_action?: string;
};

export type CampaignUpdate = Partial<Omit<CampaignInsert, "project_id" | "owner_id">>;

export type CampaignItemRow = {
  id: string;
  campaign_id: string;
  project_id: string;
  owner_id: string;
  campaign_type: CampaignType;
  channel: string;
  hook: string;
  content: string;
  target_audience: string;
  cta: string;
  expected_outcome: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_link: string;
  status: CampaignItemStatus;
  created_at: string;
  updated_at: string;
};

export type CampaignItemInsert = {
  campaign_id: string;
  project_id: string;
  owner_id: string;
  campaign_type: CampaignType;
  channel: string;
  hook: string;
  content: string;
  target_audience: string;
  cta: string;
  expected_outcome: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_link: string;
  status?: CampaignItemStatus;
};

export type CampaignItemUpdate = Partial<
  Omit<CampaignItemInsert, "campaign_id" | "project_id" | "owner_id">
>;

export type CampaignResultRow = {
  id: string;
  campaign_id: string;
  campaign_item_id: string;
  project_id: string;
  owner_id: string;
  views: number;
  clicks: number;
  signups: number;
  paid_users: number;
  revenue: number;
  learning: string;
  created_at: string;
  updated_at: string;
};

export type CampaignResultInsert = {
  campaign_id: string;
  campaign_item_id: string;
  project_id: string;
  owner_id: string;
  views?: number;
  clicks?: number;
  signups?: number;
  paid_users?: number;
  revenue?: number;
  learning?: string;
};

export type CampaignResultUpdate = Partial<
  Omit<CampaignResultInsert, "campaign_id" | "campaign_item_id" | "project_id" | "owner_id">
>;

export type TrackingLinkRow = {
  id: string;
  project_id: string;
  owner_id: string;
  campaign_item_id: string;
  destination_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  tracking_url: string;
  clicks: number;
  created_at: string;
  updated_at: string;
};

export type TrackingLinkInsert = {
  id?: string;
  project_id: string;
  owner_id: string;
  campaign_item_id: string;
  destination_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  tracking_url: string;
  clicks?: number;
};

export type TrackingLinkUpdate = Partial<
  Omit<TrackingLinkInsert, "id" | "project_id" | "owner_id" | "campaign_item_id">
>;

export type ClickEventRow = {
  id: string;
  tracking_link_id: string;
  project_id: string;
  owner_id: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  clicked_at: string;
};

export type ClickEventInsert = {
  tracking_link_id: string;
  project_id: string;
  owner_id: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  clicked_at?: string;
};

export type ClickEventUpdate = never;

export type AutopilotRunStatus = "ready" | "needs_input" | "applied";

export type AutopilotRunRow = {
  id: string;
  project_id: string;
  owner_id: string;
  detected_problem: string;
  applied_fix: string;
  work_created: string;
  next_step: string;
  status: AutopilotRunStatus;
  created_at: string;
  updated_at: string;
};

export type AutopilotRunInsert = {
  project_id: string;
  owner_id: string;
  detected_problem: string;
  applied_fix: string;
  work_created?: string;
  next_step: string;
  status?: AutopilotRunStatus;
};

export type AutopilotRunUpdate = Partial<Omit<AutopilotRunInsert, "project_id" | "owner_id">>;

export type DailyAutopilotRunStatus = "completed" | "skipped" | "failed";

export type DailyAutopilotRunRow = {
  id: string;
  project_id: string;
  owner_id: string;
  run_date: string;
  status: DailyAutopilotRunStatus;
  problem_found: string;
  fix_applied: string;
  work_created_count: number;
  next_step: string;
  created_at: string;
  updated_at: string;
};

export type DailyAutopilotRunInsert = {
  project_id: string;
  owner_id: string;
  run_date?: string;
  status?: DailyAutopilotRunStatus;
  problem_found: string;
  fix_applied: string;
  work_created_count?: number;
  next_step?: string;
};

export type DailyAutopilotRunUpdate = Partial<
  Omit<DailyAutopilotRunInsert, "project_id" | "owner_id">
>;

export type PublisherQueueStatus =
  | "draft"
  | "ready_for_approval"
  | "approved"
  | "scheduled_manual"
  | "posted"
  | "failed";

export type PublisherQueueRow = {
  id: string;
  project_id: string;
  owner_id: string;
  campaign_item_id: string | null;
  platform: string;
  content_type: string;
  title: string;
  content: string;
  tracking_url: string;
  status: PublisherQueueStatus;
  scheduled_for: string | null;
  posted_url: string;
  result_notes: string;
  asset_type: string;
  format: string;
  short_video_script: string;
  blog_outline: string;
  caption: string;
  landing_copy: string;
  referral_copy: string;
  quality_score: number;
  qa_status: string;
  qa_reason: string;
  predicted_rank_score: number;
  publishing_status: string;
  published_url: string;
  result_summary: string;
  created_at: string;
  updated_at: string;
};

export type PublisherQueueInsert = {
  project_id: string;
  owner_id: string;
  campaign_item_id?: string | null;
  platform: string;
  content_type: string;
  title: string;
  content: string;
  tracking_url?: string;
  status?: PublisherQueueStatus;
  scheduled_for?: string | null;
  posted_url?: string;
  result_notes?: string;
  asset_type?: string;
  format?: string;
  short_video_script?: string;
  blog_outline?: string;
  caption?: string;
  landing_copy?: string;
  referral_copy?: string;
  quality_score?: number;
  qa_status?: string;
  qa_reason?: string;
  predicted_rank_score?: number;
  publishing_status?: string;
  published_url?: string;
  result_summary?: string;
};

export type PublisherQueueUpdate = Partial<
  Omit<PublisherQueueInsert, "project_id" | "owner_id" | "campaign_item_id">
>;

export type DistributionCycleType = "manual" | "daily" | "weekly";

export type DistributionCycleStatus = "running" | "completed" | "failed" | "paused";

export type DistributionCycleRow = {
  id: string;
  project_id: string;
  owner_id: string;
  cycle_type: DistributionCycleType;
  status: DistributionCycleStatus;
  product_url: string;
  strategy_summary: string;
  channels_selected: string;
  content_created_count: number;
  content_approved_count: number;
  content_rejected_count: number;
  published_count: number;
  queued_count: number;
  clicks: number;
  signups: number;
  paid_users: number;
  revenue: number;
  learning_summary: string;
  next_cycle_plan: string;
  created_at: string;
  updated_at: string;
};

export type DistributionCycleInsert = {
  project_id: string;
  owner_id: string;
  cycle_type?: DistributionCycleType;
  status?: DistributionCycleStatus;
  product_url?: string;
  strategy_summary?: string;
  channels_selected?: string;
  content_created_count?: number;
  content_approved_count?: number;
  content_rejected_count?: number;
  published_count?: number;
  queued_count?: number;
  clicks?: number;
  signups?: number;
  paid_users?: number;
  revenue?: number;
  learning_summary?: string;
  next_cycle_plan?: string;
};

export type DistributionCycleUpdate = Partial<
  Omit<DistributionCycleInsert, "project_id" | "owner_id">
>;

export type PublishingConnectionPlatform =
  | "linkedin"
  | "reddit"
  | "facebook"
  | "instagram"
  | "youtube"
  | "blog";

export type PublishingConnectionStatus =
  | "not_connected"
  | "connected"
  | "expired"
  | "permission_missing"
  | "disabled"
  | "integration_not_ready";

export type PublishingConnectionRow = {
  id: string;
  project_id: string;
  owner_id: string;
  platform: PublishingConnectionPlatform;
  connection_status: PublishingConnectionStatus;
  account_name: string;
  account_id: string;
  access_token_encrypted_placeholder: string;
  refresh_token_encrypted_placeholder: string;
  expires_at: string | null;
  permissions: string;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublishingConnectionInsert = {
  project_id: string;
  owner_id: string;
  platform: PublishingConnectionPlatform;
  connection_status?: PublishingConnectionStatus;
  account_name?: string;
  account_id?: string;
  access_token_encrypted_placeholder?: string;
  refresh_token_encrypted_placeholder?: string;
  expires_at?: string | null;
  permissions?: string;
  last_checked_at?: string | null;
};

export type PublishingConnectionUpdate = Partial<
  Omit<PublishingConnectionInsert, "project_id" | "owner_id" | "platform">
>;

export type ScheduledPostStatus =
  | "ready"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "skipped"
  | "manual_required";

export type ScheduledPostPublishMode = "manual_approval" | "official_auto_publish" | "disabled";

export type ScheduledPostRow = {
  id: string;
  project_id: string;
  owner_id: string;
  publisher_queue_id: string;
  platform: string;
  content_type: string;
  title: string;
  content: string;
  tracking_url: string;
  scheduled_for: string;
  timezone: string;
  status: ScheduledPostStatus;
  publish_mode: ScheduledPostPublishMode;
  publish_attempts: number;
  published_url: string;
  failure_reason: string;
  created_at: string;
  updated_at: string;
};

export type ScheduledPostInsert = {
  project_id: string;
  owner_id: string;
  publisher_queue_id: string;
  platform: string;
  content_type: string;
  title: string;
  content: string;
  tracking_url?: string;
  scheduled_for: string;
  timezone?: string;
  status?: ScheduledPostStatus;
  publish_mode?: ScheduledPostPublishMode;
  publish_attempts?: number;
  published_url?: string;
  failure_reason?: string;
};

export type ScheduledPostUpdate = Partial<
  Omit<ScheduledPostInsert, "project_id" | "owner_id" | "publisher_queue_id">
>;

export type ConversionEventType =
  | "click"
  | "signup"
  | "resume_upload"
  | "free_score_generated"
  | "paid_report"
  | "referral_share"
  | "revenue";

export type ConversionEventRow = {
  id: string;
  project_id: string;
  owner_id: string;
  tracking_link_id: string | null;
  campaign_item_id: string | null;
  scheduled_post_id: string | null;
  event_type: ConversionEventType;
  event_value: number;
  source: string;
  platform: string;
  occurred_at: string;
  created_at: string;
};

export type ConversionEventInsert = {
  project_id: string;
  owner_id: string;
  tracking_link_id?: string | null;
  campaign_item_id?: string | null;
  scheduled_post_id?: string | null;
  event_type: ConversionEventType;
  event_value?: number;
  source?: string;
  platform?: string;
  occurred_at?: string;
};

export type ConversionEventUpdate = never;

export type SystemTestStatus = "pass" | "fail" | "warning";

export type SystemTestResult = {
  name: string;
  status: SystemTestStatus;
  message: string;
  details: string;
  duration_ms: number;
  fix_instruction?: string;
};

export type SystemTestRunRow = {
  id: string;
  project_id: string;
  owner_id: string;
  status: SystemTestStatus;
  total_tests: number;
  passed: number;
  failed: number;
  warnings: number;
  summary: string;
  results_json: SystemTestResult[];
  created_at: string;
};

export type SystemTestRunInsert = {
  project_id: string;
  owner_id: string;
  status: SystemTestStatus;
  total_tests?: number;
  passed?: number;
  failed?: number;
  warnings?: number;
  summary?: string;
  results_json?: SystemTestResult[];
};

export type SystemTestRunUpdate = never;

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: ProjectRow;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
        Relationships: [];
      };
      product_memory: {
        Row: ProductMemoryRow;
        Insert: ProductMemoryInsert;
        Update: ProductMemoryUpdate;
        Relationships: [
          {
            foreignKeyName: "product_memory_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      research_runs: {
        Row: ResearchRunRow;
        Insert: ResearchRunInsert;
        Update: ResearchRunUpdate;
        Relationships: [
          {
            foreignKeyName: "research_runs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      growth_actions: {
        Row: GrowthActionRow;
        Insert: GrowthActionInsert;
        Update: GrowthActionUpdate;
        Relationships: [
          {
            foreignKeyName: "growth_actions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "growth_actions_research_run_id_fkey";
            columns: ["research_run_id"];
            isOneToOne: false;
            referencedRelation: "research_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      execution_logs: {
        Row: ExecutionLogRow;
        Insert: ExecutionLogInsert;
        Update: ExecutionLogUpdate;
        Relationships: [
          {
            foreignKeyName: "execution_logs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "execution_logs_growth_action_id_fkey";
            columns: ["growth_action_id"];
            isOneToOne: false;
            referencedRelation: "growth_actions";
            referencedColumns: ["id"];
          },
        ];
      };
      campaigns: {
        Row: CampaignRow;
        Insert: CampaignInsert;
        Update: CampaignUpdate;
        Relationships: [
          {
            foreignKeyName: "campaigns_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_items: {
        Row: CampaignItemRow;
        Insert: CampaignItemInsert;
        Update: CampaignItemUpdate;
        Relationships: [
          {
            foreignKeyName: "campaign_items_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_items_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_results: {
        Row: CampaignResultRow;
        Insert: CampaignResultInsert;
        Update: CampaignResultUpdate;
        Relationships: [
          {
            foreignKeyName: "campaign_results_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_results_campaign_item_id_fkey";
            columns: ["campaign_item_id"];
            isOneToOne: false;
            referencedRelation: "campaign_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_results_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      tracking_links: {
        Row: TrackingLinkRow;
        Insert: TrackingLinkInsert;
        Update: TrackingLinkUpdate;
        Relationships: [
          {
            foreignKeyName: "tracking_links_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracking_links_campaign_item_id_fkey";
            columns: ["campaign_item_id"];
            isOneToOne: false;
            referencedRelation: "campaign_items";
            referencedColumns: ["id"];
          },
        ];
      };
      click_events: {
        Row: ClickEventRow;
        Insert: ClickEventInsert;
        Update: ClickEventUpdate;
        Relationships: [
          {
            foreignKeyName: "click_events_tracking_link_id_fkey";
            columns: ["tracking_link_id"];
            isOneToOne: false;
            referencedRelation: "tracking_links";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "click_events_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      autopilot_runs: {
        Row: AutopilotRunRow;
        Insert: AutopilotRunInsert;
        Update: AutopilotRunUpdate;
        Relationships: [
          {
            foreignKeyName: "autopilot_runs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_autopilot_runs: {
        Row: DailyAutopilotRunRow;
        Insert: DailyAutopilotRunInsert;
        Update: DailyAutopilotRunUpdate;
        Relationships: [
          {
            foreignKeyName: "daily_autopilot_runs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      publisher_queue: {
        Row: PublisherQueueRow;
        Insert: PublisherQueueInsert;
        Update: PublisherQueueUpdate;
        Relationships: [
          {
            foreignKeyName: "publisher_queue_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "publisher_queue_campaign_item_id_fkey";
            columns: ["campaign_item_id"];
            isOneToOne: false;
            referencedRelation: "campaign_items";
            referencedColumns: ["id"];
          },
        ];
      };
      distribution_cycles: {
        Row: DistributionCycleRow;
        Insert: DistributionCycleInsert;
        Update: DistributionCycleUpdate;
        Relationships: [
          {
            foreignKeyName: "distribution_cycles_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      publishing_connections: {
        Row: PublishingConnectionRow;
        Insert: PublishingConnectionInsert;
        Update: PublishingConnectionUpdate;
        Relationships: [
          {
            foreignKeyName: "publishing_connections_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      scheduled_posts: {
        Row: ScheduledPostRow;
        Insert: ScheduledPostInsert;
        Update: ScheduledPostUpdate;
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scheduled_posts_publisher_queue_id_fkey";
            columns: ["publisher_queue_id"];
            isOneToOne: false;
            referencedRelation: "publisher_queue";
            referencedColumns: ["id"];
          },
        ];
      };
      conversion_events: {
        Row: ConversionEventRow;
        Insert: ConversionEventInsert;
        Update: ConversionEventUpdate;
        Relationships: [
          {
            foreignKeyName: "conversion_events_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversion_events_tracking_link_id_fkey";
            columns: ["tracking_link_id"];
            isOneToOne: false;
            referencedRelation: "tracking_links";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversion_events_scheduled_post_id_fkey";
            columns: ["scheduled_post_id"];
            isOneToOne: false;
            referencedRelation: "scheduled_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      system_test_runs: {
        Row: SystemTestRunRow;
        Insert: SystemTestRunInsert;
        Update: SystemTestRunUpdate;
        Relationships: [
          {
            foreignKeyName: "system_test_runs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
