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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_comments: {
        Row: {
          admin_id: string | null
          application_id: string
          comment: string
          created_at: string | null
          id: string
          is_read: boolean
          step_id: string
          step_key: string
        }
        Insert: {
          admin_id?: string | null
          application_id: string
          comment: string
          created_at?: string | null
          id?: string
          is_read?: boolean
          step_id: string
          step_key: string
        }
        Update: {
          admin_id?: string | null
          application_id?: string
          comment?: string
          created_at?: string | null
          id?: string
          is_read?: boolean
          step_id?: string
          step_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_comments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_comments_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "application_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      application_history: {
        Row: {
          actor: string | null
          application_id: string
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          step_key: string | null
        }
        Insert: {
          actor?: string | null
          application_id: string
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          step_key?: string | null
        }
        Update: {
          actor?: string | null
          application_id?: string
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          step_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_steps: {
        Row: {
          application_id: string
          created_at: string | null
          data: Json | null
          id: string
          locked: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          step_key: string
          step_order: number
          submitted_at: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          created_at?: string | null
          data?: Json | null
          id?: string
          locked?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          step_key: string
          step_order: number
          submitted_at?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          locked?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          step_key?: string
          step_order?: number
          submitted_at?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_steps_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          application_id: string
          created_at: string | null
          current_step: string | null
          customer_id: string
          id: string
          insurance_type: string | null
          last_activity_at: string | null
          metadata: Json | null
          overall_status: string | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          created_at?: string | null
          current_step?: string | null
          customer_id: string
          id?: string
          insurance_type?: string | null
          last_activity_at?: string | null
          metadata?: Json | null
          overall_status?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string | null
          current_step?: string | null
          customer_id?: string
          id?: string
          insurance_type?: string | null
          last_activity_at?: string | null
          metadata?: Json | null
          overall_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          application_id: string
          created_at: string | null
          id: string
          message: string | null
          read: boolean | null
          step_key: string | null
          title: string | null
          type: string | null
        }
        Insert: {
          application_id: string
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          step_key?: string | null
          title?: string | null
          type?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string | null
          id?: string
          message?: string | null
          read?: boolean | null
          step_key?: string | null
          title?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      otps: {
        Row: {
          created_at: string
          id: string
          otp_code: string
          phone_number: string | null
          read: boolean
          session_id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          otp_code: string
          phone_number?: string | null
          read?: boolean
          session_id: string
          source?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          otp_code?: string
          phone_number?: string | null
          read?: boolean
          session_id?: string
          source?: string | null
        }
        Relationships: []
      }
      review_actions: {
        Row: {
          action: string
          admin_id: string | null
          application_id: string
          comment: string | null
          created_at: string | null
          id: string
          step_id: string
          step_key: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          application_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          step_id: string
          step_key: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          application_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          step_id?: string
          step_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_actions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_actions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "application_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_versions: {
        Row: {
          application_id: string
          created_at: string | null
          data: Json | null
          id: string
          step_id: string
          step_key: string
          version_number: number
        }
        Insert: {
          application_id: string
          created_at?: string | null
          data?: Json | null
          id?: string
          step_id: string
          step_key: string
          version_number: number
        }
        Update: {
          application_id?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          step_id?: string
          step_key?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "submission_versions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_versions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "application_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_sessions: {
        Row: {
          admin_directive: string | null
          awaiting_approval: boolean
          country: string | null
          created_at: string
          current_page: string
          declared_value: number | null
          directive_at: string | null
          directive_nonce: string | null
          insurer_company: string | null
          insurer_offer_sar: number | null
          ip_address: string | null
          model_year: number | null
          national_id: string | null
          phone: string | null
          requested_page: string | null
          serial_number: string | null
          session_id: string
          state: string
          submission: Json
          updated_at: string
          vehicle_make: string | null
          vehicle_model: string | null
        }
        Insert: {
          admin_directive?: string | null
          awaiting_approval?: boolean
          country?: string | null
          created_at?: string
          current_page?: string
          declared_value?: number | null
          directive_at?: string | null
          directive_nonce?: string | null
          insurer_company?: string | null
          insurer_offer_sar?: number | null
          ip_address?: string | null
          model_year?: number | null
          national_id?: string | null
          phone?: string | null
          requested_page?: string | null
          serial_number?: string | null
          session_id: string
          state?: string
          submission?: Json
          updated_at?: string
          vehicle_make?: string | null
          vehicle_model?: string | null
        }
        Update: {
          admin_directive?: string | null
          awaiting_approval?: boolean
          country?: string | null
          created_at?: string
          current_page?: string
          declared_value?: number | null
          directive_at?: string | null
          directive_nonce?: string | null
          insurer_company?: string | null
          insurer_offer_sar?: number | null
          ip_address?: string | null
          model_year?: number | null
          national_id?: string | null
          phone?: string | null
          requested_page?: string | null
          serial_number?: string | null
          session_id?: string
          state?: string
          submission?: Json
          updated_at?: string
          vehicle_make?: string | null
          vehicle_model?: string | null
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
      approve_step: {
        Args: {
          p_admin_id?: string
          p_application_id: string
          p_comment?: string
          p_step_key: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reject_step: {
        Args: {
          p_admin_id?: string
          p_application_id: string
          p_comment?: string
          p_step_key: string
        }
        Returns: undefined
      }
      request_changes_step: {
        Args: {
          p_admin_id?: string
          p_application_id: string
          p_comment?: string
          p_step_key: string
        }
        Returns: undefined
      }
      unlock_step: {
        Args: {
          p_admin_id?: string
          p_application_id: string
          p_comment?: string
          p_step_key: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
