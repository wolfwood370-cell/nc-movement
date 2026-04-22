import { z } from 'zod';

const num = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
  z.number().positive().nullable(),
);

export const ybtSchema = z.object({
  limb_length_cm: num,
  anterior_right_cm: num,
  anterior_left_cm: num,
  posteromedial_right_cm: num,
  posteromedial_left_cm: num,
  posterolateral_right_cm: num,
  posterolateral_left_cm: num,
  notes: z.string().nullable().optional(),
});

export type YbtFormValues = z.infer<typeof ybtSchema>;

export const YBT_DEFAULTS: YbtFormValues = {
  limb_length_cm: null,
  anterior_right_cm: null,
  anterior_left_cm: null,
  posteromedial_right_cm: null,
  posteromedial_left_cm: null,
  posterolateral_right_cm: null,
  posterolateral_left_cm: null,
  notes: '',
};

/** Absolute clinical rule: anterior asymmetry > 4cm is ALWAYS a critical red flag. */
export const ANTERIOR_ASYMMETRY_THRESHOLD_CM = 4;

// =============================================================================
// Composite-score risk thresholds (population-specific)
// =============================================================================
// Cut-offs are derived from Plisky et al. and the YBT manual: athletes in
// high-demand cutting/jumping sports (soccer, basketball, gymnastics, etc.)
// require a higher composite to be considered low-risk than recreational or
// inactive subjects. Female athletes also tend to operate at slightly higher
// targets in the literature.
// These percentages refer to (sum of three reaches) / (3 × limb length) × 100.

const HIGH_DEMAND_SPORTS = new Set([
  'soccer', 'football', 'basketball', 'volleyball', 'gymnastics',
  'tennis', 'rugby', 'handball', 'hockey', 'lacrosse', 'martial_arts',
  'track', 'athletics', 'skiing', 'snowboard', 'climbing',
]);

export type Gender = 'male' | 'female' | 'other' | string | null | undefined;

export interface CompositeContext {
  gender?: Gender;
  primarySport?: string | null;
}

export interface CompositeThreshold {
  /** Cut-off below which composite is considered HIGH risk (%). */
  cutoff: number;
  /** Human label of the population profile applied. */
  profile: string;
}

/**
 * Determine the composite-score cutoff for a given client demographic.
 * Higher cutoff = stricter requirement to be considered "low risk".
 */
export function getCompositeThreshold(ctx: CompositeContext = {}): CompositeThreshold {
  const sport = (ctx.primarySport ?? '').toLowerCase().trim();
  const isActive = sport.length > 0 && HIGH_DEMAND_SPORTS.has(sport);
  const isFemale = ctx.gender === 'female';

  if (isActive && isFemale) return { cutoff: 94, profile: 'Atleta femminile (sport ad alto impatto)' };
  if (isActive)              return { cutoff: 92, profile: 'Atleta (sport ad alto impatto)' };
  if (isFemale)              return { cutoff: 90, profile: 'Femminile · attività generica' };
  return { cutoff: 89, profile: 'Adulto · attività generica' };
}

export type CompositeRisk = 'low' | 'high' | 'unknown';

export function classifyComposite(
  composite: number | null,
  ctx: CompositeContext = {},
): { risk: CompositeRisk; cutoff: number; profile: string } {
  const { cutoff, profile } = getCompositeThreshold(ctx);
  if (composite == null) return { risk: 'unknown', cutoff, profile };
  return { risk: composite < cutoff ? 'high' : 'low', cutoff, profile };
}

// =============================================================================
// Metrics
// =============================================================================

export interface YbtMetrics {
  asym: { anterior: number | null; posteromedial: number | null; posterolateral: number | null };
  /** Anterior asymmetry > 4cm → absolute red flag (pop-independent). */
  anteriorRisk: boolean;
  composite: { right: number | null; left: number | null };
  compositeAsym: number | null;
  /** Population-specific cut-off context applied to the composite scores. */
  threshold: CompositeThreshold;
  /** Per-side composite risk classification. */
  compositeRisk: { right: CompositeRisk; left: CompositeRisk };
}

const diff = (r: number | null, l: number | null) =>
  r != null && l != null ? Math.abs(r - l) : null;

const composite = (
  ant: number | null,
  pm: number | null,
  pl: number | null,
  limb: number | null,
) => {
  if (ant == null || pm == null || pl == null || !limb) return null;
  return ((ant + pm + pl) / (3 * limb)) * 100;
};

export function computeYbtMetrics(
  v: YbtFormValues,
  ctx: CompositeContext = {},
): YbtMetrics {
  const anterior = diff(v.anterior_right_cm, v.anterior_left_cm);
  const posteromedial = diff(v.posteromedial_right_cm, v.posteromedial_left_cm);
  const posterolateral = diff(v.posterolateral_right_cm, v.posterolateral_left_cm);
  const right = composite(
    v.anterior_right_cm,
    v.posteromedial_right_cm,
    v.posterolateral_right_cm,
    v.limb_length_cm,
  );
  const left = composite(
    v.anterior_left_cm,
    v.posteromedial_left_cm,
    v.posterolateral_left_cm,
    v.limb_length_cm,
  );
  const threshold = getCompositeThreshold(ctx);
  return {
    asym: { anterior, posteromedial, posterolateral },
    anteriorRisk: anterior != null && anterior > ANTERIOR_ASYMMETRY_THRESHOLD_CM,
    composite: { right, left },
    compositeAsym: right != null && left != null ? Math.abs(right - left) : null,
    threshold,
    compositeRisk: {
      right: classifyComposite(right, ctx).risk,
      left: classifyComposite(left, ctx).risk,
    },
  };
}
