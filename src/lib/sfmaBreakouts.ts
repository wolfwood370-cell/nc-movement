// Centralized SFMA Breakouts data dictionary.
// Each entry maps a SFMA Top-Tier pattern key to a decision-tree schema
// consumed by the generic <BreakoutWizard />.

import type { BreakoutSchema } from './breakouts';
import type { SfmaPatternKey } from './sfma';

// ---------------- Helpers ----------------

/**
 * Generic fallback tree used for patterns whose breakout has not yet been
 * fully encoded. Lets the clinician record a manual outcome without crashing.
 */
function fallbackSchema(patternKey: SfmaPatternKey, title: string): BreakoutSchema {
  return {
    patternKey,
    title,
    startNodeId: 'manual',
    nodes: {
      manual: {
        id: 'manual',
        prompt: 'Esegui breakout manuale sul lettino',
        hint: 'Albero clinico in arrivo. Registra il risultato osservato.',
        options: [
          {
            label: 'FN',
            subtitle: 'Funzionale · Indolore',
            tone: 'success',
            outcome: {
              diagnosis: 'SMCD',
              detail: 'Outcome registrato manualmente: pattern funzionale → controllo motorio.',
            },
          },
          {
            label: 'DN / DP',
            subtitle: 'Disfunzionale o doloroso',
            tone: 'pain',
            outcome: {
              diagnosis: 'JMD',
              qualifier: 'o TED',
              detail: 'Outcome registrato manualmente: ipotesi articolare (JMD) o tissutale (TED).',
            },
          },
        ],
      },
    },
  };
}

// ---------------- Cervical Flexion ----------------

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

// ---------------- Multi-Segmental Flexion ----------------

const multiSegmentalFlexion: BreakoutSchema = {
  patternKey: 'multi_segmental_flexion',
  title: 'Multi-Segmental Flexion Breakout',
  startNodeId: 'active_supine_flexion',
  nodes: {
    active_supine_flexion: {
      id: 'active_supine_flexion',
      prompt: 'Active Supine Flexion (Knees to Chest)',
      hint: 'Il paziente porta attivamente le ginocchia al petto in supino.',
      options: [
        {
          label: 'FN',
          subtitle: 'Funzionale · Indolore',
          tone: 'success',
          outcome: {
            diagnosis: 'SMCD',
            qualifier: 'Postural / Active',
            detail:
              'Mobilità attiva piena in scarico: il deficit emerge in carico → controllo motorio / postura.',
          },
        },
        {
          label: 'DN / DP',
          subtitle: 'Disfunzionale o doloroso',
          tone: 'pain',
          next: 'passive_supine_flexion',
        },
      ],
    },
    passive_supine_flexion: {
      id: 'passive_supine_flexion',
      prompt: 'Passive Supine Flexion',
      hint: 'Il clinico assiste passivamente la flessione knees-to-chest.',
      options: [
        {
          label: 'FN',
          subtitle: 'Funzionale · Indolore',
          tone: 'success',
          outcome: {
            diagnosis: 'SMCD',
            qualifier: 'Passive',
            detail:
              'Mobilità passiva piena: deficit di controllo motorio nel range disponibile.',
          },
        },
        {
          label: 'DN / DP',
          subtitle: 'Disfunzionale o doloroso',
          tone: 'pain',
          outcome: {
            diagnosis: 'JMD',
            qualifier: 'o TED — Posterior Chain',
            detail:
              'Restrizione anche passiva: ipotesi articolare (JMD) o tissutale (TED) della catena posteriore.',
          },
        },
      ],
    },
  },
};

// ---------------- Upper Extremity Pattern 1 (MRE) ----------------

function ueP1(side: 'l' | 'r'): BreakoutSchema {
  const sideLabel = side === 'l' ? 'Sinistro' : 'Destro';
  return {
    patternKey: (side === 'l' ? 'upper_extremity_pattern_1_l' : 'upper_extremity_pattern_1_r') as SfmaPatternKey,
    title: `UE Pattern 1 (MRE) Breakout — ${sideLabel}`,
    startNodeId: 'prone_active_mre',
    nodes: {
      prone_active_mre: {
        id: 'prone_active_mre',
        prompt: 'Prone Active Medial Rotation / Extension',
        hint: 'In prono, il paziente porta attivamente la mano dietro la schiena verso la scapola opposta.',
        options: [
          {
            label: 'FN',
            subtitle: 'Funzionale · Indolore',
            tone: 'success',
            outcome: {
              diagnosis: 'SMCD',
              qualifier: 'Postural',
              detail:
                'Mobilità attiva piena in scarico: deficit di controllo posturale scapolo-omerale.',
            },
          },
          {
            label: 'DN / DP',
            subtitle: 'Disfunzionale o doloroso',
            tone: 'pain',
            next: 'prone_passive_mre',
          },
        ],
      },
      prone_passive_mre: {
        id: 'prone_passive_mre',
        prompt: 'Prone Passive Medial Rotation / Extension',
        hint: 'Il clinico assiste passivamente il pattern MRE.',
        options: [
          {
            label: 'FN',
            subtitle: 'Funzionale · Indolore',
            tone: 'success',
            outcome: {
              diagnosis: 'SMCD',
              qualifier: 'Passive',
              detail:
                'Range passivo pieno: deficit di controllo motorio della cuffia/scapola nel range disponibile.',
            },
          },
          {
            label: 'DN / DP',
            subtitle: 'Disfunzionale o doloroso',
            tone: 'pain',
            outcome: {
              diagnosis: 'JMD',
              qualifier: 'o TED — Shoulder Capsule / Cuff',
              detail:
                'Restrizione passiva: ipotesi articolare (JMD) capsulare o tissutale (TED) della cuffia dei rotatori.',
            },
          },
        ],
      },
    },
  };
}

// ---------------- Arms-Down Deep Squat ----------------

const armsDownDeepSquat: BreakoutSchema = {
  patternKey: 'arms_down_deep_squat',
  title: 'Arms-Down Deep Squat Breakout',
  startNodeId: 'supine_knees_to_chest',
  nodes: {
    supine_knees_to_chest: {
      id: 'supine_knees_to_chest',
      prompt: 'Supine Knees to Chest (Holding Shins)',
      hint: 'In supino, il paziente porta le ginocchia al petto tenendo le tibie.',
      options: [
        {
          label: 'FN',
          subtitle: 'Funzionale · Indolore',
          tone: 'success',
          next: 'supine_dorsiflexion',
        },
        {
          label: 'DN / DP',
          subtitle: 'Disfunzionale o doloroso',
          tone: 'pain',
          outcome: {
            diagnosis: 'JMD',
            qualifier: 'o TED — Hips / Knees',
            detail:
              'Restrizione di anche e/o ginocchia: ipotesi articolare (JMD) o tissutale (TED) dell’arto inferiore prossimale.',
          },
        },
      ],
    },
    supine_dorsiflexion: {
      id: 'supine_dorsiflexion',
      prompt: 'Supine Dorsiflexion (Ankle)',
      hint: 'Valuta la dorsiflessione passiva di caviglia in supino.',
      options: [
        {
          label: 'FN',
          subtitle: 'Funzionale · Indolore',
          tone: 'success',
          outcome: {
            diagnosis: 'SMCD',
            qualifier: 'Core / Pelvis',
            detail:
              'Mobilità di anche e caviglie integra: deficit di stabilità di core / controllo del bacino in carico.',
          },
        },
        {
          label: 'DN / DP',
          subtitle: 'Disfunzionale o doloroso',
          tone: 'pain',
          outcome: {
            diagnosis: 'JMD',
            qualifier: 'o TED — Ankle',
            detail:
              'Limitazione di dorsiflessione: ipotesi articolare (JMD) o tissutale (TED) della caviglia.',
          },
        },
      ],
    },
  },
};

// ---------------- Master dictionary ----------------

export const SFMA_BREAKOUTS: Partial<Record<SfmaPatternKey, BreakoutSchema>> = {
  cervical_flexion: cervicalFlexion,
  cervical_extension: fallbackSchema('cervical_extension', 'Cervical Extension Breakout'),
  cervical_rotation_l: fallbackSchema('cervical_rotation_l', 'Cervical Rotation Breakout — Sinistro'),
  cervical_rotation_r: fallbackSchema('cervical_rotation_r', 'Cervical Rotation Breakout — Destro'),

  upper_extremity_pattern_1_l: ueP1('l'),
  upper_extremity_pattern_1_r: ueP1('r'),
  upper_extremity_pattern_2_l: fallbackSchema('upper_extremity_pattern_2_l', 'UE Pattern 2 (LRA) Breakout — Sinistro'),
  upper_extremity_pattern_2_r: fallbackSchema('upper_extremity_pattern_2_r', 'UE Pattern 2 (LRA) Breakout — Destro'),

  multi_segmental_flexion: multiSegmentalFlexion,
  multi_segmental_extension: fallbackSchema('multi_segmental_extension', 'Multi-Segmental Extension Breakout'),
  multi_segmental_rotation_l: fallbackSchema('multi_segmental_rotation_l', 'Multi-Segmental Rotation — Sinistro'),
  multi_segmental_rotation_r: fallbackSchema('multi_segmental_rotation_r', 'Multi-Segmental Rotation — Destro'),

  single_leg_stance_l: fallbackSchema('single_leg_stance_l', 'Single Leg Stance Breakout — Sinistro'),
  single_leg_stance_r: fallbackSchema('single_leg_stance_r', 'Single Leg Stance Breakout — Destro'),

  arms_down_deep_squat: armsDownDeepSquat,
};

export function getBreakoutSchema(key: SfmaPatternKey): BreakoutSchema | undefined {
  return SFMA_BREAKOUTS[key];
}
