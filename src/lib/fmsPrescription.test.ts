import { describe, it, expect } from 'vitest';
import { emptyFmsScores, type FmsScores } from '@/lib/fms';
import {
  tierForScore,
  buildFmsProfile,
  getSessionPrescription,
} from '@/lib/fmsPrescription';

describe('fmsPrescription — tierForScore', () => {
  it('maps scores to tiers with correct boundaries', () => {
    expect(tierForScore(null)).toBe('integration'); // unknown → safe default
    expect(tierForScore(0)).toBe('corrective');
    expect(tierForScore(1)).toBe('corrective');
    expect(tierForScore(2)).toBe('integration');
    expect(tierForScore(3)).toBe('performance');
  });
});

describe('fmsPrescription — buildFmsProfile', () => {
  it('flags warmupRequired for a pattern scored ≤ 1', () => {
    const scores: FmsScores = { ...emptyFmsScores(), deep_squat_score: 1 };
    const profile = buildFmsProfile(scores);
    expect(profile.patterns['deep_squat'].tier).toBe('corrective');
    expect(profile.patterns['deep_squat'].warmupRequired).toBe(true);
    expect(profile.warmupPatterns).toContain('deep_squat');
    expect(profile.isModified).toBe(false);
  });

  it('marks a Modified FMS profile', () => {
    const scores: FmsScores = {
      ...emptyFmsScores(),
      assessment_type: 'modified',
      deep_squat_score: 2,
      shoulder_mobility_left: 2, shoulder_mobility_right: 2,
      aslr_left: 2, aslr_right: 2,
    };
    expect(buildFmsProfile(scores).isModified).toBe(true);
  });
});

describe('fmsPrescription — getSessionPrescription (Full FMS)', () => {
  it('Session A worst tier is driven by Deep Squat = 1', () => {
    const profile = buildFmsProfile({ ...emptyFmsScores(), deep_squat_score: 1 });
    const presc = getSessionPrescription('A', profile);
    expect(presc.tier).toBe('corrective');
  });
});

describe('fmsPrescription — Modified FMS proxy logic', () => {
  it('Session C inherits corrective tier (and warm-up) from ASLR = 1', () => {
    const profile = buildFmsProfile({
      ...emptyFmsScores(),
      assessment_type: 'modified',
      deep_squat_score: 2,
      shoulder_mobility_left: 2, shoulder_mobility_right: 2,
      aslr_left: 1, aslr_right: 1,
    });
    const prescC = getSessionPrescription('C', profile);
    expect(prescC.tier).toBe('corrective');
    expect(prescC.warmupPatterns).toContain('aslr');
    expect(prescC.proxyApplied).toBe(true);
  });

  it('Session B never reaches performance when Deep Squat ≤ 1 (proxy cap)', () => {
    const profile = buildFmsProfile({
      ...emptyFmsScores(),
      assessment_type: 'modified',
      deep_squat_score: 1,
      shoulder_mobility_left: 3, shoulder_mobility_right: 3,
      aslr_left: 2, aslr_right: 2,
    });
    const prescB = getSessionPrescription('B', profile);
    expect(prescB.proxyApplied).toBe(true);
    expect(prescB.tier).not.toBe('performance');
  });
});
