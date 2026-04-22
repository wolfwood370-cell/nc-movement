import { z } from 'zod';

const num = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
  z.number().positive().nullable(),
);

export const YBT_TEST_TYPES = ['LQ', 'UQ'] as const;
export type YbtTestType = (typeof YBT_TEST_TYPES)[number];

export const ybtSchema = z.object({
  test_type: z.enum(YBT_TEST_TYPES).default('LQ'),
  // Reference length: leg length for LQ, arm length for UQ.
  limb_length_cm: num,
  // Reach 1: anterior (LQ) / medial (UQ)
  anterior_right_cm: num,
  anterior_left_cm: num,
  // Reach 2: posteromedial (LQ) / inferolateral (UQ)
  posteromedial_right_cm: num,
  posteromedial_left_cm: num,
  // Reach 3: posterolateral (LQ) / superolateral (UQ)
  posterolateral_right_cm: num,
  posterolateral_left_cm: num,
  notes: z.string().nullable().optional(),
});

export type YbtFormValues = z.infer<typeof ybtSchema>;

export const YBT_DEFAULTS: YbtFormValues = {
  test_type: 'LQ',
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
// LQ / UQ labelling
// =============================================================================

export interface YbtLabels {
  limbLabel: string;
  limbHint: string;
  reach1: { title: string; hint?: string };
  reach2: { title: string; hint?: string };
  reach3: { title: string; hint?: string };
}

export function getYbtLabels(testType: YbtTestType): YbtLabels {
  if (testType === 'UQ') {
    return {
      limbLabel: 'Lunghezza arto superiore',
      limbHint: 'C7 → punta del 3° dito (cm) — usata per i punteggi compositi.',
      reach1: { title: 'Mediale', hint: `Asimmetria > ${ANTERIOR_ASYMMETRY_THRESHOLD_CM} cm = rischio elevato` },
      reach2: { title: 'Inferolaterale' },
      reach3: { title: 'Superolaterale' },
    };
  }
  return {
    limbLabel: 'Lunghezza arto inferiore',
    limbHint: 'SIAS → malleolo mediale (cm). Usata per i punteggi compositi.',
    reach1: { title: 'Anteriore', hint: `Asimmetria > ${ANTERIOR_ASYMMETRY_THRESHOLD_CM} cm = rischio elevato` },
    reach2: { title: 'Posteromediale' },
    reach3: { title: 'Posterolaterale' },
  };
}

// =============================================================================
// Composite-score risk thresholds (population-specific)
// =============================================================================

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
  cutoff: number;
  profile: string;
}

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
  /** Reach #1 asymmetry > 4cm → absolute red flag (pop-independent). */
  anteriorRisk: boolean;
  composite: { right: number | null; left: number | null };
  compositeAsym: number | null;
  threshold: CompositeThreshold;
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
