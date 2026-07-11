export type Database = {
  public: {
    Tables: {
      castle_progress: {
        Row: {
          user_id: string;
          progress_map: unknown;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          progress_map: unknown;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          progress_map?: unknown;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
