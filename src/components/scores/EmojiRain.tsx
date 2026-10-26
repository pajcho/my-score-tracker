import { useEffect, useState } from 'react';

const DROP_COUNT = 40;
const RAIN_DURATION_MS = 5200;

function createDrops(emojis: string[]) {
  return Array.from({ length: DROP_COUNT }, (_, index) => ({
    emoji: emojis[index % emojis.length],
    left: Math.random() * 100,
    delay: Math.random() * 1.6,
    duration: 2.2 + Math.random() * 1.2,
    size: 28 + Math.random() * 30,
    spin: (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 360),
  }));
}

interface EmojiRainProps {
  emojis: string[];
  caption: string;
  onDone: () => void;
}

/**
 * A few seconds of emojis falling over the whole screen. It never takes
 * pointer events, so the person being taunted can keep scoring underneath.
 */
export function EmojiRain({ emojis, caption, onDone }: EmojiRainProps) {
  // Positions are random once per rain, so they live in state, not render.
  const [drops] = useState(() => createDrops(emojis));

  useEffect(() => {
    const timer = setTimeout(onDone, RAIN_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" role="status" aria-live="polite">
      {drops.map((drop, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="absolute top-0 animate-emoji-fall motion-reduce:hidden"
          style={{
            left: `${drop.left}%`,
            fontSize: `${drop.size}px`,
            animationDuration: `${drop.duration}s`,
            animationDelay: `${drop.delay}s`,
            ['--emoji-spin' as string]: `${drop.spin}deg`,
          }}
        >
          {drop.emoji}
        </span>
      ))}
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <span className="animate-scale-in rounded-full bg-foreground px-5 py-2.5 text-center text-base font-bold text-background shadow-lg">
          {caption}
        </span>
      </div>
    </div>
  );
}
