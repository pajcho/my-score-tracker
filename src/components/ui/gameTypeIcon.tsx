import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PoolBallIconProps {
  numberLabel: '8' | '9' | '10';
  variant: 'solid-black' | 'striped-yellow' | 'striped-blue';
  className?: string;
}

function PoolBallIcon({ numberLabel, variant, className }: PoolBallIconProps) {
  if (variant === 'solid-black') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('shrink-0', className)}>
        <circle cx="12" cy="12" r="10" fill="#020617" stroke="#1f2937" strokeWidth="1.4" />
        <circle cx="12" cy="12" r="4.4" fill="#f8fafc" />
        <text x="12" y="13.9" textAnchor="middle" fontSize="5.4" fontWeight="700" fill="#111827">
          {numberLabel}
        </text>
      </svg>
    );
  }

  const stripeColor = variant === 'striped-yellow' ? '#facc15' : '#3b82f6';

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('shrink-0', className)}>
      <circle cx="12" cy="12" r="10" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.4" />
      <rect x="2.6" y="8.1" width="18.8" height="7.8" rx="3.9" fill={stripeColor} />
      <circle cx="12" cy="12" r="4.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
      <text x="12" y="13.9" textAnchor="middle" fontSize={numberLabel === '10' ? '4.8' : '5.4'} fontWeight="700" fill="#111827">
        {numberLabel}
      </text>
    </svg>
  );
}

interface GameTypeIconProps {
  gameType: string;
  className?: string;
}

function PoolTableIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('shrink-0', className)}>
      <g transform="rotate(-28 12 12)">
        <rect x="3.5" y="14.6" width="15.2" height="1.35" rx="0.65" fill="#f5d0a5" />
        <rect x="16.7" y="14.6" width="3.2" height="1.35" rx="0.65" fill="#334155" />
        <rect x="6.4" y="14.6" width="1.3" height="1.35" fill="#0f172a" />
      </g>

      <circle cx="10.1" cy="7.7" r="3.1" fill="#facc15" stroke="#f59e0b" strokeWidth="0.9" />
      <circle cx="14.2" cy="7.2" r="3.1" fill="#ef4444" stroke="#dc2626" strokeWidth="0.9" />
      <circle cx="12.3" cy="11.2" r="3.1" fill="#3b82f6" stroke="#2563eb" strokeWidth="0.9" />

      <circle cx="9.3" cy="6.8" r="0.8" fill="#ffffff" opacity="0.55" />
      <circle cx="13.4" cy="6.3" r="0.8" fill="#ffffff" opacity="0.55" />
      <circle cx="11.4" cy="10.3" r="0.8" fill="#ffffff" opacity="0.55" />
    </svg>
  );
}

function PingPongIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('shrink-0', className)}>
      <circle cx="17.4" cy="6.4" r="2.6" fill="#f97316" stroke="#fb923c" strokeWidth="0.9" />
      <ellipse cx="10.2" cy="12.2" rx="4.8" ry="4.2" fill="#ef4444" stroke="#f87171" strokeWidth="1.1" />
      <rect
        x="11.2"
        y="15.3"
        width="2.3"
        height="5.8"
        rx="1.15"
        transform="rotate(-28 12.35 18.2)"
        fill="#d97706"
        stroke="#f59e0b"
        strokeWidth="0.8"
      />
    </svg>
  );
}

export function GameTypeIcon({ gameType, className }: GameTypeIconProps) {
  if (gameType === 'Pool') {
    return <PoolTableIcon className={className} />;
  }

  if (gameType === 'Ping Pong') {
    return <PingPongIcon className={className} />;
  }

  return <Trophy className={className} aria-hidden="true" />;
}

interface PoolTypeIconProps {
  poolType: string;
  className?: string;
}

export function PoolTypeIcon({ poolType, className }: PoolTypeIconProps) {
  if (poolType === '8-ball') {
    return <PoolBallIcon numberLabel="8" variant="solid-black" className={className} />;
  }

  if (poolType === '9-ball') {
    return <PoolBallIcon numberLabel="9" variant="striped-yellow" className={className} />;
  }

  if (poolType === '10-ball') {
    return <PoolBallIcon numberLabel="10" variant="striped-blue" className={className} />;
  }

  return <PoolTableIcon className={className} />;
}
