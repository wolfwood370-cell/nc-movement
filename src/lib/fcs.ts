import { z } from 'zod';

/**
 * FCS — Fundamental Capacity Screen
 * Calculation utilities + zod schema for the data-entry form.
 *
 * Targets (per Gray Cook's manual):
 *   - Power Ratio:        Broad Jump / Height            > 110%
 *   - Explosive Symmetry: min(L,R) / max(L,R)            > 90%
 *   - Impact Symmetry:    min(L,R) / max(L,R)            > 95%
 *   - Postural Carry:     load ≈ 75% of bodyweight
 */

export const ANKLE_POSITIONS = ['Beyond', 'Within', 'Behind'] as const;
export type AnklePosition = (typeof ANKLE_POSITIONS)[number];

const optionalPositiveNumber = z
  .union([z.number().positive(), z.nan(), z.null(), z.undefined()])
  .transform((v) => (v == null || Number.isNaN(v as number) ? null : (v as number)))
  .nullable();

const optionalAnkle = z.enum(ANKLE_POSITIONS).nullable().optional();

export const fcsSchema = z.object({
  assessed_at: z.string().min(1),

  // Biometrics
  bodyweight_kg: optionalPositiveNumber,
  height_cm: optionalPositiveNumber,
  foot_length_cm: optionalPositiveNumber,

  // Movement Control (MCS)
  mcs_ankle_clearing_l: optionalAnkle,
  mcs_ankle_clearing_r: optionalAnkle,
  mcs_ankle_pain_l: z.boolean().default(false),
  mcs_ankle_pain_r: z.boolean().default(false),
  mcs_forward_reach_l: optionalPositiveNumber,
  mcs_forward_reach_r: optionalPositiveNumber,

  // Upper Body Motor Control
  mcs_wrist_extension_l: optionalPositiveNumber,
  mcs_wrist_extension_r: optionalPositiveNumber,
  mcs_horizontal_adduction_l: optionalPositiveNumber,
  mcs_horizontal_adduction_r: optionalPositiveNumber,
  mcs_horizontal_reach_l: optionalPositiveNumber,
  mcs_horizontal_reach_r: optionalPositiveNumber,

  // Power
  power_broad_jump_cm: optionalPositiveNumber,
  power_broad_jump_hands_hips_cm: optionalPositiveNumber,

  // Explosive
  explosive_single_leg_jump_l: optionalPositiveNumber,
  explosive_single_leg_jump_r: optionalPositiveNumber,

  // Impact
  impact_212_bound_l: optionalPositiveNumber,
  impact_212_bound_r: optionalPositiveNumber,

  // Postural
  postural_carry_load_kg: optionalPositiveNumber,
  postural_carry_distance_m: optionalPositiveNumber,
  postural_carry_time_sec: optionalPositiveNumber,

  notes: z.string().max(2000).optional().nullable(),
});

export type FcsFormValues = z.infer<typeof fcsSchema>;

export const FCS_DEFAULTS: FcsFormValues = {
  assessed_at: new Date().toISOString(),
  bodyweight_kg: null,
  height_cm: null,
  foot_length_cm: null,
  mcs_ankle_clearing_l: null,
  mcs_ankle_clearing_r: null,
  mcs_ankle_pain_l: false,
  mcs_ankle_pain_r: false,
  mcs_forward_reach_l: null,
  mcs_forward_reach_r: null,
  mcs_wrist_extension_l: null,
  mcs_wrist_extension_r: null,
  mcs_horizontal_adduction_l: null,
  mcs_horizontal_adduction_r: null,
  mcs_horizontal_reach_l: null,
  mcs_horizontal_reach_r: null,
  power_broad_jump_cm: null,
  power_broad_jump_hands_hips_cm: null,
  explosive_single_leg_jump_l: null,
  explosive_single_leg_jump_r: null,
  impact_212_bound_l: null,
  impact_212_bound_r: null,
  postural_carry_load_kg: null,
  postural_carry_distance_m: null,
  postural_carry_time_sec: null,
  notes: null,
};

// ---------- Derived metrics ----------

export interface RatioResult {
  /** 0..1+ value (e.g. 1.12 == 112%) — null when inputs are missing/invalid */
  value: number | null;
  /** target threshold as a 0..1 ratio */
  target: number;
  passes: boolean | null;
}

const ratio = (num: number | null, den: number | null, target: number): RatioResult => {
  if (num == null || den == null || den <= 0) return { value: null, target, passes: null };
  const v = num / den;
  return { value: v, target, passes: v >= target };
};

const symmetry = (a: number | null, b: number | null, target: number): RatioResult => {
  if (a == null || b == null || a <= 0 || b <= 0) return { value: null, target, passes: null };
  const v = Math.min(a, b) / Math.max(a, b);
  return { value: v, target, passes: v >= target };
};

export interface LowerBodyMotorControlResult {
  /** Overall pass/fail for Lower Body Motor Control */
  passes: boolean | null;
  /** True if Ankle Clearing pain forced an automatic FAIL */
  ankleClearingFail: boolean;
  /** Symmetry of the forward reach (informational, even on ankle fail) */
  reachSymmetry: RatioResult;
}

/**
 * Lower Body Motor Control = Ankle Clearing (pass/fail) + Forward Reach Symmetry.
 * Per Cook's FCS protocol, ANY ankle clearing pain forces an automatic FAIL
 * on this component, regardless of the forward reach distance.
 */
const lowerBodyMotorControl = (v: FcsFormValues): LowerBodyMotorControlResult => {
  const reachSymmetry = symmetry(v.mcs_forward_reach_l, v.mcs_forward_reach_r, 0.95);
  const ankleClearingFail = !!v.mcs_ankle_pain_l || !!v.mcs_ankle_pain_r;
  if (ankleClearingFail) {
    return { passes: false, ankleClearingFail: true, reachSymmetry };
  }
  return { passes: reachSymmetry.passes, ankleClearingFail: false, reachSymmetry };
};

export const computeFcsMetrics = (v: FcsFormValues) => ({
  powerRatio: ratio(v.power_broad_jump_cm, v.height_cm, 1.10),
  explosiveSymmetry: symmetry(v.explosive_single_leg_jump_l, v.explosive_single_leg_jump_r, 0.90),
  impactSymmetry: symmetry(v.impact_212_bound_l, v.impact_212_bound_r, 0.95),
  forwardReachSymmetry: symmetry(v.mcs_forward_reach_l, v.mcs_forward_reach_r, 0.95),
  horizontalReachSymmetry: symmetry(v.mcs_horizontal_reach_l, v.mcs_horizontal_reach_r, 0.95),
  wristExtensionSymmetry: symmetry(v.mcs_wrist_extension_l, v.mcs_wrist_extension_r, 0.95),
  horizontalAdductionSymmetry: symmetry(v.mcs_horizontal_adduction_l, v.mcs_horizontal_adduction_r, 0.95),
  carryLoadRatio: ratio(v.postural_carry_load_kg, v.bodyweight_kg, 0.75),
  lowerBodyMotorControl: lowerBodyMotorControl(v),
});

export const formatPct = (v: number | null) =>
  v == null ? '—' : `${(v * 100).toFixed(0)}%`;
