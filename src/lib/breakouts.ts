// SFMA Breakout decision-tree engine.
// Generic schema so we can plug in the remaining 14 breakouts incrementally.

import type { SfmaPatternKey } from './sfma';

export const BREAKOUT_DIAGNOSES = ['TED', 'JMD', 'SMCD'] as const;
export type BreakoutDiagnosis = (typeof BREAKOUT_DIAGNOSES)[number];

export interface BreakoutOutcome {
  /** Short root-cause diagnosis code (TED / JMD / SMCD). */
  diagnosis: BreakoutDiagnosis;
  /** Optional clinical qualifier shown next to the diagnosis (e.g. "Postural"). */
  qualifier?: string;
  /** Longer clinical explanation. */
  detail?: string;
}

export interface BreakoutOption {
  /** Short label shown on the giant button (e.g. "FN" or "DN / DP"). */
  label: string;
  /** Optional helper subtitle. */
  subtitle?: string;
  /** Visual tone of the button. */
  tone: 'success' | 'warning' | 'pain' | 'neutral';
  /** Either advance to another node, or stop with an outcome. */
  next?: string; // node id
  outcome?: BreakoutOutcome;
}

export interface BreakoutNode {
  id: string;
  /** The clinical question / test prompt. */
  prompt: string;
  /** Optional helper text under the prompt. */
  hint?: string;
  options: BreakoutOption[];
}

export interface BreakoutSchema {
  /** Pattern key from SFMA Top-Tier this breakout belongs to. */
  patternKey: SfmaPatternKey;
  /** Display title of the breakout. */
  title: string;
  /** Id of the first node (root). */
  startNodeId: string;
  nodes: Record<string, BreakoutNode>;
}

// Schemas live in `sfmaBreakouts.ts` (centralized dictionary). Re-export here
// so existing imports of BREAKOUT_SCHEMAS keep working.
export { SFMA_BREAKOUTS as BREAKOUT_SCHEMAS } from './sfmaBreakouts';

// ---------------- Persistence helpers ----------------

export type BreakoutResults = Partial<Record<SfmaPatternKey, BreakoutOutcome>>;

export function parseBreakoutResults(value: unknown): BreakoutResults {
  if (!value || typeof value !== 'object') return {};
  return value as BreakoutResults;
}

export const DIAGNOSIS_META: Record<
  BreakoutDiagnosis,
  { label: string; full: string; chip: string; ring: string }
> = {
  TED: {
    label: 'TED',
    full: 'Tissue Extensibility Dysfunction',
    chip: 'bg-dysfunction text-white',
    ring: 'border-dysfunction/40',
  },
  JMD: {
    label: 'JMD',
    full: 'Joint Mobility Dysfunction',
    chip: 'bg-pain text-white',
    ring: 'border-pain/40',
  },
  SMCD: {
    label: 'SMCD',
    full: 'Stability / Motor Control Dysfunction',
    chip: 'bg-warning text-warning-foreground',
    ring: 'border-warning/40',
  },
};
