import { motion } from 'framer-motion';

/** Horizontal LVR gauge with the thresholds that actually change outcomes marked. */
export default function LvrMeter({ lvr, schemeEligible, compact }: { lvr: number; schemeEligible?: boolean; compact?: boolean }) {
  const clamped = Math.min(100, Math.max(0, lvr));
  const tone = lvr <= 80 ? 'bg-go' : lvr <= 90 ? 'bg-amber' : lvr <= 95 ? 'bg-[#d4671f]' : 'bg-rose';
  const msg = !lvr
    ? 'Add a price and loan to see your LVR.'
    : lvr <= 60
      ? 'Excellent. The sharpest rates are often reserved for 60% and under.'
      : lvr <= 80
        ? 'Under 80%, so no Lenders Mortgage Insurance needed.'
        : lvr <= 95
          ? schemeEligible
            ? 'Above 80%, but the 5% Deposit Scheme could remove LMI for you.'
            : 'Above 80%, most lenders will add Lenders Mortgage Insurance.'
          : 'Above 95%, very few lenders go this high.';
  return (
    <div>
      <div className="flex items-baseline justify-between">
        {!compact && <span className="text-sm font-semibold text-ink-soft">Loan-to-value ratio</span>}
        <span className={`font-extrabold tabular-nums ${compact ? 'text-3xl' : 'text-2xl'}`}>{lvr ? `${lvr.toFixed(1)}%` : '—'}</span>
      </div>
      <div className="relative mt-2 h-3 rounded-full bg-black/8">
        <motion.div className={`h-3 rounded-full ${tone}`} initial={false} animate={{ width: `${clamped}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
        {(compact ? [80, 95] : [60, 80, 90, 95]).map(m => (
          <span key={m} className="absolute top-[-3px] h-[18px] w-0.5 bg-ink/30" style={{ left: `${m}%` }} aria-hidden>
            <span className="absolute top-5 -translate-x-1/2 text-[10px] font-semibold text-muted">{m}</span>
          </span>
        ))}
      </div>
      <p className={`mt-6 text-ink-soft ${compact ? 'text-xs' : 'text-sm'}`} aria-live="polite">{msg}</p>
    </div>
  );
}
