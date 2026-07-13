/**
 * Fire a short haptic tick to confirm a tap.
 *
 * Android Chrome supports navigator.vibrate; iOS Safari has no web
 * vibration API, so there this is a silent no-op and the visual score-pop
 * animation carries the feedback instead.
 */
export function hapticTick(): void {
  if (typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(10);
  } catch {
    // Some browsers throw when vibration is blocked by permissions policy.
  }
}
