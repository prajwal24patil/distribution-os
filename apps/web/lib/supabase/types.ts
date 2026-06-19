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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
