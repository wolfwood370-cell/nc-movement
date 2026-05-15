// Clinic-wide macro-analytics derived from the latest FMS per client.
import type { FmsScores } from './fms';
import { computePatterns, getCorrectivePriority, hasCriticalRedFlags } from './fms';
import type { FmsAssessmentRow } from './insights';

export interface PatternAverage {
  key: string;
  label: string;
  /** Mean of the per-client final score, or null when no client has scored it. */
  average: number | null;
  /** Number of clients contributing to this average (post-NULL filter). */
  sampleSize: number;
}

export interface WeakLinkBucket {
  patternKey: string;
  label: string;
  count: number;
  /** Percentage of all clients who have an FMS (0–100). */
  percent: number;
}

export interface MacroAnalytics {
  totalClients: number;
  /** Clients with at least one stored FMS assessment. */
  clientsWithFms: number;
  /** Mean of `total_score` (ignoring nulls). */
  averageFmsScore: number | null;
  /** Percent of FMS-assessed clients with at least one L/R asymmetric pattern. */
  asymmetryRate: number;
  /** Percent of FMS-assessed clients with a positive clearing test or pain. */
  redFlagRate: number;
  /** Most common primary Weak Link (FMS Priority) bucket, or null when n=0. */
  topWeakLink: WeakLinkBucket | null;
  /** Full distribution sorted by count desc. */
  weakLinkDistribution: WeakLinkBucket[];
  /** Average score (0–3) per pattern across all clients. */
  patternAverages: PatternAverage[];
}

const PATTERN_DEFS: { key: string; label: string }[] = [
  { key: 'deep_squat',             label: 'Deep Squat' },
  { key: 'hurdle_step',            label: 'Hurdle Step' },
  { key: 'inline_lunge',           label: 'Inline Lunge' },
  { key: 'shoulder_mobility',      label: 'Shoulder Mobility' },
  { key: 'aslr',                   label: 'ASLR' },
  { key: 'trunk_stability_pushup', label: 'Trunk Stability Push-Up' },
  { key: 'rotary_stability',       label: 'Rotary Stability' },
];

const EMPTY: MacroAnalytics = {
  totalClients: 0,
  clientsWithFms: 0,
  averageFmsScore: null,
  asymmetryRate: 0,
  redFlagRate: 0,
  topWeakLink: null,
  weakLinkDistribution: [],
  patternAverages: PATTERN_DEFS.map(p => ({ key: p.key, label: p.label, average: null, sampleSize: 0 })),
};

/**
 * Reduce a list of FMS assessments to one (latest) per client.
 */
export function pickLatestPerClient(rows: FmsAssessmentRow[] | null | undefined): Map<string, FmsAssessmentRow> {
  const out = new Map<string, FmsAssessmentRow>();
  for (const r of rows ?? []) {
    const cid = (r as unknown as { client_id?: string }).client_id;
    if (!cid) continue;
    const prev = out.get(cid);
    if (!prev || new Date(r.assessed_at).getTime() > new Date(prev.assessed_at).getTime()) {
      out.set(cid, r);
    }
  }
  return out;
}

export function computeMacroAnalytics(
  totalClients: number,
  latestFmsRows: FmsAssessmentRow[],
): MacroAnalytics {
  if (totalClients === 0 && latestFmsRows.length === 0) {
    return { ...EMPTY };
  }

  const n = latestFmsRows.length;
  // Average total
  const totals = latestFmsRows.map(r => r.total_score).filter((v): v is number => typeof v === 'number');
  const averageFmsScore = totals.length
    ? Math.round((totals.reduce((s, v) => s + v, 0) / totals.length) * 10) / 10
    : null;

  // Asymmetry / red-flag tallies + weak link bucket + per-pattern accumulation
  let asymmetryCount = 0;
  let redFlagCount = 0;
  const weakLinkCounts = new Map<string, number>();
  const patternAcc = new Map<string, { sum: number; count: number }>();
  PATTERN_DEFS.forEach(p => patternAcc.set(p.key, { sum: 0, count: 0 }));

  for (const r of latestFmsRows) {
    const scores = r as unknown as FmsScores;
    const patterns = computePatterns(scores);

    if (patterns.some(p => p.asymmetric)) asymmetryCount++;

    if (hasCriticalRedFlags(r).hasFlags) redFlagCount++;

    const priority = getCorrectivePriority(scores);
    if (
      priority.level !== 'optimal' &&
      priority.level !== 'incomplete' &&
      priority.patternKey &&
      priority.patternKey !== 'none'
    ) {
      // Pain is bucketed separately so we still surface clinical priorities.
      weakLinkCounts.set(priority.patternKey, (weakLinkCounts.get(priority.patternKey) ?? 0) + 1);
    }

    for (const p of patterns) {
      if (p.final === null) continue;
      const acc = patternAcc.get(p.key);
      if (acc) { acc.sum += p.final; acc.count += 1; }
    }
  }

  const asymmetryRate = n > 0 ? Math.round((asymmetryCount / n) * 100) : 0;
  const redFlagRate   = n > 0 ? Math.round((redFlagCount   / n) * 100) : 0;

  const labelFor = (key: string) =>
    PATTERN_DEFS.find(p => p.key === key)?.label
    ?? (key === 'pain' ? 'Pain / Red Flag' : key);

  const weakLinkDistribution: WeakLinkBucket[] = [...weakLinkCounts.entries()]
    .map(([patternKey, count]) => ({
      patternKey,
      label: labelFor(patternKey),
      count,
      percent: n > 0 ? Math.round((count / n) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const patternAverages: PatternAverage[] = PATTERN_DEFS.map(p => {
    const acc = patternAcc.get(p.key)!;
    return {
      key: p.key,
      label: p.label,
      average: acc.count > 0 ? Math.round((acc.sum / acc.count) * 100) / 100 : null,
      sampleSize: acc.count,
    };
  });

  return {
    totalClients,
    clientsWithFms: n,
    averageFmsScore,
    asymmetryRate,
    redFlagRate,
    topWeakLink: weakLinkDistribution[0] ?? null,
    weakLinkDistribution,
    patternAverages,
  };
}

export const PATTERN_KEYS = PATTERN_DEFS.map(p => p.key);
