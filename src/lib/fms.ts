// FMS scoring & Cook's Corrective Algorithm

export type Score = 0 | 1 | 2 | 3 | null;

export interface FmsScores {
  deep_squat_score: Score;
  tibia_length_cm: number | null;
  hurdle_step_left: Score; hurdle_step_right: Score;
  inline_lunge_left: Score; inline_lunge_right: Score;
  ankle_clearing_left_pain: boolean;
  ankle_clearing_right_pain: boolean;
  shoulder_mobility_left: Score; shoulder_mobility_right: Score;
  hand_length_cm: number | null;
  aslr_left: Score; aslr_right: Score;
  trunk_stability_pushup_score: Score;
  rotary_stability_left: Score; rotary_stability_right: Score;
  clearing_shoulder_pain: boolean;
  clearing_shoulder_left_pain: boolean;
  clearing_shoulder_right_pain: boolean;
  clearing_spinal_extension_pain: boolean;
  clearing_spinal_flexion_pain: boolean;
}

export const emptyFmsScores = (): FmsScores => ({
  deep_squat_score: null,
  tibia_length_cm: null,
  hurdle_step_left: null, hurdle_step_right: null,
  inline_lunge_left: null, inline_lunge_right: null,
  ankle_clearing_left_pain: false,
  ankle_clearing_right_pain: false,
  shoulder_mobility_left: null, shoulder_mobility_right: null,
  hand_length_cm: null,
  aslr_left: null, aslr_right: null,
  trunk_stability_pushup_score: null,
  rotary_stability_left: null, rotary_stability_right: null,
  clearing_shoulder_pain: false,
  clearing_shoulder_left_pain: false,
  clearing_shoulder_right_pain: false,
  clearing_spinal_extension_pain: false,
  clearing_spinal_flexion_pain: false,
});

export interface PatternResult {
  key: string;
  label: string;
  bilateral: boolean;
  left: Score;
  right: Score;
  final: Score; // lowest of L/R, or unilateral score
  asymmetric: boolean;
  cleared: boolean; // forced to 0 by clearing test
}

/**
 * Apply clearing tests: positive (+) pain forces the associated pattern score to 0.
 * - Shoulder pain  -> Shoulder Mobility = 0
 * - Spinal extension pain -> Trunk Stability Push-Up = 0
 * - Spinal flexion pain   -> Rotary Stability = 0
 * Ankle clearing is informational only (does not alter scores).
 */
export function computePatterns(s: FmsScores): PatternResult[] {
  const lowest = (l: Score, r: Score): Score => {
    if (l === null || r === null) return null;
    return (Math.min(l, r) as Score);
  };
  const sm_l: Score = (s.clearing_shoulder_pain || s.clearing_shoulder_left_pain) ? 0 : s.shoulder_mobility_left;
  const sm_r: Score = (s.clearing_shoulder_pain || s.clearing_shoulder_right_pain) ? 0 : s.shoulder_mobility_right;
  const tspu: Score = s.clearing_spinal_extension_pain ? 0 : s.trunk_stability_pushup_score;
  const rs_l: Score = s.clearing_spinal_flexion_pain ? 0 : s.rotary_stability_left;
  const rs_r: Score = s.clearing_spinal_flexion_pain ? 0 : s.rotary_stability_right;

  return [
    { key: 'deep_squat', label: 'Deep Squat', bilateral: false,
      left: s.deep_squat_score, right: s.deep_squat_score,
      final: s.deep_squat_score, asymmetric: false, cleared: false },
    { key: 'hurdle_step', label: 'Hurdle Step', bilateral: true,
      left: s.hurdle_step_left, right: s.hurdle_step_right,
      final: lowest(s.hurdle_step_left, s.hurdle_step_right),
      asymmetric: s.hurdle_step_left !== null && s.hurdle_step_right !== null && s.hurdle_step_left !== s.hurdle_step_right,
      cleared: false },
    { key: 'inline_lunge', label: 'Inline Lunge', bilateral: true,
      left: s.inline_lunge_left, right: s.inline_lunge_right,
      final: lowest(s.inline_lunge_left, s.inline_lunge_right),
      asymmetric: s.inline_lunge_left !== null && s.inline_lunge_right !== null && s.inline_lunge_left !== s.inline_lunge_right,
      cleared: false },
    { key: 'shoulder_mobility', label: 'Shoulder Mobility', bilateral: true,
      left: sm_l, right: sm_r,
      final: lowest(sm_l, sm_r),
      asymmetric: sm_l !== null && sm_r !== null && sm_l !== sm_r,
      cleared: s.clearing_shoulder_pain || s.clearing_shoulder_left_pain || s.clearing_shoulder_right_pain },
    { key: 'aslr', label: 'Active Straight-Leg Raise', bilateral: true,
      left: s.aslr_left, right: s.aslr_right,
      final: lowest(s.aslr_left, s.aslr_right),
      asymmetric: s.aslr_left !== null && s.aslr_right !== null && s.aslr_left !== s.aslr_right,
      cleared: false },
    { key: 'trunk_stability_pushup', label: 'Trunk Stability Push-Up', bilateral: false,
      left: tspu, right: tspu, final: tspu, asymmetric: false,
      cleared: s.clearing_spinal_extension_pain },
    { key: 'rotary_stability', label: 'Rotary Stability', bilateral: true,
      left: rs_l, right: rs_r,
      final: lowest(rs_l, rs_r),
      asymmetric: rs_l !== null && rs_r !== null && rs_l !== rs_r,
      cleared: s.clearing_spinal_flexion_pain },
  ];
}

export function computeTotal(patterns: PatternResult[]): number | null {
  if (patterns.some(p => p.final === null)) return null;
  return patterns.reduce((sum, p) => sum + (p.final as number), 0);
}

/**
 * Cook's Corrective Algorithm hierarchy:
 *  1. Mobility       — ASLR or Shoulder Mobility = 1
 *  2. Motor Control  — Rotary Stability or Trunk Stability Push-Up = 1
 *  3. Functional     — Inline Lunge, Hurdle Step, or Deep Squat = 1
 * If any final score = 0 (pain), that takes absolute priority.
 */
export function primaryCorrective(patterns: PatternResult[]): {
  level: 'pain' | 'mobility' | 'motor_control' | 'functional' | 'clear' | 'incomplete';
  label: string;
  detail: string;
} {
  if (patterns.some(p => p.final === null)) {
    return { level: 'incomplete', label: 'Incompleto', detail: 'Assegna un punteggio a ogni pattern per generare il focus correttivo.' };
  }
  const painful = patterns.filter(p => p.final === 0);
  if (painful.length) {
    return {
      level: 'pain',
      label: 'Riferire / Gestire il Dolore',
      detail: `Dolore rilevato in: ${painful.map(p => p.label).join(', ')}. Trattare il dolore prima di progredire nella gerarchia correttiva.`,
    };
  }
  const at = (key: string) => patterns.find(p => p.key === key)!;
  const mobility = [at('aslr'), at('shoulder_mobility')].filter(p => p.final === 1);
  if (mobility.length) {
    return {
      level: 'mobility',
      label: 'Mobilità',
      detail: `Priorità ai correttivi di mobilità per: ${mobility.map(p => p.label).join(', ')}.`,
    };
  }
  const motor = [at('rotary_stability'), at('trunk_stability_pushup')].filter(p => p.final === 1);
  if (motor.length) {
    return {
      level: 'motor_control',
      label: 'Controllo Motorio / Stabilità',
      detail: `Priorità ai correttivi di stabilità per: ${motor.map(p => p.label).join(', ')}.`,
    };
  }
  const fn = [at('inline_lunge'), at('hurdle_step'), at('deep_squat')].filter(p => p.final === 1);
  if (fn.length) {
    return {
      level: 'functional',
      label: 'Ri-pattern Funzionale',
      detail: `Ri-pattern: ${fn.map(p => p.label).join(', ')}.`,
    };
  }
  return { level: 'clear', label: 'Nessuna Limitazione', detail: 'Tutti i pattern ≥ 2. Allenare con fiducia.' };
}

/**
 * Color tokens per score:
 *  0 = rosso (pain), 1 = giallo (warning), 2 = arancione (dysfunction), 3 = verde (functional)
 */
// =============================================================================
// Cook's Corrective Priority Engine
// =============================================================================

export type CorrectivePriorityLevel = 'red_flag' | 'mobility' | 'motor_control' | 'functional' | 'optimal' | 'incomplete';

export interface CorrectivePriority {
  level: CorrectivePriorityLevel;
  /** Short headline, e.g. "Right Hip Mobility (ASLR)" */
  focus: string;
  /** Pattern key targeted (or 'pain' / 'none') */
  patternKey: string;
  /** Side targeted, when applicable */
  side: 'left' | 'right' | 'bilateral' | 'none';
  /** Headline label suitable for badges, e.g. "Mobilità" */
  category: string;
  /** Verbose detail for clinicians */
  detail: string;
  /** Client-facing translation */
  clientExplanation: string;
}

const PATTERN_LABELS_IT: Record<string, { label: string; clientPart: string }> = {
  aslr: { label: 'Active Straight-Leg Raise (ASLR)', clientPart: 'mobilità dell\'anca' },
  shoulder_mobility: { label: 'Shoulder Mobility', clientPart: 'mobilità della spalla' },
  rotary_stability: { label: 'Rotary Stability', clientPart: 'controllo del core in quadrupedia' },
  trunk_stability_pushup: { label: 'Trunk Stability Push-Up', clientPart: 'stabilità del tronco' },
  inline_lunge: { label: 'Inline Lunge', clientPart: 'pattern di affondo monopodalico' },
  hurdle_step: { label: 'Hurdle Step', clientPart: 'pattern di passo monopodalico' },
  deep_squat: { label: 'Deep Squat', clientPart: 'pattern globale di squat' },
};

/**
 * Pick the most clinically meaningful pattern from a list, honouring the
 * "asymmetry beats bilateral dysfunction" rule.
 *
 * Within a tier we look for:
 *   1. Asymmetric patterns where the worst side is exactly `targetScore`
 *   2. Bilateral patterns where both sides equal `targetScore`
 */
function pickPatternByTier(
  patterns: PatternResult[],
  keys: string[],
  targetScore: 1 | 2
): PatternResult | null {
  const inTier = keys
    .map(k => patterns.find(p => p.key === k))
    .filter((p): p is PatternResult => !!p);

  // Asymmetry first: worst side === targetScore
  const asymmetric = inTier.filter(p =>
    p.bilateral && p.asymmetric && p.left !== null && p.right !== null &&
    Math.min(p.left, p.right) === targetScore
  );
  if (asymmetric.length) return asymmetric[0];

  // Bilateral / unilateral dysfunction at targetScore
  const flat = inTier.filter(p => p.final === targetScore);
  if (flat.length) return flat[0];

  return null;
}

function describeSide(p: PatternResult): 'left' | 'right' | 'bilateral' | 'none' {
  if (!p.bilateral) return 'none';
  if (p.left === null || p.right === null) return 'bilateral';
  if (p.left === p.right) return 'bilateral';
  return p.left < p.right ? 'left' : 'right';
}

function sideLabelIt(side: 'left' | 'right' | 'bilateral' | 'none'): string {
  if (side === 'left') return 'Sinistra';
  if (side === 'right') return 'Destra';
  if (side === 'bilateral') return 'Bilaterale';
  return '';
}

/**
 * Implements Gray Cook's exact FMS corrective hierarchy and returns the SINGLE
 * most important focus. Asymmetries always take precedence over bilateral
 * dysfunctions within the same tier.
 */
export function getCorrectivePriority(scores: FmsScores): CorrectivePriority {
  const patterns = computePatterns(scores);

  // PRIORITY 0 — Pain / Red Flag.
  // Includes any pattern scored 0 OR any positive clearing test (informational
  // ankle clearing also counts as a red flag for safety).
  const painPatterns = patterns.filter(p => p.final === 0);
  const ankleFlag = scores.ankle_clearing_left_pain || scores.ankle_clearing_right_pain;
  if (painPatterns.length || ankleFlag) {
    const list = painPatterns.map(p => p.label);
    if (ankleFlag) list.push('Ankle Clearing');
    return {
      level: 'red_flag',
      focus: 'Riferimento Medico Richiesto',
      patternKey: 'pain',
      side: 'none',
      category: 'Red Flag',
      detail: `Dolore rilevato in: ${list.join(', ')}. Sospendere la progressione e indirizzare a SFMA / valutazione medica.`,
      clientExplanation: 'Abbiamo rilevato dolore durante uno o più test fondamentali. Per la tua sicurezza interrompiamo i carichi e procediamo con una valutazione clinica più approfondita (SFMA) prima di qualsiasi programma di allenamento.',
    };
  }

  // Need a complete assessment to proceed.
  if (patterns.some(p => p.final === null)) {
    return {
      level: 'incomplete',
      focus: 'Valutazione incompleta',
      patternKey: 'none',
      side: 'none',
      category: 'Incompleto',
      detail: 'Compila tutti i pattern per generare la priorità correttiva.',
      clientExplanation: 'Il report sarà disponibile una volta completati tutti i pattern di valutazione.',
    };
  }

  const buildResult = (
    level: CorrectivePriorityLevel,
    category: string,
    p: PatternResult,
    targetScore: 1 | 2
  ): CorrectivePriority => {
    const side = describeSide(p);
    const meta = PATTERN_LABELS_IT[p.key] ?? { label: p.label, clientPart: p.label.toLowerCase() };
    const sideLabel = sideLabelIt(side);
    const focusBits = [sideLabel, meta.label].filter(Boolean).join(' · ');
    const asymmetryNote = p.asymmetric ? ' (asimmetria L/R)' : '';
    return {
      level,
      focus: focusBits + asymmetryNote,
      patternKey: p.key,
      side,
      category,
      detail: `Priorità ${category.toLowerCase()}: ${p.label} con punteggio ${targetScore}${asymmetryNote}. Indirizza i correttivi qui prima di progredire.`,
      clientExplanation: buildClientExplanation(level, meta.clientPart, p.asymmetric, side),
    };
  };

  // PRIORITY 1 — Mobility (ASLR, Shoulder Mobility)
  const mob1 = pickPatternByTier(patterns, ['aslr', 'shoulder_mobility'], 1);
  if (mob1) return buildResult('mobility', 'Mobilità', mob1, 1);

  // PRIORITY 2 — Motor Control (Rotary Stability, Trunk Stability Push-Up)
  const mc1 = pickPatternByTier(patterns, ['rotary_stability', 'trunk_stability_pushup'], 1);
  if (mc1) return buildResult('motor_control', 'Controllo Motorio', mc1, 1);

  // PRIORITY 3 — Functional patterns: Inline Lunge → Hurdle Step → Deep Squat
  const fnOrder = ['inline_lunge', 'hurdle_step', 'deep_squat'];
  const fn1 = pickPatternByTier(patterns, fnOrder, 1);
  if (fn1) return buildResult('functional', 'Pattern Funzionale', fn1, 1);

  // Fallback within tier 3 — target a "2" only if everything else is perfect (3s)
  const fn2 = pickPatternByTier(patterns, fnOrder, 2);
  if (fn2) {
    // Only flag if there is at least one 2 anywhere — otherwise it's all 3s.
    return buildResult('functional', 'Pattern Funzionale', fn2, 2);
  }

  return {
    level: 'optimal',
    focus: 'Nessuna Limitazione',
    patternKey: 'none',
    side: 'none',
    category: 'Ottimale',
    detail: 'Tutti i pattern ≥ 2 senza dolore né asimmetrie significative. Allenare con fiducia.',
    clientExplanation: 'I tuoi pattern fondamentali di movimento sono solidi. Possiamo procedere con fiducia ad aggiungere intensità, volume e complessità nel tuo programma.',
  };
}

function buildClientExplanation(
  level: CorrectivePriorityLevel,
  bodyPart: string,
  asymmetric: boolean,
  side: 'left' | 'right' | 'bilateral' | 'none'
): string {
  const sideText = side === 'left' ? 'sul lato sinistro' : side === 'right' ? 'sul lato destro' : '';
  if (level === 'mobility') {
    if (asymmetric) {
      return `Abbiamo trovato un'asimmetria nella ${bodyPart} ${sideText}. Prima di aggiungere carichi importanti su squat, stacchi o gesti sportivi, dobbiamo risolvere questo squilibrio per proteggere colonna e articolazioni.`;
    }
    return `La tua ${bodyPart} è limitata. Lavoreremo sulla mobilità di base prima di caricare il movimento, in modo da costruire forza su una base solida.`;
  }
  if (level === 'motor_control') {
    if (asymmetric) {
      return `Hai mobilità sufficiente ma il controllo nel ${bodyPart} è asimmetrico ${sideText}. Inseriremo esercizi di stabilizzazione mirati prima di passare a carichi pesanti.`;
    }
    return `Hai mobilità sufficiente, ma il ${bodyPart} non è ancora stabile sotto sforzo. Prioritizziamo esercizi di controllo per evitare compensi durante l'allenamento.`;
  }
  if (level === 'functional') {
    return `Mobilità e stabilità sono buone: dobbiamo solo affinare il ${bodyPart}. Useremo esercizi correttivi specifici per renderlo fluido e sicuro sotto carico.`;
  }
  return '';
}

// =============================================================================
// Clinical Safety Locks — Red Flag Detection
// =============================================================================

export interface RedFlagReport {
  hasFlags: boolean;
  hasPain: boolean;
  hasCriticalAsymmetry: boolean;
  hasClearingPain: boolean;
  reasons: string[];
}

/**
 * Returns true if the FMS contains clinical red flags that should LOCK
 * downstream dynamic capacity testing (FCS / YBT).
 *
 * Red flags include:
 *  - Any pattern scored 0 (pain)
 *  - Any positive clearing test (shoulder, spinal, ankle)
 *  - Critical L/R asymmetry: a "1" on one side with "2" or "3" on the other
 *    (a true 1/2 or 1/3 split that demands SFMA before loading)
 */
export function hasCriticalRedFlags(scores: Partial<FmsScores> | null | undefined): RedFlagReport {
  const empty: RedFlagReport = {
    hasFlags: false, hasPain: false, hasCriticalAsymmetry: false, hasClearingPain: false, reasons: [],
  };
  if (!scores) return empty;

  const reasons: string[] = [];
  const full = { ...emptyFmsScores(), ...scores } as FmsScores;
  const patterns = computePatterns(full);

  const painful = patterns.filter(p => p.final === 0);
  const hasPain = painful.length > 0;
  if (hasPain) reasons.push(`Dolore (0) in: ${painful.map(p => p.label).join(', ')}`);

  const hasClearingPain =
    !!full.clearing_shoulder_pain ||
    !!full.clearing_shoulder_left_pain ||
    !!full.clearing_shoulder_right_pain ||
    !!full.clearing_spinal_extension_pain ||
    !!full.clearing_spinal_flexion_pain ||
    !!full.ankle_clearing_left_pain ||
    !!full.ankle_clearing_right_pain;
  if (hasClearingPain) reasons.push('Clearing test positivo');

  // Critical asymmetry: 1 on one side and 2 or 3 on the other
  const criticalAsym = patterns.find(p => {
    if (!p.bilateral || p.left === null || p.right === null) return false;
    const lo = Math.min(p.left, p.right);
    const hi = Math.max(p.left, p.right);
    return lo === 1 && hi >= 2;
  });
  const hasCriticalAsymmetry = !!criticalAsym;
  if (criticalAsym) reasons.push(`Asimmetria critica in ${criticalAsym.label} (${criticalAsym.left}/${criticalAsym.right})`);

  const hasFlags = hasPain || hasClearingPain || hasCriticalAsymmetry;
  return { hasFlags, hasPain, hasCriticalAsymmetry, hasClearingPain, reasons };
}

export const scoreColor = (s: Score): string => {
  if (s === null) return 'bg-muted text-muted-foreground';
  if (s === 0) return 'bg-pain text-destructive-foreground';
  if (s === 1) return 'bg-dysfunction text-white';
  if (s === 2) return 'bg-warning text-warning-foreground';
  return 'bg-functional text-success-foreground';
};
