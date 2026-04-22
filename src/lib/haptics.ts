// Native vibration feedback for "eyes-free" assessment on the gym floor.
// Designed so the practitioner can confirm a tap without looking at the screen.

export type HapticType = 'success' | 'alert' | 'neutral';

interface NavigatorWithVibrate extends Navigator {
  vibrate?: (pattern: number | number[]) => boolean;
}

const PATTERNS: Record<HapticType, number | number[]> = {
  success: 50,            // sharp single pulse — score 3 / FN
  alert: [100, 50, 100],  // double pulse warning — score 0 / DP / FP
  neutral: 20,            // light tap — score 1, 2 / DN
};

/**
 * Trigger a short haptic vibration. Silently no-ops on unsupported devices
 * (most desktops, iOS Safari) — never throws.
 */
export function triggerHapticFeedback(type: HapticType): void {
  if (typeof window === 'undefined') return;
  const nav = window.navigator as NavigatorWithVibrate;
  if (typeof nav.vibrate !== 'function') return;
  try {
    nav.vibrate(PATTERNS[type]);
  } catch {
    // ignore — some browsers throw if vibration is gated by user activation
  }
}
