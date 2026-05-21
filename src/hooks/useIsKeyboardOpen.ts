import * as React from 'react';

/**
 * Returns true while a software keyboard (or any equivalent input
 * accessory) is occupying screen real estate.
 *
 * Two parallel signals are OR'd together because each one fails for
 * different reasons on different browsers:
 *
 *   1. `visualViewport.height` < `window.innerHeight` by more than
 *      THRESHOLD_PX (150). Works on iOS Safari, but iOS 17+ with the
 *      `interactive-widget=resizes-content` viewport directive makes
 *      the two heights match and this signal stops firing.
 *
 *   2. `document.activeElement` is a text-entry control (input,
 *      textarea, or contenteditable). Reliable proxy: the keyboard is
 *      up when a text field has focus.
 *
 * Returns `false` on SSR. Safe default — keep the UI as if the
 * keyboard is closed when we can't tell.
 */
export function useIsKeyboardOpen(): boolean {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const THRESHOLD_PX = 150;

    const isTextEntry = (el: Element | null): boolean => {
      if (!el) return false;
      const tag = el.tagName;
      if (tag === 'TEXTAREA') return true;
      if (tag === 'INPUT') {
        const type = (el as HTMLInputElement).type;
        const skip = new Set([
          'button',
          'submit',
          'reset',
          'checkbox',
          'radio',
          'range',
          'file',
          'color',
        ]);
        return !skip.has(type);
      }
      return (el as HTMLElement).isContentEditable === true;
    };

    const compute = () => {
      const vv = window.visualViewport;
      const viewportSays = vv ? window.innerHeight - vv.height > THRESHOLD_PX : false;
      const focusSays = isTextEntry(document.activeElement);
      setOpen(viewportSays || focusSays);
    };

    compute();
    window.visualViewport?.addEventListener('resize', compute);
    window.visualViewport?.addEventListener('scroll', compute);
    document.addEventListener('focusin', compute);
    document.addEventListener('focusout', compute);
    return () => {
      window.visualViewport?.removeEventListener('resize', compute);
      window.visualViewport?.removeEventListener('scroll', compute);
      document.removeEventListener('focusin', compute);
      document.removeEventListener('focusout', compute);
    };
  }, []);

  return open;
}
