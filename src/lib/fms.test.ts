import { describe, it, expect } from 'vitest';
import {
  emptyFmsScores,
  computePatterns,
  type FmsScores,
} from '@/lib/fms';

/**
 * These tests guard the clinical contract of `computePatterns`:
 *   - the lowest score between L/R wins for bilateral patterns
 *   - clearing tests force the associated pattern to 0
 *   - ankle clearing is informational only (does NOT alter scores)
 */
describe('FMS — computePatterns', () => {
  it('returns 7 patterns', () => {
    const r = computePatterns(emptyFmsScores());
    expect(r).toHaveLength(7);
  });

  it('takes the lowest of L/R for bilateral patterns', () => {
    const s: FmsScores = {
      ...emptyFmsScores(),
      hurdle_step_left: 3,
      hurdle_step_right: 1,
    };
    const r = computePatterns(s);
    const hurdle = r.find(p => p.key === 'hurdle_step');
    expect(hurdle?.final).toBe(1);
    expect(hurdle?.asymmetric).toBe(true);
  });

  it('marks bilateral non-asymmetric when L === R', () => {
    const s: FmsScores = {
      ...emptyFmsScores(),
      hurdle_step_left: 2,
      hurdle_step_right: 2,
    };
    const r = computePatterns(s);
    const hurdle = r.find(p => p.key === 'hurdle_step');
    expect(hurdle?.final).toBe(2);
    expect(hurdle?.asymmetric).toBe(false);
  });

  it('returns null when one side of a bilateral pattern is missing', () => {
    const s: FmsScores = {
      ...emptyFmsScores(),
      hurdle_step_left: 2,
      // right intentionally null
    };
    const r = computePatterns(s);
    const hurdle = r.find(p => p.key === 'hurdle_step');
    expect(hurdle?.final).toBeNull();
  });

  it('forces shoulder mobility to 0 on positive shoulder clearing', () => {
    const s: FmsScores = {
      ...emptyFmsScores(),
      shoulder_mobility_left: 3,
      shoulder_mobility_right: 3,
      clearing_shoulder_pain: true,
    };
    const r = computePatterns(s);
    const sm = r.find(p => p.key === 'shoulder_mobility');
    expect(sm?.final).toBe(0);
    expect(sm?.cleared).toBe(true);
  });

  it('forces TSPU to 0 on positive spinal extension clearing', () => {
    const s: FmsScores = {
      ...emptyFmsScores(),
      trunk_stability_pushup_score: 3,
      clearing_spinal_extension_pain: true,
    };
    const r = computePatterns(s);
    const tspu = r.find(p => p.key === 'tspu');
    expect(tspu?.final).toBe(0);
    expect(tspu?.cleared).toBe(true);
  });

  it('forces rotary stability to 0 on positive spinal flexion clearing', () => {
    const s: FmsScores = {
      ...emptyFmsScores(),
      rotary_stability_left: 2,
      rotary_stability_right: 2,
      clearing_spinal_flexion_pain: true,
    };
    const r = computePatterns(s);
    const rs = r.find(p => p.key === 'rotary_stability');
    expect(rs?.final).toBe(0);
    expect(rs?.cleared).toBe(true);
  });

  it('does NOT change scores on positive ankle clearing', () => {
    const s: FmsScores = {
      ...emptyFmsScores(),
      hurdle_step_left: 3,
      hurdle_step_right: 3,
      ankle_clearing_left_pain: true,
      ankle_clearing_right_pain: true,
    };
    const r = computePatterns(s);
    const hurdle = r.find(p => p.key === 'hurdle_step');
    // Ankle clearing is informational only.
    expect(hurdle?.final).toBe(3);
  });

  it('handles unilateral shoulder clearing per side', () => {
    const s: FmsScores = {
      ...emptyFmsScores(),
      shoulder_mobility_left: 3,
      shoulder_mobility_right: 3,
      clearing_shoulder_left_pain: true,
      // right side OK
    };
    const r = computePatterns(s);
    const sm = r.find(p => p.key === 'shoulder_mobility');
    // Left forced to 0, right stays 3 → lowest = 0
    expect(sm?.final).toBe(0);
  });
});
