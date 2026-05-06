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
          has_previous_injury: boolean
          height_cm: number | null
          id: string
          injury_notes: string | null
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
          has_previous_injury?: boolean
          height_cm?: number | null
          id?: string
          injury_notes?: string | null
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
          has_previous_injury?: boolean
          height_cm?: number | null
          id?: string
          injury_notes?: string | null
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
          bodyweight_kg: number | null
          client_id: string
          created_at: string
          explosive_score: number | null
          explosive_single_leg_jump_l: number | null
          explosive_single_leg_jump_r: number | null
          foot_length_cm: number | null
          height_cm: number | null
          id: string
          impact_212_bound_l: number | null
          impact_212_bound_r: number | null
          impact_score: number | null
          mcs_ankle_clearing_l:
            | Database["public"]["Enums"]["ankle_clearing_position"]
            | null
          mcs_ankle_clearing_r:
            | Database["public"]["Enums"]["ankle_clearing_position"]
            | null
          mcs_ankle_pain_l: boolean
          mcs_ankle_pain_r: boolean
          mcs_forward_reach_l: number | null
          mcs_forward_reach_r: number | null
          mcs_horizontal_adduction_l: number | null
          mcs_horizontal_adduction_r: number | null
          mcs_horizontal_reach_l: number | null
          mcs_horizontal_reach_r: number | null
          mcs_wrist_extension_l: number | null
          mcs_wrist_extension_r: number | null
          motor_score: number | null
          notes: string | null
          postural_carry_distance_m: number | null
          postural_carry_load_kg: number | null
          postural_carry_time_sec: number | null
          postural_score: number | null
          power_broad_jump_cm: number | null
          power_broad_jump_hands_hips_cm: number | null
          practitioner_id: string
          updated_at: string
        }
        Insert: {
          assessed_at?: string
          bodyweight_kg?: number | null
          client_id: string
          created_at?: string
          explosive_score?: number | null
          explosive_single_leg_jump_l?: number | null
          explosive_single_leg_jump_r?: number | null
          foot_length_cm?: number | null
          height_cm?: number | null
          id?: string
          impact_212_bound_l?: number | null
          impact_212_bound_r?: number | null
          impact_score?: number | null
          mcs_ankle_clearing_l?:
            | Database["public"]["Enums"]["ankle_clearing_position"]
            | null
          mcs_ankle_clearing_r?:
            | Database["public"]["Enums"]["ankle_clearing_position"]
            | null
          mcs_ankle_pain_l?: boolean
          mcs_ankle_pain_r?: boolean
          mcs_forward_reach_l?: number | null
          mcs_forward_reach_r?: number | null
          mcs_horizontal_adduction_l?: number | null
          mcs_horizontal_adduction_r?: number | null
          mcs_horizontal_reach_l?: number | null
          mcs_horizontal_reach_r?: number | null
          mcs_wrist_extension_l?: number | null
          mcs_wrist_extension_r?: number | null
          motor_score?: number | null
          notes?: string | null
          postural_carry_distance_m?: number | null
          postural_carry_load_kg?: number | null
          postural_carry_time_sec?: number | null
          postural_score?: number | null
          power_broad_jump_cm?: number | null
          power_broad_jump_hands_hips_cm?: number | null
          practitioner_id: string
          updated_at?: string
        }
        Update: {
          assessed_at?: string
          bodyweight_kg?: number | null
          client_id?: string
          created_at?: string
          explosive_score?: number | null
          explosive_single_leg_jump_l?: number | null
          explosive_single_leg_jump_r?: number | null
          foot_length_cm?: number | null
          height_cm?: number | null
          id?: string
          impact_212_bound_l?: number | null
          impact_212_bound_r?: number | null
          impact_score?: number | null
          mcs_ankle_clearing_l?:
            | Database["public"]["Enums"]["ankle_clearing_position"]
            | null
          mcs_ankle_clearing_r?:
            | Database["public"]["Enums"]["ankle_clearing_position"]
            | null
          mcs_ankle_pain_l?: boolean
          mcs_ankle_pain_r?: boolean
          mcs_forward_reach_l?: number | null
          mcs_forward_reach_r?: number | null
          mcs_horizontal_adduction_l?: number | null
          mcs_horizontal_adduction_r?: number | null
          mcs_horizontal_reach_l?: number | null
          mcs_horizontal_reach_r?: number | null
          mcs_wrist_extension_l?: number | null
          mcs_wrist_extension_r?: number | null
          motor_score?: number | null
          notes?: string | null
          postural_carry_distance_m?: number | null
          postural_carry_load_kg?: number | null
          postural_carry_time_sec?: number | null
          postural_score?: number | null
          power_broad_jump_cm?: number | null
          power_broad_jump_hands_hips_cm?: number | null
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
          ankle_clearing_left: string | null
          ankle_clearing_left_pain: boolean
          ankle_clearing_right: string | null
          ankle_clearing_right_pain: boolean
          aslr_left: number | null
          aslr_right: number | null
          assessed_at: string
          clearing_shoulder_left_pain: boolean
          clearing_shoulder_pain: boolean
          clearing_shoulder_right_pain: boolean
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
          ankle_clearing_left?: string | null
          ankle_clearing_left_pain?: boolean
          ankle_clearing_right?: string | null
          ankle_clearing_right_pain?: boolean
          aslr_left?: number | null
          aslr_right?: number | null
          assessed_at?: string
          clearing_shoulder_left_pain?: boolean
          clearing_shoulder_pain?: boolean
          clearing_shoulder_right_pain?: boolean
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
          ankle_clearing_left?: string | null
          ankle_clearing_left_pain?: boolean
          ankle_clearing_right?: string | null
          ankle_clearing_right_pain?: boolean
          aslr_left?: number | null
          aslr_right?: number | null
          assessed_at?: string
          clearing_shoulder_left_pain?: boolean
          clearing_shoulder_pain?: boolean
          clearing_shoulder_right_pain?: boolean
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
      sfma_assessments: {
        Row: {
          arms_down_deep_squat: Database["public"]["Enums"]["sfma_score"] | null
          assessed_at: string
          breakout_results: Json
          cervical_extension: Database["public"]["Enums"]["sfma_score"] | null
          cervical_flexion: Database["public"]["Enums"]["sfma_score"] | null
          cervical_rotation_l: Database["public"]["Enums"]["sfma_score"] | null
          cervical_rotation_r: Database["public"]["Enums"]["sfma_score"] | null
          client_id: string
          clinical_notes: string | null
          created_at: string
          id: string
          multi_segmental_extension:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          multi_segmental_flexion:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          multi_segmental_rotation_l:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          multi_segmental_rotation_r:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          practitioner_id: string
          single_leg_stance_l: Database["public"]["Enums"]["sfma_score"] | null
          single_leg_stance_r: Database["public"]["Enums"]["sfma_score"] | null
          updated_at: string
          upper_extremity_pattern_1_l:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          upper_extremity_pattern_1_r:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          upper_extremity_pattern_2_l:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          upper_extremity_pattern_2_r:
            | Database["public"]["Enums"]["sfma_score"]
            | null
        }
        Insert: {
          arms_down_deep_squat?:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          assessed_at?: string
          breakout_results?: Json
          cervical_extension?: Database["public"]["Enums"]["sfma_score"] | null
          cervical_flexion?: Database["public"]["Enums"]["sfma_score"] | null
          cervical_rotation_l?: Database["public"]["Enums"]["sfma_score"] | null
          cervical_rotation_r?: Database["public"]["Enums"]["sfma_score"] | null
          client_id: string
          clinical_notes?: string | null
          created_at?: string
          id?: string
          multi_segmental_extension?:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          multi_segmental_flexion?:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          multi_segmental_rotation_l?:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          multi_segmental_rotation_r?:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          practitioner_id: string
          single_leg_stance_l?: Database["public"]["Enums"]["sfma_score"] | null
          single_leg_stance_r?: Database["public"]["Enums"]["sfma_score"] | null
          updated_at?: string
          upper_extremity_pattern_1_l?:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          upper_extremity_pattern_1_r?:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          upper_extremity_pattern_2_l?:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          upper_extremity_pattern_2_r?:
            | Database["public"]["Enums"]["sfma_score"]
            | null
        }
        Update: {
          arms_down_deep_squat?:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          assessed_at?: string
          breakout_results?: Json
          cervical_extension?: Database["public"]["Enums"]["sfma_score"] | null
          cervical_flexion?: Database["public"]["Enums"]["sfma_score"] | null
          cervical_rotation_l?: Database["public"]["Enums"]["sfma_score"] | null
          cervical_rotation_r?: Database["public"]["Enums"]["sfma_score"] | null
          client_id?: string
          clinical_notes?: string | null
          created_at?: string
          id?: string
          multi_segmental_extension?:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          multi_segmental_flexion?:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          multi_segmental_rotation_l?:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          multi_segmental_rotation_r?:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          practitioner_id?: string
          single_leg_stance_l?: Database["public"]["Enums"]["sfma_score"] | null
          single_leg_stance_r?: Database["public"]["Enums"]["sfma_score"] | null
          updated_at?: string
          upper_extremity_pattern_1_l?:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          upper_extremity_pattern_1_r?:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          upper_extremity_pattern_2_l?:
            | Database["public"]["Enums"]["sfma_score"]
            | null
          upper_extremity_pattern_2_r?:
            | Database["public"]["Enums"]["sfma_score"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "sfma_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
          test_type: Database["public"]["Enums"]["ybt_test_type"]
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
          test_type?: Database["public"]["Enums"]["ybt_test_type"]
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
          test_type?: Database["public"]["Enums"]["ybt_test_type"]
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
      ankle_clearing_position: "Beyond" | "Within" | "Behind"
      sfma_score: "FN" | "DN" | "FP" | "DP"
      ybt_test_type: "LQ" | "UQ"
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
      ankle_clearing_position: ["Beyond", "Within", "Behind"],
      sfma_score: ["FN", "DN", "FP", "DP"],
      ybt_test_type: ["LQ", "UQ"],
    },
  },
} as const
