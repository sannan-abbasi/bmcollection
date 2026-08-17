import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { Truck } from 'lucide-react';
import { FREE_DELIVERY_THRESHOLD } from '@/lib/cart';

const MESSAGES = [
  `Shop upto Rs ${FREE_DELIVERY_THRESHOLD.toLocaleString('en-PK')} and get FREE delivery`,
  'Cash on delivery across Pakistan',
  'Jewellery · Clothing · Bags · Shoes',
  'New arrivals every week',
];

/**
 * Thin gold ticker that rides above the navbar. The track holds two identical
 * copies of the message list, so shifting it by -50% loops seamlessly.
 */
export default function AnnouncementBar({ collapsed }: { collapsed: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!trackRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tween = gsap.to(trackRef.current, {
      xPercent: -50,
      duration: 28,
      ease: 'none',
      repeat: -1,
    });
    return () => {
      tween.kill();
    };
  }, []);

  return (
    <div
      className={`overflow-hidden bg-ink transition-all duration-500 ${
        collapsed ? 'max-h-0 opacity-0' : 'max-h-10 opacity-100'
      }`}
    >
      <div ref={trackRef} className="flex w-max whitespace-nowrap py-2.5">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex" aria-hidden={copy === 1}>
            {MESSAGES.map((msg, i) => (
              <span
                key={`${copy}-${i}`}
                className="flex items-center gap-3 px-8 text-[11px] uppercase tracking-[0.25em] text-cream/80"
              >
                {i === 0 ? (
                  <Truck className="h-3.5 w-3.5 text-gold" />
                ) : (
                  <span className="text-gold">◆</span>
                )}
                <span className={i === 0 ? 'text-gold-light' : undefined}>{msg}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
