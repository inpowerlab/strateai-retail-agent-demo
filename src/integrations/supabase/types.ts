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
      admin_audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          error_message: string | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      file_uploads: {
        Row: {
          batch_id: string
          error_message: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          processed_at: string | null
          storage_path: string | null
          upload_status: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          batch_id: string
          error_message?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          processed_at?: string | null
          storage_path?: string | null
          upload_status?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          batch_id?: string
          error_message?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          processed_at?: string | null
          storage_path?: string | null
          upload_status?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
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
          imagenes_urls: string[] | null
          nombre: string
          precio: number
          video_url: string | null
        }
        Insert: {
          cantidad_disponible?: number
          categoria: string
          created_at?: string
          descripcion: string
          id?: string
          imagen_url: string
          imagenes_urls?: string[] | null
          nombre: string
          precio: number
          video_url?: string | null
        }
        Update: {
          cantidad_disponible?: number
          categoria?: string
          created_at?: string
          descripcion?: string
          id?: string
          imagen_url?: string
          imagenes_urls?: string[] | null
          nombre?: string
          precio?: number
          video_url?: string | null
        }
        Relationships: []
      }
      staging_products: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          batch_id: string
          cantidad_disponible: number | null
          categoria: string | null
          descripcion: string | null
          id: string
          imagen_url: string | null
          imagenes_urls: string[] | null
          imported_at: string
          imported_by: string | null
          nombre: string | null
          original_data: Json | null
          precio: number | null
          published_at: string | null
          sku: string | null
          source_file_name: string | null
          source_row_number: number | null
          validated_at: string | null
          validated_by: string | null
          validation_errors: Json | null
          validation_status: string | null
          video_url: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          batch_id: string
          cantidad_disponible?: number | null
          categoria?: string | null
          descripcion?: string | null
          id?: string
          imagen_url?: string | null
          imagenes_urls?: string[] | null
          imported_at?: string
          imported_by?: string | null
          nombre?: string | null
          original_data?: Json | null
          precio?: number | null
          published_at?: string | null
          sku?: string | null
          source_file_name?: string | null
          source_row_number?: number | null
          validated_at?: string | null
          validated_by?: string | null
          validation_errors?: Json | null
          validation_status?: string | null
          video_url?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          batch_id?: string
          cantidad_disponible?: number | null
          categoria?: string | null
          descripcion?: string | null
          id?: string
          imagen_url?: string | null
          imagenes_urls?: string[] | null
          imported_at?: string
          imported_by?: string | null
          nombre?: string | null
          original_data?: Json | null
          precio?: number | null
          published_at?: string | null
          sku?: string | null
          source_file_name?: string | null
          source_row_number?: number | null
          validated_at?: string | null
          validated_by?: string | null
          validation_errors?: Json | null
          validation_status?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      publish_staging_products: {
        Args: { staging_ids: string[]; admin_user_id: string }
        Returns: {
          success: boolean
          published_count: number
          error_message: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
