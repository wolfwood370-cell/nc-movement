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

export const ANTERIOR_ASYMMETRY_THRESHOLD_CM = 4;

export interface YbtMetrics {
  asym: { anterior: number | null; posteromedial: number | null; posterolateral: number | null };
  anteriorRisk: boolean;
  composite: { right: number | null; left: number | null };
  compositeAsym: number | null;
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

export function computeYbtMetrics(v: YbtFormValues): YbtMetrics {
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
  return {
    asym: { anterior, posteromedial, posterolateral },
    anteriorRisk: anterior != null && anterior > ANTERIOR_ASYMMETRY_THRESHOLD_CM,
    composite: { right, left },
    compositeAsym: right != null && left != null ? Math.abs(right - left) : null,
  };
}
