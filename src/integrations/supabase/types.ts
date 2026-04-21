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
      clients: {
        Row: {
          competition_level: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          gender: string | null
          height_cm: number | null
          id: string
          notes: string | null
          practitioner_id: string
          primary_sport: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          competition_level?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          height_cm?: number | null
          id?: string
          notes?: string | null
          practitioner_id: string
          primary_sport?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          competition_level?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          height_cm?: number | null
          id?: string
          notes?: string | null
          practitioner_id?: string
          primary_sport?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      fcs_assessments: {
        Row: {
          assessed_at: string
          client_id: string
          created_at: string
          explosive_score: number | null
          id: string
          impact_score: number | null
          motor_score: number | null
          notes: string | null
          postural_score: number | null
          practitioner_id: string
          updated_at: string
        }
        Insert: {
          assessed_at?: string
          client_id: string
          created_at?: string
          explosive_score?: number | null
          id?: string
          impact_score?: number | null
          motor_score?: number | null
          notes?: string | null
          postural_score?: number | null
          practitioner_id: string
          updated_at?: string
        }
        Update: {
          assessed_at?: string
          client_id?: string
          created_at?: string
          explosive_score?: number | null
          id?: string
          impact_score?: number | null
          motor_score?: number | null
          notes?: string | null
          postural_score?: number | null
          practitioner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fcs_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      fms_assessments: {
        Row: {
          ankle_clearing_left_pain: boolean
          ankle_clearing_right_pain: boolean
          aslr_left: number | null
          aslr_right: number | null
          assessed_at: string
          clearing_shoulder_pain: boolean
          clearing_spinal_extension_pain: boolean
          clearing_spinal_flexion_pain: boolean
          client_id: string
          created_at: string
          deep_squat_score: number | null
          hand_length_cm: number | null
          hurdle_step_left: number | null
          hurdle_step_right: number | null
          id: string
          inline_lunge_left: number | null
          inline_lunge_right: number | null
          notes: string | null
          practitioner_id: string
          primary_corrective: string | null
          rotary_stability_left: number | null
          rotary_stability_right: number | null
          shoulder_mobility_left: number | null
          shoulder_mobility_right: number | null
          tibia_length_cm: number | null
          total_score: number | null
          trunk_stability_pushup_score: number | null
          updated_at: string
        }
        Insert: {
          ankle_clearing_left_pain?: boolean
          ankle_clearing_right_pain?: boolean
          aslr_left?: number | null
          aslr_right?: number | null
          assessed_at?: string
          clearing_shoulder_pain?: boolean
          clearing_spinal_extension_pain?: boolean
          clearing_spinal_flexion_pain?: boolean
          client_id: string
          created_at?: string
          deep_squat_score?: number | null
          hand_length_cm?: number | null
          hurdle_step_left?: number | null
          hurdle_step_right?: number | null
          id?: string
          inline_lunge_left?: number | null
          inline_lunge_right?: number | null
          notes?: string | null
          practitioner_id: string
          primary_corrective?: string | null
          rotary_stability_left?: number | null
          rotary_stability_right?: number | null
          shoulder_mobility_left?: number | null
          shoulder_mobility_right?: number | null
          tibia_length_cm?: number | null
          total_score?: number | null
          trunk_stability_pushup_score?: number | null
          updated_at?: string
        }
        Update: {
          ankle_clearing_left_pain?: boolean
          ankle_clearing_right_pain?: boolean
          aslr_left?: number | null
          aslr_right?: number | null
          assessed_at?: string
          clearing_shoulder_pain?: boolean
          clearing_spinal_extension_pain?: boolean
          clearing_spinal_flexion_pain?: boolean
          client_id?: string
          created_at?: string
          deep_squat_score?: number | null
          hand_length_cm?: number | null
          hurdle_step_left?: number | null
          hurdle_step_right?: number | null
          id?: string
          inline_lunge_left?: number | null
          inline_lunge_right?: number | null
          notes?: string | null
          practitioner_id?: string
          primary_corrective?: string | null
          rotary_stability_left?: number | null
          rotary_stability_right?: number | null
          shoulder_mobility_left?: number | null
          shoulder_mobility_right?: number | null
          tibia_length_cm?: number | null
          total_score?: number | null
          trunk_stability_pushup_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fms_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          professional_title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          professional_title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          professional_title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ybt_assessments: {
        Row: {
          anterior_left_cm: number | null
          anterior_right_cm: number | null
          assessed_at: string
          client_id: string
          created_at: string
          id: string
          limb_length_cm: number | null
          notes: string | null
          posterolateral_left_cm: number | null
          posterolateral_right_cm: number | null
          posteromedial_left_cm: number | null
          posteromedial_right_cm: number | null
          practitioner_id: string
          updated_at: string
        }
        Insert: {
          anterior_left_cm?: number | null
          anterior_right_cm?: number | null
          assessed_at?: string
          client_id: string
          created_at?: string
          id?: string
          limb_length_cm?: number | null
          notes?: string | null
          posterolateral_left_cm?: number | null
          posterolateral_right_cm?: number | null
          posteromedial_left_cm?: number | null
          posteromedial_right_cm?: number | null
          practitioner_id: string
          updated_at?: string
        }
        Update: {
          anterior_left_cm?: number | null
          anterior_right_cm?: number | null
          assessed_at?: string
          client_id?: string
          created_at?: string
          id?: string
          limb_length_cm?: number | null
          notes?: string | null
          posterolateral_left_cm?: number | null
          posterolateral_right_cm?: number | null
          posteromedial_left_cm?: number | null
          posteromedial_right_cm?: number | null
          practitioner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ybt_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
