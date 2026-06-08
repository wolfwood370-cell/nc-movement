import { describe, it, expect } from 'vitest';
import { emptyFmsScores } from '@/lib/fms';
import { buildReferralData } from '@/lib/medicalReferral';

describe('medicalReferral — FMS pain findings', () => {
  it('reports a pattern scored 0 (pain) as an FMS finding', () => {
    const data = buildReferralData({ ...emptyFmsScores(), deep_squat_score: 0 }, null, null);
    expect(data.hasFindings).toBe(true);
    expect(data.fms.some(f => f.pattern.includes('Deep Squat'))).toBe(true);
  });

  it('does NOT double-count a clearing-forced zero as FMS pain', () => {
    // Positive shoulder clearing forces Shoulder Mobility → 0 (cleared).
    const data = buildReferralData(
      { ...emptyFmsScores(), shoulder_mobility_left: 3, shoulder_mobility_right: 3, clearing_shoulder_pain: true },
      null, null,
    );
    // It must appear ONCE, in the clearing block — not also as "Punteggio 0 (dolore)".
    expect(data.fms.some(f => f.pattern.toLowerCase().includes('shoulder'))).toBe(false);
    expect(data.clearing.some(c => c.test === 'Shoulder Clearing')).toBe(true);
  });
});

describe('medicalReferral — YBT reach #1 laterality (LQ vs UQ)', () => {
  it('labels an LQ asymmetry as anterior / lower limb', () => {
    const data = buildReferralData(null, { anterior_left_cm: 10, anterior_right_cm: 16 }, null);
    expect(data.ybt).toHaveLength(1);
    expect(data.ybt[0].description).toContain('reach anteriore');
    expect(data.ybt[0].description).toContain("dell'arto inferiore");
  });

  it('labels a UQ asymmetry as medial / upper limb', () => {
    const data = buildReferralData(
      null,
      { test_type: 'UQ', anterior_left_cm: 10, anterior_right_cm: 16 },
      null,
    );
    expect(data.ybt).toHaveLength(1);
    expect(data.ybt[0].description).toContain('reach mediale');
    expect(data.ybt[0].description).toContain("dell'arto superiore");
  });

  it('ignores a sub-threshold asymmetry', () => {
    const data = buildReferralData(null, { anterior_left_cm: 10, anterior_right_cm: 12 }, null);
    expect(data.ybt).toHaveLength(0);
  });
});
