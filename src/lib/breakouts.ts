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

// ---------------- Cervical Flexion (proof-of-concept) ----------------

const cervicalFlexion: BreakoutSchema = {
  patternKey: 'cervical_flexion',
  title: 'Cervical Flexion Breakout',
  startNodeId: 'active_supine',
  nodes: {
    active_supine: {
      id: 'active_supine',
      prompt: 'Active Supine Cervical Flexion',
      hint: 'Il paziente in posizione supina porta attivamente il mento al petto.',
      options: [
        {
          label: 'FN',
          subtitle: 'Funzionale · Indolore',
          tone: 'success',
          outcome: {
            diagnosis: 'SMCD',
            detail:
              'Mobilità attiva integra in scarico: dysfunction in carico → controllo motorio / stabilizzazione cervicale.',
          },
        },
        {
          label: 'DN / DP',
          subtitle: 'Disfunzionale o doloroso',
          tone: 'pain',
          next: 'passive_supine',
        },
      ],
    },
    passive_supine: {
      id: 'passive_supine',
      prompt: 'Passive Supine Cervical Flexion',
      hint: 'Il clinico assiste passivamente il movimento.',
      options: [
        {
          label: 'FN',
          subtitle: 'Funzionale · Indolore',
          tone: 'success',
          outcome: {
            diagnosis: 'SMCD',
            qualifier: 'Postural',
            detail:
              'Mobilità passiva piena: deficit di controllo posturale / catena anteriore.',
          },
        },
        {
          label: 'DN / DP',
          subtitle: 'Disfunzionale o doloroso',
          tone: 'pain',
          outcome: {
            diagnosis: 'JMD',
            qualifier: 'o TED',
            detail:
              'Restrizione anche passiva → ipotesi articolare (JMD) o tissutale (TED). Approfondire con test segmentari.',
          },
        },
      ],
    },
  },
};

export const BREAKOUT_SCHEMAS: Partial<Record<SfmaPatternKey, BreakoutSchema>> = {
  cervical_flexion: cervicalFlexion,
};

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
