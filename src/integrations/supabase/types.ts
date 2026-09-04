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
  movement: {
    Tables: {
      bug_reports: {
        Row: {
          created_at: string
          error_message: string
          error_name: string | null
          error_stack: string | null
          id: string
          meta: Json
          status: string
          url_path: string | null
          user_agent: string | null
          user_id: string | null
          user_note: string | null
        }
        Insert: {
          created_at?: string
          error_message: string
          error_name?: string | null
          error_stack?: string | null
          id?: string
          meta?: Json
          status?: string
          url_path?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_note?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string
          error_name?: string | null
          error_stack?: string | null
          id?: string
          meta?: Json
          status?: string
          url_path?: string | null
          user_agent?: string | null
          user_id?: string | null
          user_note?: string | null
        }
        Relationships: []
      }
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
          organization_id: string
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
          organization_id?: string
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
          organization_id?: string
          practitioner_id?: string
          primary_sport?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises_library: {
        Row: {
          created_at: string
          default_reps_time: string | null
          default_sets: string | null
          dose: string | null
          goal: string | null
          id: string
          name: string
          pattern: string
          phase: Database["movement"]["Enums"]["corrective_phase"]
          posture_level: number
          posture_name: string
          posture_tier: number | null
          progression: string | null
          ramp_category: string | null
          rationale: string | null
          regression: string | null
          updated_at: string
          video_url: string | null
          workout_target: string | null
        }
        Insert: {
          created_at?: string
          default_reps_time?: string | null
          default_sets?: string | null
          dose?: string | null
          goal?: string | null
          id?: string
          name: string
          pattern: string
          phase: Database["movement"]["Enums"]["corrective_phase"]
          posture_level: number
          posture_name: string
          posture_tier?: number | null
          progression?: string | null
          ramp_category?: string | null
          rationale?: string | null
          regression?: string | null
          updated_at?: string
          video_url?: string | null
          workout_target?: string | null
        }
        Update: {
          created_at?: string
          default_reps_time?: string | null
          default_sets?: string | null
          dose?: string | null
          goal?: string | null
          id?: string
          name?: string
          pattern?: string
          phase?: Database["movement"]["Enums"]["corrective_phase"]
          posture_level?: number
          posture_name?: string
          posture_tier?: number | null
          progression?: string | null
          ramp_category?: string | null
          rationale?: string | null
          regression?: string | null
          updated_at?: string
          video_url?: string | null
          workout_target?: string | null
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
            | Database["movement"]["Enums"]["ankle_clearing_position"]
            | null
          mcs_ankle_clearing_r:
            | Database["movement"]["Enums"]["ankle_clearing_position"]
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
          organization_id: string
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
            | Database["movement"]["Enums"]["ankle_clearing_position"]
            | null
          mcs_ankle_clearing_r?:
            | Database["movement"]["Enums"]["ankle_clearing_position"]
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
          organization_id?: string
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
            | Database["movement"]["Enums"]["ankle_clearing_position"]
            | null
          mcs_ankle_clearing_r?:
            | Database["movement"]["Enums"]["ankle_clearing_position"]
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
          organization_id?: string
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
          {
            foreignKeyName: "fcs_assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          assessment_type: string
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
          organization_id: string
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
          assessment_type?: string
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
          organization_id?: string
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
          assessment_type?: string
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
          organization_id?: string
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
          {
            foreignKeyName: "fms_assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fms_screenings: {
        Row: {
          active_straight_leg_raise_left: number | null
          active_straight_leg_raise_right: number | null
          blacklist_tags: string[]
          clearing_extension_pain: boolean
          clearing_flexion_pain: boolean
          clearing_shoulder_pain: boolean
          created_at: string
          deep_squat: number | null
          fms_total_score: number | null
          hurdle_step_left: number | null
          hurdle_step_right: number | null
          id: string
          inline_lunge_left: number | null
          inline_lunge_right: number | null
          requires_medical_clearance: boolean
          rotary_stability_left: number | null
          rotary_stability_right: number | null
          shoulder_mobility_left: number | null
          shoulder_mobility_right: number | null
          trunk_stability_pushup: number | null
          user_id: string
        }
        Insert: {
          active_straight_leg_raise_left?: number | null
          active_straight_leg_raise_right?: number | null
          blacklist_tags?: string[]
          clearing_extension_pain?: boolean
          clearing_flexion_pain?: boolean
          clearing_shoulder_pain?: boolean
          created_at?: string
          deep_squat?: number | null
          fms_total_score?: number | null
          hurdle_step_left?: number | null
          hurdle_step_right?: number | null
          id?: string
          inline_lunge_left?: number | null
          inline_lunge_right?: number | null
          requires_medical_clearance?: boolean
          rotary_stability_left?: number | null
          rotary_stability_right?: number | null
          shoulder_mobility_left?: number | null
          shoulder_mobility_right?: number | null
          trunk_stability_pushup?: number | null
          user_id: string
        }
        Update: {
          active_straight_leg_raise_left?: number | null
          active_straight_leg_raise_right?: number | null
          blacklist_tags?: string[]
          clearing_extension_pain?: boolean
          clearing_flexion_pain?: boolean
          clearing_shoulder_pain?: boolean
          created_at?: string
          deep_squat?: number | null
          fms_total_score?: number | null
          hurdle_step_left?: number | null
          hurdle_step_right?: number | null
          id?: string
          inline_lunge_left?: number | null
          inline_lunge_right?: number | null
          requires_medical_clearance?: boolean
          rotary_stability_left?: number | null
          rotary_stability_right?: number | null
          shoulder_mobility_left?: number | null
          shoulder_mobility_right?: number | null
          trunk_stability_pushup?: number | null
          user_id?: string
        }
        Relationships: []
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["movement"]["Enums"]["org_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by: string
          organization_id: string
          role?: Database["movement"]["Enums"]["org_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["movement"]["Enums"]["org_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["movement"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["movement"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["movement"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          plan: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          plan?: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          plan?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
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
      sessioni_orfane_20260903: {
        Row: {
          archiviata_il: string | null
          client_id: string | null
          cliente_mancante: boolean | null
          created_at: string | null
          fms_assessment_id: string | null
          fms_mancante: boolean | null
          goal: string | null
          id: string | null
          notes: string | null
          organization_id: string | null
          practitioner_id: string | null
          program: Json | null
          scheduled_at: string | null
          session_number: number | null
          session_type: Database["movement"]["Enums"]["session_type"] | null
          status: Database["movement"]["Enums"]["session_status"] | null
          updated_at: string | null
        }
        Insert: {
          archiviata_il?: string | null
          client_id?: string | null
          cliente_mancante?: boolean | null
          created_at?: string | null
          fms_assessment_id?: string | null
          fms_mancante?: boolean | null
          goal?: string | null
          id?: string | null
          notes?: string | null
          organization_id?: string | null
          practitioner_id?: string | null
          program?: Json | null
          scheduled_at?: string | null
          session_number?: number | null
          session_type?: Database["movement"]["Enums"]["session_type"] | null
          status?: Database["movement"]["Enums"]["session_status"] | null
          updated_at?: string | null
        }
        Update: {
          archiviata_il?: string | null
          client_id?: string | null
          cliente_mancante?: boolean | null
          created_at?: string | null
          fms_assessment_id?: string | null
          fms_mancante?: boolean | null
          goal?: string | null
          id?: string | null
          notes?: string | null
          organization_id?: string | null
          practitioner_id?: string | null
          program?: Json | null
          scheduled_at?: string | null
          session_number?: number | null
          session_type?: Database["movement"]["Enums"]["session_type"] | null
          status?: Database["movement"]["Enums"]["session_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          client_id: string
          created_at: string
          fms_assessment_id: string | null
          goal: string | null
          id: string
          notes: string | null
          organization_id: string
          practitioner_id: string
          program: Json | null
          scheduled_at: string | null
          session_number: number | null
          session_type: Database["movement"]["Enums"]["session_type"]
          status: Database["movement"]["Enums"]["session_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          fms_assessment_id?: string | null
          goal?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          practitioner_id: string
          program?: Json | null
          scheduled_at?: string | null
          session_number?: number | null
          session_type: Database["movement"]["Enums"]["session_type"]
          status?: Database["movement"]["Enums"]["session_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          fms_assessment_id?: string | null
          goal?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          practitioner_id?: string
          program?: Json | null
          scheduled_at?: string | null
          session_number?: number | null
          session_type?: Database["movement"]["Enums"]["session_type"]
          status?: Database["movement"]["Enums"]["session_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_fms_assessment_id_fkey"
            columns: ["fms_assessment_id"]
            isOneToOne: false
            referencedRelation: "fms_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sfma_assessments: {
        Row: {
          arms_down_deep_squat:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          assessed_at: string
          breakout_results: Json
          cervical_extension: Database["movement"]["Enums"]["sfma_score"] | null
          cervical_flexion: Database["movement"]["Enums"]["sfma_score"] | null
          cervical_rotation_l:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          cervical_rotation_r:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          client_id: string
          clinical_notes: string | null
          created_at: string
          id: string
          multi_segmental_extension:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          multi_segmental_flexion:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          multi_segmental_rotation_l:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          multi_segmental_rotation_r:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          organization_id: string
          practitioner_id: string
          single_leg_stance_l:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          single_leg_stance_r:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          updated_at: string
          upper_extremity_pattern_1_l:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          upper_extremity_pattern_1_r:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          upper_extremity_pattern_2_l:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          upper_extremity_pattern_2_r:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
        }
        Insert: {
          arms_down_deep_squat?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          assessed_at?: string
          breakout_results?: Json
          cervical_extension?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          cervical_flexion?: Database["movement"]["Enums"]["sfma_score"] | null
          cervical_rotation_l?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          cervical_rotation_r?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          client_id: string
          clinical_notes?: string | null
          created_at?: string
          id?: string
          multi_segmental_extension?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          multi_segmental_flexion?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          multi_segmental_rotation_l?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          multi_segmental_rotation_r?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          organization_id?: string
          practitioner_id: string
          single_leg_stance_l?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          single_leg_stance_r?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          updated_at?: string
          upper_extremity_pattern_1_l?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          upper_extremity_pattern_1_r?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          upper_extremity_pattern_2_l?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          upper_extremity_pattern_2_r?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
        }
        Update: {
          arms_down_deep_squat?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          assessed_at?: string
          breakout_results?: Json
          cervical_extension?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          cervical_flexion?: Database["movement"]["Enums"]["sfma_score"] | null
          cervical_rotation_l?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          cervical_rotation_r?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          client_id?: string
          clinical_notes?: string | null
          created_at?: string
          id?: string
          multi_segmental_extension?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          multi_segmental_flexion?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          multi_segmental_rotation_l?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          multi_segmental_rotation_r?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          organization_id?: string
          practitioner_id?: string
          single_leg_stance_l?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          single_leg_stance_r?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          updated_at?: string
          upper_extremity_pattern_1_l?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          upper_extremity_pattern_1_r?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          upper_extremity_pattern_2_l?:
            | Database["movement"]["Enums"]["sfma_score"]
            | null
          upper_extremity_pattern_2_r?:
            | Database["movement"]["Enums"]["sfma_score"]
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
          {
            foreignKeyName: "sfma_assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["movement"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["movement"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["movement"]["Enums"]["app_role"]
          user_id?: string
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
          organization_id: string
          posterolateral_left_cm: number | null
          posterolateral_right_cm: number | null
          posteromedial_left_cm: number | null
          posteromedial_right_cm: number | null
          practitioner_id: string
          test_type: Database["movement"]["Enums"]["ybt_test_type"]
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
          organization_id?: string
          posterolateral_left_cm?: number | null
          posterolateral_right_cm?: number | null
          posteromedial_left_cm?: number | null
          posteromedial_right_cm?: number | null
          practitioner_id: string
          test_type?: Database["movement"]["Enums"]["ybt_test_type"]
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
          organization_id?: string
          posterolateral_left_cm?: number | null
          posterolateral_right_cm?: number | null
          posteromedial_left_cm?: number | null
          posteromedial_right_cm?: number | null
          practitioner_id?: string
          test_type?: Database["movement"]["Enums"]["ybt_test_type"]
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
          {
            foreignKeyName: "ybt_assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      app_role: "admin" | "coach" | "athlete"
      corrective_phase:
        | "Reset"
        | "Reactivate"
        | "Reinforce"
        | "Raise"
        | "Activate"
        | "Potentiate"
        | "Safe_Strength"
      org_role: "owner" | "admin" | "member"
      session_status: "draft" | "scheduled" | "completed" | "cancelled"
      session_type: "Triage" | "PT Pack"
      sfma_score: "FN" | "DN" | "FP" | "DP"
      ybt_test_type: "LQ" | "UQ"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admins: {
        Row: {
          added_at: string
          user_id: string
        }
        Insert: {
          added_at?: string
          user_id: string
        }
        Update: {
          added_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_screening: {
        Row: {
          conditions_meds: string | null
          cycle_since: string | null
          cycle_status: string | null
          pain_now: boolean | null
          pain_where: string | null
          parq_balance: boolean
          parq_chest_pain: boolean
          parq_heart: boolean
          parq_meds: boolean
          parq_msk: boolean
          parq_other_chronic: boolean
          parq_supervised: boolean
          past_injuries: string | null
          pregnancy: string | null
          safety_allergy: boolean | null
          safety_allergy_detail: string | null
          submission_id: string
        }
        Insert: {
          conditions_meds?: string | null
          cycle_since?: string | null
          cycle_status?: string | null
          pain_now?: boolean | null
          pain_where?: string | null
          parq_balance: boolean
          parq_chest_pain: boolean
          parq_heart: boolean
          parq_meds: boolean
          parq_msk: boolean
          parq_other_chronic: boolean
          parq_supervised: boolean
          past_injuries?: string | null
          pregnancy?: string | null
          safety_allergy?: boolean | null
          safety_allergy_detail?: string | null
          submission_id: string
        }
        Update: {
          conditions_meds?: string | null
          cycle_since?: string | null
          cycle_status?: string | null
          pain_now?: boolean | null
          pain_where?: string | null
          parq_balance?: boolean
          parq_chest_pain?: boolean
          parq_heart?: boolean
          parq_meds?: boolean
          parq_msk?: boolean
          parq_other_chronic?: boolean
          parq_supervised?: boolean
          past_injuries?: string | null
          pregnancy?: string | null
          safety_allergy?: boolean | null
          safety_allergy_detail?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_screening_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      neurotype_answers: {
        Row: {
          q01: string | null
          q02: string | null
          q03: string | null
          q04: string | null
          q05: string | null
          q06: string | null
          q07: string | null
          q08: string | null
          q09: string | null
          q10: string | null
          q11: string | null
          q12: string | null
          q13: string | null
          q14: string | null
          q15: string | null
          q16: string | null
          q17: string | null
          q18: string | null
          q19: string | null
          q20: string | null
          q21: string | null
          q22: string | null
          q23: string | null
          q24: string | null
          q25: string | null
          q26: string | null
          q27: string | null
          q28: string | null
          q29: string | null
          q30: string | null
          submission_id: string
        }
        Insert: {
          q01?: string | null
          q02?: string | null
          q03?: string | null
          q04?: string | null
          q05?: string | null
          q06?: string | null
          q07?: string | null
          q08?: string | null
          q09?: string | null
          q10?: string | null
          q11?: string | null
          q12?: string | null
          q13?: string | null
          q14?: string | null
          q15?: string | null
          q16?: string | null
          q17?: string | null
          q18?: string | null
          q19?: string | null
          q20?: string | null
          q21?: string | null
          q22?: string | null
          q23?: string | null
          q24?: string | null
          q25?: string | null
          q26?: string | null
          q27?: string | null
          q28?: string | null
          q29?: string | null
          q30?: string | null
          submission_id: string
        }
        Update: {
          q01?: string | null
          q02?: string | null
          q03?: string | null
          q04?: string | null
          q05?: string | null
          q06?: string | null
          q07?: string | null
          q08?: string | null
          q09?: string | null
          q10?: string | null
          q11?: string | null
          q12?: string | null
          q13?: string | null
          q14?: string | null
          q15?: string | null
          q16?: string | null
          q17?: string | null
          q18?: string | null
          q19?: string | null
          q20?: string | null
          q21?: string | null
          q22?: string | null
          q23?: string | null
          q24?: string | null
          q25?: string | null
          q26?: string | null
          q27?: string | null
          q28?: string | null
          q29?: string | null
          q30?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "neurotype_answers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      neurotype_result: {
        Row: {
          margin: number | null
          notes: string | null
          primary_type: string | null
          score_1a: number | null
          score_1b: number | null
          score_2a: number | null
          score_2b: number | null
          score_3: number | null
          scored_at: string | null
          secondary_type: string | null
          submission_id: string
        }
        Insert: {
          margin?: number | null
          notes?: string | null
          primary_type?: string | null
          score_1a?: number | null
          score_1b?: number | null
          score_2a?: number | null
          score_2b?: number | null
          score_3?: number | null
          scored_at?: string | null
          secondary_type?: string | null
          submission_id: string
        }
        Update: {
          margin?: number | null
          notes?: string | null
          primary_type?: string | null
          score_1a?: number | null
          score_1b?: number | null
          score_2a?: number | null
          score_2b?: number | null
          score_3?: number | null
          scored_at?: string | null
          secondary_type?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "neurotype_result_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition: {
        Row: {
          diet_assessment: string | null
          diet_history: string | null
          foods_love_avoid: string | null
          intolerances: string | null
          meals_desc: string | null
          submission_id: string
          supplements: string | null
          who_cooks: string | null
        }
        Insert: {
          diet_assessment?: string | null
          diet_history?: string | null
          foods_love_avoid?: string | null
          intolerances?: string | null
          meals_desc?: string | null
          submission_id: string
          supplements?: string | null
          who_cooks?: string | null
        }
        Update: {
          diet_assessment?: string | null
          diet_history?: string | null
          foods_love_avoid?: string | null
          intolerances?: string | null
          meals_desc?: string | null
          submission_id?: string
          supplements?: string | null
          who_cooks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          bucket: string
          hits: number
          window_start: string
        }
        Insert: {
          bucket: string
          hits?: number
          window_start?: string
        }
        Update: {
          bucket?: string
          hits?: number
          window_start?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          address: string | null
          aesthetic_goal: string | null
          alcohol_week: string | null
          availability: string | null
          barbell_experience: string | null
          birth_date: string
          client_id: string | null
          consent_disclaimer: boolean
          consent_health: boolean
          consent_marketing: boolean
          consent_nutrition: boolean
          consent_photos: boolean
          consent_share_medical: boolean
          consent_version: string
          consented_at: string
          created_at: string
          current_sport: string | null
          deadline_event: string | null
          email: string
          equipment: string
          experience_level: string | null
          favorite_activity: string | null
          foreseen_obstacles: string | null
          full_name: string
          height_cm: number | null
          id: string
          lifestyle_goal: string | null
          main_goal: string | null
          max_days_week: string | null
          movement_goal: string | null
          neat_steps: string | null
          past_coaching: string | null
          phone: string
          pronoun: string | null
          recent_maxes: string | null
          recovery_capacity: string | null
          session_minutes: string | null
          sex: string
          sleep_hours: string | null
          sleep_quality: string | null
          smoking: string | null
          sports_history: string | null
          status: string
          stress_level: string | null
          success_definition: string | null
          support_network: string | null
          tax_code: string | null
          water_liters: string | null
          weight_history: string | null
          weight_kg: number | null
          weight_target: string | null
          why_now: string | null
          work_desc: string | null
          work_mode: string | null
          workload: string | null
        }
        Insert: {
          address?: string | null
          aesthetic_goal?: string | null
          alcohol_week?: string | null
          availability?: string | null
          barbell_experience?: string | null
          birth_date: string
          client_id?: string | null
          consent_disclaimer: boolean
          consent_health: boolean
          consent_marketing?: boolean
          consent_nutrition?: boolean
          consent_photos?: boolean
          consent_share_medical?: boolean
          consent_version?: string
          consented_at?: string
          created_at?: string
          current_sport?: string | null
          deadline_event?: string | null
          email: string
          equipment: string
          experience_level?: string | null
          favorite_activity?: string | null
          foreseen_obstacles?: string | null
          full_name: string
          height_cm?: number | null
          id?: string
          lifestyle_goal?: string | null
          main_goal?: string | null
          max_days_week?: string | null
          movement_goal?: string | null
          neat_steps?: string | null
          past_coaching?: string | null
          phone: string
          pronoun?: string | null
          recent_maxes?: string | null
          recovery_capacity?: string | null
          session_minutes?: string | null
          sex: string
          sleep_hours?: string | null
          sleep_quality?: string | null
          smoking?: string | null
          sports_history?: string | null
          status?: string
          stress_level?: string | null
          success_definition?: string | null
          support_network?: string | null
          tax_code?: string | null
          water_liters?: string | null
          weight_history?: string | null
          weight_kg?: number | null
          weight_target?: string | null
          why_now?: string | null
          work_desc?: string | null
          work_mode?: string | null
          workload?: string | null
        }
        Update: {
          address?: string | null
          aesthetic_goal?: string | null
          alcohol_week?: string | null
          availability?: string | null
          barbell_experience?: string | null
          birth_date?: string
          client_id?: string | null
          consent_disclaimer?: boolean
          consent_health?: boolean
          consent_marketing?: boolean
          consent_nutrition?: boolean
          consent_photos?: boolean
          consent_share_medical?: boolean
          consent_version?: string
          consented_at?: string
          created_at?: string
          current_sport?: string | null
          deadline_event?: string | null
          email?: string
          equipment?: string
          experience_level?: string | null
          favorite_activity?: string | null
          foreseen_obstacles?: string | null
          full_name?: string
          height_cm?: number | null
          id?: string
          lifestyle_goal?: string | null
          main_goal?: string | null
          max_days_week?: string | null
          movement_goal?: string | null
          neat_steps?: string | null
          past_coaching?: string | null
          phone?: string
          pronoun?: string | null
          recent_maxes?: string | null
          recovery_capacity?: string | null
          session_minutes?: string | null
          sex?: string
          sleep_hours?: string | null
          sleep_quality?: string | null
          smoking?: string | null
          sports_history?: string | null
          status?: string
          stress_level?: string | null
          success_definition?: string | null
          support_network?: string | null
          tax_code?: string | null
          water_liters?: string | null
          weight_history?: string | null
          weight_kg?: number | null
          weight_target?: string | null
          why_now?: string | null
          work_desc?: string | null
          work_mode?: string | null
          workload?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      rate_limit_hit: {
        Args: { bucket_key: string; max_hits: number; window_seconds: number }
        Returns: boolean
      }
      submit_intake: { Args: { payload: Json }; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  movement: {
    Enums: {
      ankle_clearing_position: ["Beyond", "Within", "Behind"],
      app_role: ["admin", "coach", "athlete"],
      corrective_phase: [
        "Reset",
        "Reactivate",
        "Reinforce",
        "Raise",
        "Activate",
        "Potentiate",
        "Safe_Strength",
      ],
      org_role: ["owner", "admin", "member"],
      session_status: ["draft", "scheduled", "completed", "cancelled"],
      session_type: ["Triage", "PT Pack"],
      sfma_score: ["FN", "DN", "FP", "DP"],
      ybt_test_type: ["LQ", "UQ"],
    },
  },
  public: {
    Enums: {},
  },
} as const
