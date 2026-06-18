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

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: ProjectRow;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
