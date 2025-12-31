export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          display_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          display_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          display_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      quizzes: {
        Row: {
          category: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          questions: Json
          quiz_hash: string | null
          source_id: string | null
          subcategory: string | null
          tags: string[]
          title: string
          updated_at: string | null
          user_id: string
          version: number
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          questions: Json
          quiz_hash?: string | null
          source_id?: string | null
          subcategory?: string | null
          tags?: string[]
          title: string
          updated_at?: string | null
          user_id: string
          version?: number
        }
        Update: {
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          questions?: Json
          quiz_hash?: string | null
          source_id?: string | null
          subcategory?: string | null
          tags?: string[]
          title?: string
          updated_at?: string | null
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      results: {
        Row: {
          answers: Json
          category_breakdown: Json
          computed_category_scores: Json | null
          created_at: string
          deleted_at: string | null
          difficulty_ratings: Json | null
          flagged_questions: Json
          id: string
          mode: Database["public"]["Enums"]["quiz_mode"]
          question_ids: Json | null
          quiz_id: string
          score: number
          session_type: string | null
          source_map: Json | null
          time_per_question: Json | null
          time_taken_seconds: number
          timestamp: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          answers: Json
          category_breakdown: Json
          computed_category_scores?: Json | null
          created_at?: string
          deleted_at?: string | null
          difficulty_ratings?: Json | null
          flagged_questions?: Json
          id: string
          mode: Database["public"]["Enums"]["quiz_mode"]
          question_ids?: Json | null
          quiz_id: string
          score: number
          session_type?: string | null
          source_map?: Json | null
          time_per_question?: Json | null
          time_taken_seconds: number
          timestamp: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          answers?: Json
          category_breakdown?: Json
          computed_category_scores?: Json | null
          created_at?: string
          deleted_at?: string | null
          difficulty_ratings?: Json | null
          flagged_questions?: Json
          id?: string
          mode?: Database["public"]["Enums"]["quiz_mode"]
          question_ids?: Json | null
          quiz_id?: string
          score?: number
          session_type?: string | null
          source_map?: Json | null
          time_per_question?: Json | null
          time_taken_seconds?: number
          timestamp?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      srs: {
        Row: {
          box: number
          consecutive_correct: number
          created_at: string | null
          last_reviewed: number
          next_review: number
          question_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          box?: number
          consecutive_correct?: number
          created_at?: string | null
          last_reviewed: number
          next_review: number
          question_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          box?: number
          consecutive_correct?: number
          created_at?: string | null
          last_reviewed?: number
          next_review?: number
          question_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      upsert_srs_lww_batch: {
        Args: { items: Json }
        Returns: {
          out_question_id: string
          out_updated: boolean
        }[]
      }
    }
    Enums: {
      quiz_mode: "zen" | "proctor"
    }
    CompositeTypes: {
      srs_input: {
        question_id: string | null
        user_id: string | null
        box: number | null
        last_reviewed: number | null
        next_review: number | null
        consecutive_correct: number | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      quiz_mode: ["zen", "proctor"],
    },
  },
} as const
