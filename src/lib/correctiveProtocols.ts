// =============================================================================
// Corrective Prescription Engine — Cook's "Movement" 3R protocol.
// Maps each FMS pattern key (and the generic priority level) to a practical
// Reset → Reactivate → Reinforce sequence.
// =============================================================================

export interface CorrectiveStep {
  /** Phase label, e.g. "Reset". */
  phase: 'Reset' | 'Reactivate' | 'Reinforce';
  /** Italian subtitle describing the goal of the phase. */
  goal: string;
  /** Specific exercise prescription. */
  exercise: string;
  /** Practical dosing / coaching cue. */
  dose?: string;
}

export interface CorrectiveProtocol {
  /** Human label of the targeted pattern. */
  pattern: string;
  /** One-line clinical rationale. */
  rationale: string;
  steps: [CorrectiveStep, CorrectiveStep, CorrectiveStep];
}

/**
 * Keyed by the `patternKey` returned from `getCorrectivePriority`
 * (`aslr`, `shoulder_mobility`, `rotary_stability`, `trunk_stability_pushup`,
 * `inline_lunge`, `hurdle_step`, `deep_squat`).
 *
 * Special keys: `pain` (red flag, no protocol — refer out)
 *               `none` (optimal baseline)
 *               `default` (graceful fallback)
 */
export const CORRECTIVE_PROTOCOLS: Record<string, CorrectiveProtocol> = {
  aslr: {
    pattern: 'Active Straight-Leg Raise (ASLR)',
    rationale: 'Dissociazione anca/core: ripristina la mobilità in flessione d\'anca con controllo lombo-pelvico.',
    steps: [
      { phase: 'Reset',      goal: 'Mobilità & respirazione',     exercise: 'Leg Lowering con attivazione del core', dose: '2 × 8 per lato · respiro nasale' },
      { phase: 'Reactivate', goal: 'Controllo motorio statico',    exercise: 'Half-Kneeling Chop & Lift',              dose: '3 × 6 per lato · tempo 3-1-3' },
      { phase: 'Reinforce',  goal: 'Integrazione dinamica',         exercise: 'Single-Leg Deadlift (carico leggero)',   dose: '3 × 6 per lato · focus pattern' },
    ],
  },
  shoulder_mobility: {
    pattern: 'Shoulder Mobility',
    rationale: 'Recupera estensione toracica e scorrimento gleno-omerale prima di caricare overhead.',
    steps: [
      { phase: 'Reset',      goal: 'Mobilità toracica',             exercise: 'T-Spine Rotation in quadrupedia',        dose: '2 × 8 per lato · respiro espiratorio' },
      { phase: 'Reactivate', goal: 'Controllo gleno-omerale',       exercise: 'Armbar / Screwdriver (Kettlebell)',       dose: '3 × 20\u201D per lato' },
      { phase: 'Reinforce',  goal: 'Integrazione overhead',         exercise: 'Half-Kneeling Overhead Press',            dose: '3 × 6 per lato · controllo costale' },
    ],
  },
  rotary_stability: {
    pattern: 'Rotary Stability',
    rationale: 'Costruisci anti-rotazione e cross-pattern in quadrupedia prima di progressioni dinamiche.',
    steps: [
      { phase: 'Reset',      goal: 'Allineamento & respiro',        exercise: 'Quadruped Rocking + Crocodile Breathing', dose: '2 × 60\u201D' },
      { phase: 'Reactivate', goal: 'Cross-pattern statico',         exercise: 'Bird-Dog con tocco alterno',              dose: '3 × 6 per lato · tempo 5\u201D hold' },
      { phase: 'Reinforce',  goal: 'Anti-rotazione dinamica',       exercise: 'Half-Kneeling Pallof Press',              dose: '3 × 8 per lato' },
    ],
  },
  trunk_stability_pushup: {
    pattern: 'Trunk Stability Push-Up',
    rationale: 'Riallinea la trasmissione dell\'estensore toracico e della parete addominale prima del push-up pieno.',
    steps: [
      { phase: 'Reset',      goal: 'Respirazione diaframmatica',    exercise: 'Crocodile Breathing',                     dose: '2 × 90\u201D' },
      { phase: 'Reactivate', goal: 'Reflexive core',                exercise: 'Rolling supino → prono · Bird-Dog',       dose: '3 × 4 rotolate per lato' },
      { phase: 'Reinforce',  goal: 'Push-up pattern',               exercise: 'Elevated Push-Up (banco/bilanciere)',     dose: '3 × 6 · tempo 3-1-1' },
    ],
  },
  inline_lunge: {
    pattern: 'Inline Lunge',
    rationale: 'Ricostruisci stabilità monopodalica nel piano sagittale con dissociazione anca/torace.',
    steps: [
      { phase: 'Reset',      goal: 'Mobilità d\'anca & caviglia',   exercise: 'Half-Kneeling Hip Flexor + Ankle Rocking', dose: '2 × 8 per lato' },
      { phase: 'Reactivate', goal: 'Stabilità split-stance',        exercise: 'Half-Kneeling Stick Press (overhead)',    dose: '3 × 30\u201D per lato' },
      { phase: 'Reinforce',  goal: 'Pattern di affondo',            exercise: 'Reverse Lunge con stick verticale',       dose: '3 × 6 per lato' },
    ],
  },
  hurdle_step: {
    pattern: 'Hurdle Step',
    rationale: 'Disciplina lo step monopodalico: stabilità d\'appoggio + mobilità d\'anca controlaterale.',
    steps: [
      { phase: 'Reset',      goal: 'Mobilità anca/caviglia',        exercise: 'Supine 90/90 Hip Lift + Ankle Rocking',   dose: '2 × 8 per lato' },
      { phase: 'Reactivate', goal: 'Single-leg balance',            exercise: 'Single-Leg Stance (occhi aperti → chiusi)', dose: '3 × 30\u201D per lato' },
      { phase: 'Reinforce',  goal: 'Step pattern',                  exercise: 'Mini-band Marching · step-over basso',    dose: '3 × 8 per lato' },
    ],
  },
  deep_squat: {
    pattern: 'Deep Squat',
    rationale: 'Sblocca dorsiflessione e estensione toracica per uno squat globale a piedi paralleli.',
    steps: [
      { phase: 'Reset',      goal: 'Mobilità globale',              exercise: 'Goblet Squat Hold + Ankle Rocking',       dose: '2 × 45\u201D' },
      { phase: 'Reactivate', goal: 'Pattern profondo statico',      exercise: 'Assisted Squat (TRX / palo) hold profondo', dose: '3 × 30\u201D' },
      { phase: 'Reinforce',  goal: 'Squat caricato',                exercise: 'Goblet Squat lento',                      dose: '3 × 6 · tempo 3-1-3' },
    ],
  },
  // ---- Specials ------------------------------------------------------------
  pain: {
    pattern: 'Dolore rilevato',
    rationale: 'In presenza di dolore non si prescrivono correttivi: necessario rinvio clinico.',
    steps: [
      { phase: 'Reset',      goal: 'Stop ai carichi',  exercise: 'Sospendere sollecitazioni del distretto doloroso' },
      { phase: 'Reactivate', goal: 'Valutazione',      exercise: 'Eseguire SFMA Top-Tier per localizzare il driver' },
      { phase: 'Reinforce',  goal: 'Rinvio',           exercise: 'Indirizzare a valutazione medica/specialistica' },
    ],
  },
  none: {
    pattern: 'Baseline ottimale',
    rationale: 'Tutti i pattern ≥ 2 senza dolore né asimmetrie. Procedi alla programmazione di performance.',
    steps: [
      { phase: 'Reset',      goal: 'Mantenimento',     exercise: 'Routine di mobilità giornaliera (5\u20137\u2032)' },
      { phase: 'Reactivate', goal: 'Pre-allenamento',  exercise: 'Movement Prep specifico per la sessione' },
      { phase: 'Reinforce',  goal: 'Performance',      exercise: 'Carica progressivamente forza, potenza e capacità sport-specifiche' },
    ],
  },
  default: {
    pattern: 'Protocollo generico',
    rationale: 'Pattern non mappato: applica il framework Reset → Reactivate → Reinforce sull\'area limitante.',
    steps: [
      { phase: 'Reset',      goal: 'Mobilità mirata',        exercise: 'Drill di mobilità del distretto limitante', dose: '2 × 8\u201310' },
      { phase: 'Reactivate', goal: 'Controllo motorio',       exercise: 'Esercizio di stabilità statica isometrica', dose: '3 × 20\u201330\u201D' },
      { phase: 'Reinforce',  goal: 'Pattern integrato',       exercise: 'Pattern dinamico a basso carico',            dose: '3 × 6\u20138' },
    ],
  },
};

export function getCorrectiveProtocol(patternKey: string | undefined | null): CorrectiveProtocol {
  if (!patternKey) return CORRECTIVE_PROTOCOLS.default;
  return CORRECTIVE_PROTOCOLS[patternKey] ?? CORRECTIVE_PROTOCOLS.default;
}
