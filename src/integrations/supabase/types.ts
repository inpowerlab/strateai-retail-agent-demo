export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      code_generation_logs: {
        Row: {
          code_hash: string | null
          code_length: number | null
          created_at: string
          error_message: string | null
          eslint_errors: Json | null
          eslint_warnings: Json | null
          framework: string | null
          generated_at: string
          id: string
          language: string | null
          openai_latency_ms: number | null
          prompt: string | null
          request_count: number | null
          security_issues: Json | null
          success: boolean
          test_code_errors: Json | null
          test_code_generated: boolean | null
          test_code_valid: boolean | null
          total_processing_ms: number | null
          typescript_errors: Json | null
          typescript_valid: boolean | null
          user_id: string | null
          user_ip: unknown | null
        }
        Insert: {
          code_hash?: string | null
          code_length?: number | null
          created_at?: string
          error_message?: string | null
          eslint_errors?: Json | null
          eslint_warnings?: Json | null
          framework?: string | null
          generated_at?: string
          id?: string
          language?: string | null
          openai_latency_ms?: number | null
          prompt?: string | null
          request_count?: number | null
          security_issues?: Json | null
          success?: boolean
          test_code_errors?: Json | null
          test_code_generated?: boolean | null
          test_code_valid?: boolean | null
          total_processing_ms?: number | null
          typescript_errors?: Json | null
          typescript_valid?: boolean | null
          user_id?: string | null
          user_ip?: unknown | null
        }
        Update: {
          code_hash?: string | null
          code_length?: number | null
          created_at?: string
          error_message?: string | null
          eslint_errors?: Json | null
          eslint_warnings?: Json | null
          framework?: string | null
          generated_at?: string
          id?: string
          language?: string | null
          openai_latency_ms?: number | null
          prompt?: string | null
          request_count?: number | null
          security_issues?: Json | null
          success?: boolean
          test_code_errors?: Json | null
          test_code_generated?: boolean | null
          test_code_valid?: boolean | null
          total_processing_ms?: number | null
          typescript_errors?: Json | null
          typescript_valid?: boolean | null
          user_id?: string | null
          user_ip?: unknown | null
        }
        Relationships: []
      }
      code_generation_rate_limits: {
        Row: {
          created_at: string
          id: string
          identifier: string
          request_count: number | null
          updated_at: string
          window_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          identifier: string
          request_count?: number | null
          updated_at?: string
          window_start?: string
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string
          request_count?: number | null
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      conversaciones: {
        Row: {
          id: string
          session_id: string
          started_at: string
        }
        Insert: {
          id?: string
          session_id: string
          started_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          started_at?: string
        }
        Relationships: []
      }
      mensajes: {
        Row: {
          content: string
          conversacion_id: string | null
          id: string
          sender: string
          timestamp: string
        }
        Insert: {
          content: string
          conversacion_id?: string | null
          id?: string
          sender: string
          timestamp?: string
        }
        Update: {
          content?: string
          conversacion_id?: string | null
          id?: string
          sender?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_conversacion_id_fkey"
            columns: ["conversacion_id"]
            isOneToOne: false
            referencedRelation: "conversaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          cantidad_disponible: number
          categoria: string
          created_at: string
          descripcion: string
          id: string
          imagen_url: string
          nombre: string
          precio: number
        }
        Insert: {
          cantidad_disponible?: number
          categoria: string
          created_at?: string
          descripcion: string
          id?: string
          imagen_url: string
          nombre: string
          precio: number
        }
        Update: {
          cantidad_disponible?: number
          categoria?: string
          created_at?: string
          descripcion?: string
          id?: string
          imagen_url?: string
          nombre?: string
          precio?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
