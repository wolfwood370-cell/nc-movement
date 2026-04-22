// Centralized SFMA Breakouts data dictionary.
// Each entry maps a SFMA Top-Tier pattern key to a decision-tree schema
// consumed by the generic <BreakoutWizard />.
//
// Schemas follow Cook/Burton's SFMA logic: an active in-charge dysfunction
// is decomposed by removing load (active unloaded → passive) until the
// limiting tissue/joint/control deficit is isolated as JMD, TED or SMCD.

import type { BreakoutSchema, BreakoutNode } from './breakouts';
import type { SfmaPatternKey } from './sfma';

// ---------------- Generic helpers ----------------

/**
 * Two-step active → passive breakout shared by most cervical, multi-segmental
 * and UE patterns. Renders a clean wizard without duplicating boilerplate.
 */
function activePassiveSchema(args: {
  patternKey: SfmaPatternKey;
  title: string;
  activePrompt: string;
  activeHint: string;
  passivePrompt: string;
  passiveHint: string;
  smcdPostureQualifier?: string;
  jmdQualifier?: string;
  jmdDetail?: string;
}): BreakoutSchema {
  const active: BreakoutNode = {
    id: 'active',
    prompt: args.activePrompt,
    hint: args.activeHint,
    options: [
      {
        label: 'FN',
        subtitle: 'Funzionale · Indolore',
        tone: 'success',
        outcome: {
          diagnosis: 'SMCD',
          qualifier: args.smcdPostureQualifier,
          detail: 'Mobilità attiva piena in scarico: il deficit emerge in carico → controllo motorio / posturale.',
        },
      },
      { label: 'DN / DP', subtitle: 'Disfunzionale o doloroso', tone: 'pain', next: 'passive' },
    ],
  };
  const passive: BreakoutNode = {
    id: 'passive',
    prompt: args.passivePrompt,
    hint: args.passiveHint,
    options: [
      {
        label: 'FN',
        subtitle: 'Funzionale · Indolore',
        tone: 'success',
        outcome: {
          diagnosis: 'SMCD',
          qualifier: 'Active',
          detail: 'Range passivo pieno: deficit di controllo motorio nel range disponibile.',
        },
      },
      {
        label: 'DN / DP',
        subtitle: 'Disfunzionale o doloroso',
        tone: 'pain',
        outcome: {
          diagnosis: 'JMD',
          qualifier: args.jmdQualifier ?? 'o TED',
          detail: args.jmdDetail ?? 'Restrizione anche passiva → ipotesi articolare (JMD) o tissutale (TED). Approfondire con test segmentari.',
        },
      },
    ],
  };
  return {
    patternKey: args.patternKey,
    title: args.title,
    startNodeId: 'active',
    nodes: { active, passive },
  };
}

// ---------------- Cervical ----------------

const cervicalFlexion = activePassiveSchema({
  patternKey: 'cervical_flexion',
  title: 'Cervical Flexion Breakout',
  activePrompt: 'Active Supine Cervical Flexion',
  activeHint: 'In supino, mento al petto attivamente.',
  passivePrompt: 'Passive Supine Cervical Flexion',
  passiveHint: 'Il clinico assiste passivamente la flessione cervicale.',
  smcdPostureQualifier: 'Postural',
  jmdQualifier: 'o TED — Posterior cervical chain',
});

const cervicalExtension = activePassiveSchema({
  patternKey: 'cervical_extension',
  title: 'Cervical Extension Breakout',
  activePrompt: 'Active Supine Cervical Extension',
  activeHint: 'In supino, estensione cervicale attiva massima.',
  passivePrompt: 'Passive Supine Cervical Extension',
  passiveHint: 'Il clinico assiste passivamente l\'estensione cervicale.',
  smcdPostureQualifier: 'Postural',
  jmdQualifier: 'o TED — Anterior cervical chain',
});

function cervicalRotation(side: 'l' | 'r'): BreakoutSchema {
  const sideLabel = side === 'l' ? 'Sinistra' : 'Destra';
  return activePassiveSchema({
    patternKey: (side === 'l' ? 'cervical_rotation_l' : 'cervical_rotation_r') as SfmaPatternKey,
    title: `Cervical Rotation Breakout — ${sideLabel}`,
    activePrompt: `Active Supine Cervical Rotation ${sideLabel}`,
    activeHint: 'In supino, rotazione cervicale attiva omolaterale.',
    passivePrompt: `Passive Supine Cervical Rotation ${sideLabel}`,
    passiveHint: 'Il clinico assiste passivamente la rotazione.',
    smcdPostureQualifier: 'Postural',
    jmdQualifier: 'o TED — Cervical capsule',
  });
}

// ---------------- Upper Extremity ----------------

function ueP1(side: 'l' | 'r'): BreakoutSchema {
  const sideLabel = side === 'l' ? 'Sinistro' : 'Destro';
  return activePassiveSchema({
    patternKey: (side === 'l' ? 'upper_extremity_pattern_1_l' : 'upper_extremity_pattern_1_r') as SfmaPatternKey,
    title: `UE Pattern 1 (MRE) Breakout — ${sideLabel}`,
    activePrompt: 'Prone Active Medial Rotation / Extension',
    activeHint: 'In prono, mano dietro la schiena verso la scapola opposta.',
    passivePrompt: 'Prone Passive Medial Rotation / Extension',
    passiveHint: 'Il clinico assiste passivamente il pattern MRE.',
    smcdPostureQualifier: 'Postural · Scapulo-humeral',
    jmdQualifier: 'o TED — Shoulder capsule / Cuff',
  });
}

function ueP2(side: 'l' | 'r'): BreakoutSchema {
  const sideLabel = side === 'l' ? 'Sinistro' : 'Destro';
  return activePassiveSchema({
    patternKey: (side === 'l' ? 'upper_extremity_pattern_2_l' : 'upper_extremity_pattern_2_r') as SfmaPatternKey,
    title: `UE Pattern 2 (LRF) Breakout — ${sideLabel}`,
    activePrompt: 'Prone Active Lateral Rotation / Flexion',
    activeHint: 'In prono, mano dietro la nuca verso la scapola opposta.',
    passivePrompt: 'Prone Passive Lateral Rotation / Flexion',
    passiveHint: 'Il clinico assiste passivamente il pattern LRF.',
    smcdPostureQualifier: 'Postural · Thoracic / Scapular',
    jmdQualifier: 'o TED — Posterior capsule / T-spine',
  });
}

// ---------------- Multi-Segmental ----------------

const multiSegmentalFlexion: BreakoutSchema = {
  patternKey: 'multi_segmental_flexion',
  title: 'Multi-Segmental Flexion Breakout',
  startNodeId: 'active_supine_flexion',
  nodes: {
    active_supine_flexion: {
      id: 'active_supine_flexion',
      prompt: 'Active Supine Knees-to-Chest',
      hint: 'In supino, ginocchia al petto attivamente.',
      options: [
        {
          label: 'FN', subtitle: 'Funzionale · Indolore', tone: 'success',
          outcome: { diagnosis: 'SMCD', qualifier: 'Postural', detail: 'Mobilità attiva piena: deficit posturale in carico.' },
        },
        { label: 'DN / DP', subtitle: 'Disfunzionale o doloroso', tone: 'pain', next: 'passive_supine_flexion' },
      ],
    },
    passive_supine_flexion: {
      id: 'passive_supine_flexion',
      prompt: 'Passive Supine Knees-to-Chest',
      hint: 'Il clinico assiste la flessione knees-to-chest.',
      options: [
        {
          label: 'FN', subtitle: 'Funzionale · Indolore', tone: 'success',
          outcome: { diagnosis: 'SMCD', qualifier: 'Active', detail: 'Range passivo pieno: deficit di controllo motorio.' },
        },
        {
          label: 'DN / DP', subtitle: 'Disfunzionale o doloroso', tone: 'pain',
          outcome: { diagnosis: 'JMD', qualifier: 'o TED — Posterior chain', detail: 'Restrizione passiva: ipotesi JMD/TED della catena posteriore (lombare, ischio).' },
        },
      ],
    },
  },
};

const multiSegmentalExtension: BreakoutSchema = {
  patternKey: 'multi_segmental_extension',
  title: 'Multi-Segmental Extension Breakout',
  startNodeId: 'ue_only',
  nodes: {
    ue_only: {
      id: 'ue_only',
      prompt: 'Estensione solo arti superiori (overhead)',
      hint: 'Il paziente esegue overhead reach senza estendere il rachide.',
      options: [
        { label: 'FN', subtitle: 'UE indipendente OK', tone: 'success', next: 'spine_only' },
        {
          label: 'DN / DP', subtitle: 'Limite negli UE', tone: 'pain',
          outcome: { diagnosis: 'JMD', qualifier: 'Shoulder/T-spine', detail: 'Limite negli UE isolati: ipotesi JMD/TED scapolo-omerale o toracica alta.' },
        },
      ],
    },
    spine_only: {
      id: 'spine_only',
      prompt: 'Estensione solo del rachide (mani sui fianchi)',
      hint: 'Estensione attiva del rachide senza UE.',
      options: [
        {
          label: 'FN', subtitle: 'Spine OK', tone: 'success',
          outcome: { diagnosis: 'SMCD', qualifier: 'Combined pattern', detail: 'UE e rachide isolati FN: deficit di integrazione/controllo nel pattern combinato.' },
        },
        { label: 'DN / DP', subtitle: 'Limite spinale', tone: 'pain', next: 'prone_press_up' },
      ],
    },
    prone_press_up: {
      id: 'prone_press_up',
      prompt: 'Prone Press-Up (estensione passiva lombare)',
      hint: 'Posizione "Sphinx/Cobra" passiva.',
      options: [
        {
          label: 'FN', subtitle: 'Range passivo OK', tone: 'success',
          outcome: { diagnosis: 'SMCD', qualifier: 'Spine extension control', detail: 'Range passivo pieno: deficit di controllo motorio in estensione del rachide.' },
        },
        {
          label: 'DN / DP', subtitle: 'Limite anche passivo', tone: 'pain',
          outcome: { diagnosis: 'JMD', qualifier: 'o TED — Lombare/Toracica', detail: 'Restrizione passiva: ipotesi JMD/TED della catena anteriore o segmentale lombo-toracica.' },
        },
      ],
    },
  },
};

function multiSegmentalRotation(side: 'l' | 'r'): BreakoutSchema {
  const sideLabel = side === 'l' ? 'Sinistra' : 'Destra';
  const key = (side === 'l' ? 'multi_segmental_rotation_l' : 'multi_segmental_rotation_r') as SfmaPatternKey;
  return {
    patternKey: key,
    title: `Multi-Segmental Rotation Breakout — ${sideLabel}`,
    startNodeId: 'seated_rotation',
    nodes: {
      seated_rotation: {
        id: 'seated_rotation',
        prompt: 'Seated Active Rotation (rachide isolato)',
        hint: 'Seduto, rotazione del rachide isolata dal bacino.',
        options: [
          { label: 'FN', subtitle: 'Rachide OK', tone: 'success', next: 'prone_hip_ir' },
          {
            label: 'DN / DP', subtitle: 'Limite spinale', tone: 'pain',
            outcome: { diagnosis: 'JMD', qualifier: 'o TED — Spine rotation', detail: 'Restrizione di rotazione del rachide: JMD/TED toraco-lombare.' },
          },
        ],
      },
      prone_hip_ir: {
        id: 'prone_hip_ir',
        prompt: 'Prone Hip Internal/External Rotation',
        hint: 'In prono, valuta IR/ER d\'anca passive bilateralmente.',
        options: [
          {
            label: 'FN', subtitle: 'Anche OK', tone: 'success',
            outcome: { diagnosis: 'SMCD', qualifier: 'Lower-quarter rotation control', detail: 'Spine e anche FN isolatamente: deficit di controllo motorio nel pattern in carico.' },
          },
          {
            label: 'DN / DP', subtitle: 'Limite anche', tone: 'pain',
            outcome: { diagnosis: 'JMD', qualifier: 'o TED — Hip capsule', detail: 'Restrizione di IR/ER d\'anca: JMD/TED capsulare o muscolare.' },
          },
        ],
      },
    },
  };
}

// ---------------- Single-Leg Stance ----------------

function singleLegStance(side: 'l' | 'r'): BreakoutSchema {
  const sideLabel = side === 'l' ? 'Sinistra' : 'Destra';
  const key = (side === 'l' ? 'single_leg_stance_l' : 'single_leg_stance_r') as SfmaPatternKey;
  return {
    patternKey: key,
    title: `Single-Leg Stance Breakout — ${sideLabel}`,
    startNodeId: 'eyes_open',
    nodes: {
      eyes_open: {
        id: 'eyes_open',
        prompt: 'Single-Leg Stance · occhi aperti',
        hint: '10 secondi di tenuta monopodalica con occhi aperti.',
        options: [
          { label: 'FN', subtitle: 'Tenuta OK', tone: 'success', next: 'eyes_closed' },
          {
            label: 'DN / DP', subtitle: 'Perdita di equilibrio', tone: 'pain',
            outcome: { diagnosis: 'SMCD', qualifier: 'Visual / Postural', detail: 'Perdita con feedback visivo disponibile: deficit di controllo posturale o sensoriale somatico.' },
          },
        ],
      },
      eyes_closed: {
        id: 'eyes_closed',
        prompt: 'Single-Leg Stance · occhi chiusi',
        hint: '10 secondi di tenuta monopodalica con occhi chiusi.',
        options: [
          {
            label: 'FN', subtitle: 'Tenuta OK', tone: 'success',
            outcome: { diagnosis: 'SMCD', qualifier: 'Combined pattern', detail: 'Singoli sistemi FN: deficit emerge solo nel pattern combinato — controllo motorio integrato.' },
          },
          {
            label: 'DN / DP', subtitle: 'Perdita senza visione', tone: 'pain',
            outcome: { diagnosis: 'SMCD', qualifier: 'Vestibular / Proprioceptive', detail: 'Perdita senza feedback visivo: deficit vestibolare o propriocettivo.' },
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
      prompt: 'Supine Knees-to-Chest (holding shins)',
      hint: 'In supino, ginocchia al petto tenendo le tibie.',
      options: [
        { label: 'FN', subtitle: 'Hips/Knees OK', tone: 'success', next: 'supine_dorsiflexion' },
        {
          label: 'DN / DP', subtitle: 'Limite anche/ginocchia', tone: 'pain',
          outcome: { diagnosis: 'JMD', qualifier: 'o TED — Hips / Knees', detail: 'Restrizione di anca/ginocchio: ipotesi JMD/TED dell\'arto inferiore prossimale.' },
        },
      ],
    },
    supine_dorsiflexion: {
      id: 'supine_dorsiflexion',
      prompt: 'Passive Ankle Dorsiflexion',
      hint: 'Dorsiflessione passiva di caviglia in supino.',
      options: [
        {
          label: 'FN', subtitle: 'Caviglia OK', tone: 'success',
          outcome: { diagnosis: 'SMCD', qualifier: 'Core / Pelvis', detail: 'Mobilità integra: deficit di stabilità di core / controllo del bacino in carico.' },
        },
        {
          label: 'DN / DP', subtitle: 'Limite caviglia', tone: 'pain',
          outcome: { diagnosis: 'JMD', qualifier: 'o TED — Ankle', detail: 'Limitazione di dorsiflessione: JMD/TED della caviglia.' },
        },
      ],
    },
  },
};

// ---------------- Master dictionary ----------------

export const SFMA_BREAKOUTS: Partial<Record<SfmaPatternKey, BreakoutSchema>> = {
  cervical_flexion: cervicalFlexion,
  cervical_extension: cervicalExtension,
  cervical_rotation_l: cervicalRotation('l'),
  cervical_rotation_r: cervicalRotation('r'),

  upper_extremity_pattern_1_l: ueP1('l'),
  upper_extremity_pattern_1_r: ueP1('r'),
  upper_extremity_pattern_2_l: ueP2('l'),
  upper_extremity_pattern_2_r: ueP2('r'),

  multi_segmental_flexion: multiSegmentalFlexion,
  multi_segmental_extension: multiSegmentalExtension,
  multi_segmental_rotation_l: multiSegmentalRotation('l'),
  multi_segmental_rotation_r: multiSegmentalRotation('r'),

  single_leg_stance_l: singleLegStance('l'),
  single_leg_stance_r: singleLegStance('r'),

  arms_down_deep_squat: armsDownDeepSquat,
};

export function getBreakoutSchema(key: SfmaPatternKey): BreakoutSchema | undefined {
  return SFMA_BREAKOUTS[key];
}
