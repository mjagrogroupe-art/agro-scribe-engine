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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      approval_history: {
        Row: {
          approved_by_profile_id: string
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["project_status"]
          previous_status: Database["public"]["Enums"]["project_status"]
          project_id: string
          rejection_reason: string | null
        }
        Insert: {
          approved_by_profile_id: string
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["project_status"]
          previous_status: Database["public"]["Enums"]["project_status"]
          project_id: string
          rejection_reason?: string | null
        }
        Update: {
          approved_by_profile_id?: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["project_status"]
          previous_status?: Database["public"]["Enums"]["project_status"]
          project_id?: string
          rejection_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_history_approved_by_profile_id_fkey"
            columns: ["approved_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      compliance_checks: {
        Row: {
          check_name: string
          checked_at: string
          id: string
          notes: string | null
          passed: boolean
          project_id: string
        }
        Insert: {
          check_name: string
          checked_at?: string
          id?: string
          notes?: string | null
          passed: boolean
          project_id: string
        }
        Update: {
          check_name?: string
          checked_at?: string
          id?: string
          notes?: string | null
          passed?: boolean
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_checks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_captions: {
        Row: {
          caption_text: string
          created_at: string
          hashtags: string[] | null
          id: string
          is_selected: boolean | null
          platform: Database["public"]["Enums"]["platform_target"]
          project_id: string
          seo_description: string | null
          seo_title: string | null
        }
        Insert: {
          caption_text: string
          created_at?: string
          hashtags?: string[] | null
          id?: string
          is_selected?: boolean | null
          platform: Database["public"]["Enums"]["platform_target"]
          project_id: string
          seo_description?: string | null
          seo_title?: string | null
        }
        Update: {
          caption_text?: string
          created_at?: string
          hashtags?: string[] | null
          id?: string
          is_selected?: boolean | null
          platform?: Database["public"]["Enums"]["platform_target"]
          project_id?: string
          seo_description?: string | null
          seo_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_captions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_hooks: {
        Row: {
          created_at: string
          hook_text: string
          hook_type: Database["public"]["Enums"]["hook_type"]
          id: string
          is_selected: boolean | null
          project_id: string
          retention_score: number | null
        }
        Insert: {
          created_at?: string
          hook_text: string
          hook_type: Database["public"]["Enums"]["hook_type"]
          id?: string
          is_selected?: boolean | null
          project_id: string
          retention_score?: number | null
        }
        Update: {
          created_at?: string
          hook_text?: string
          hook_type?: Database["public"]["Enums"]["hook_type"]
          id?: string
          is_selected?: boolean | null
          project_id?: string
          retention_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_hooks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_scripts: {
        Row: {
          brand_anchor: string
          created_at: string
          duration_seconds: number
          full_script: string
          hook_section: string
          id: string
          is_selected: boolean | null
          platform: Database["public"]["Enums"]["platform_target"]
          project_id: string
          soft_cta: string
          value_delivery: string
        }
        Insert: {
          brand_anchor: string
          created_at?: string
          duration_seconds: number
          full_script: string
          hook_section: string
          id?: string
          is_selected?: boolean | null
          platform: Database["public"]["Enums"]["platform_target"]
          project_id: string
          soft_cta: string
          value_delivery: string
        }
        Update: {
          brand_anchor?: string
          created_at?: string
          duration_seconds?: number
          full_script?: string
          hook_section?: string
          id?: string
          is_selected?: boolean | null
          platform?: Database["public"]["Enums"]["platform_target"]
          project_id?: string
          soft_cta?: string
          value_delivery?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_scripts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          brand_id: string
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      project_content_types: {
        Row: {
          content_type: Database["public"]["Enums"]["content_type"]
          id: string
          project_id: string
        }
        Insert: {
          content_type: Database["public"]["Enums"]["content_type"]
          id?: string
          project_id: string
        }
        Update: {
          content_type?: Database["public"]["Enums"]["content_type"]
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_content_types_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_markets: {
        Row: {
          id: string
          market: Database["public"]["Enums"]["market_region"]
          project_id: string
        }
        Insert: {
          id?: string
          market: Database["public"]["Enums"]["market_region"]
          project_id: string
        }
        Update: {
          id?: string
          market?: Database["public"]["Enums"]["market_region"]
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_markets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_platforms: {
        Row: {
          id: string
          platform: Database["public"]["Enums"]["platform_target"]
          project_id: string
        }
        Insert: {
          id?: string
          platform: Database["public"]["Enums"]["platform_target"]
          project_id: string
        }
        Update: {
          id?: string
          platform?: Database["public"]["Enums"]["platform_target"]
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_platforms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          brand_id: string
          created_at: string
          created_by_profile_id: string
          id: string
          language: Database["public"]["Enums"]["language_code"]
          name: string
          product_sku: string | null
          status: Database["public"]["Enums"]["project_status"]
          suggested_duration: number | null
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          created_by_profile_id: string
          id?: string
          language?: Database["public"]["Enums"]["language_code"]
          name: string
          product_sku?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          suggested_duration?: number | null
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          created_by_profile_id?: string
          id?: string
          language?: Database["public"]["Enums"]["language_code"]
          name?: string
          product_sku?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          suggested_duration?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visual_guidance: {
        Row: {
          camera_framing: string | null
          created_at: string
          id: string
          logo_placement: string | null
          project_id: string
          shot_list: Json
          text_overlay_suggestions: Json | null
        }
        Insert: {
          camera_framing?: string | null
          created_at?: string
          id?: string
          logo_placement?: string | null
          project_id: string
          shot_list?: Json
          text_overlay_suggestions?: Json | null
        }
        Update: {
          camera_framing?: string | null
          created_at?: string
          id?: string
          logo_placement?: string | null
          project_id?: string
          shot_list?: Json
          text_overlay_suggestions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "visual_guidance_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      get_user_profile_for_brand: {
        Args: { _brand_id: string; _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "content_operator" | "approver"
      content_type: "education" | "product" | "authority" | "trust"
      hook_type: "curiosity" | "authority" | "pain_point" | "visual"
      language_code: "en" | "fr" | "de"
      market_region: "fr" | "de" | "gcc" | "global"
      platform_target:
        | "tiktok"
        | "instagram_reels"
        | "facebook_reels"
        | "youtube_shorts"
      project_status:
        | "draft"
        | "qa_failed"
        | "pending_approval"
        | "approved"
        | "exported"
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
      app_role: ["content_operator", "approver"],
      content_type: ["education", "product", "authority", "trust"],
      hook_type: ["curiosity", "authority", "pain_point", "visual"],
      language_code: ["en", "fr", "de"],
      market_region: ["fr", "de", "gcc", "global"],
      platform_target: [
        "tiktok",
        "instagram_reels",
        "facebook_reels",
        "youtube_shorts",
      ],
      project_status: [
        "draft",
        "qa_failed",
        "pending_approval",
        "approved",
        "exported",
      ],
    },
  },
} as const
