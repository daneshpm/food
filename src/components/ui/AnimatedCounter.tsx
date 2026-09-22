import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface AnimatedCounterProps {
  value: number;
  className?: string;
  duration?: number;
  format?: (n: number) => string;
}

// Count-up number for dashboard stats (order counts, earnings, etc). Animates
// from the previous value to the new one whenever `value` changes, rather
// than just snapping - a small, cheap touch that reads as "real dashboard"
// rather than a plain static number. One GSAP tween per mount/update, not a
// continuous animation, so it has no ongoing cost between value changes.
export default function AnimatedCounter({ value, className, duration = 0.6, format }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(0);
  const fmt = format || ((n: number) => Math.round(n).toString());

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obj = { val: prevValue.current };
    const tween = gsap.to(obj, {
      val: value,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = fmt(obj.val);
      },
    });
    prevValue.current = value;
    return () => {
      tween.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span ref={ref} className={className}>{fmt(prevValue.current)}</span>;
}
