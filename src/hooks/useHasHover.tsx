import { useEffect, useState } from 'react';

/**
 * True on hover-capable, fine-pointer devices (a desktop mouse); false on
 * touch-only devices. Drives hover-vs-tap behaviour for chart hints —
 * hover to reveal on desktop, tap to reveal on phones.
 *
 * Defaults to false so the touch path (tap-to-open, which always works) is
 * the safe fallback before the media query resolves.
 */
export function useHasHover() {
  const [hasHover, setHasHover] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setHasHover(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return hasHover;
}
