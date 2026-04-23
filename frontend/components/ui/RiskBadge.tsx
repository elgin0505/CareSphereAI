'use client';

interface RiskBadgeProps {
  level: 'low' | 'medium' | 'high';
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

const CONFIG = {
  low:    { bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-700',  dot: 'bg-green-500',  label: 'LOW' },
  medium: { bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-700',  dot: 'bg-amber-500',  label: 'MED' },
  high:   { bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-700',    dot: 'bg-red-500',    label: 'HIGH' },
};

const SIZE = {
  sm: { wrap: 'px-2 py-0.5 gap-1',   dot: 'w-1.5 h-1.5', label: 'text-[10px]', score: 'text-[10px]' },
  md: { wrap: 'px-2.5 py-1 gap-1.5', dot: 'w-2 h-2',     label: 'text-xs',     score: 'text-xs' },
  lg: { wrap: 'px-3 py-1.5 gap-2',   dot: 'w-2.5 h-2.5', label: 'text-sm',     score: 'text-sm' },
};

export default function RiskBadge({ level, score, size = 'md' }: RiskBadgeProps) {
  const c = CONFIG[level];
  const s = SIZE[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${c.bg} ${c.border} ${c.text} ${s.wrap}`}
    >
      <span className={`rounded-full shrink-0 ${c.dot} ${s.dot} ${level === 'high' ? 'animate-pulse' : ''}`} />
      <span className={s.label}>{c.label} RISK</span>
      {score !== undefined && (
        <span className={`opacity-60 ${s.score}`}>{score}</span>
      )}
    </span>
  );
}
