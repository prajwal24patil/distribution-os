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
  created_at: string;
  updated_at: string;
};

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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
