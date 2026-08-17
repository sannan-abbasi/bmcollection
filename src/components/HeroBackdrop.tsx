import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Photographic hero backdrop.
 *
 * A full-bleed slideshow cross-fades between fashion shots, each drifting and
 * slowly pulling back (a Ken Burns move) so the frame is never still. Framed
 * product photographs float over it at the edges, breathing and shifting with
 * the cursor. Hidden on phones, where there is no room beside the copy.
 */

const px = (id: string, w: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

/** Full-bleed frames, in the order they appear. */
const BACKDROP = [
  { id: '1926769', alt: 'Model in a cream outfit' },
  { id: '1454171', alt: 'Gold necklace detail' },
  { id: '904350', alt: 'Designer handbag' },
  { id: '267301', alt: 'Heeled shoes' },
  { id: '7679720', alt: 'Rail of clothing' },
];

/** Used for the floating frames when the shop has no product photos yet. */
const FALLBACK_TILES = ['1721937', '1152077', '1598505', '236915'];

/** Corner anchors for the floating frames, as percentages of the hero. */
const TILE_SPOTS = [
  'left-[3%] top-[16%] w-[13vw] max-w-[190px]',
  'left-[8%] bottom-[9%] w-[10vw] max-w-[150px]',
  'right-[4%] top-[13%] w-[12vw] max-w-[175px]',
  'right-[8%] bottom-[11%] w-[11vw] max-w-[165px]',
];

const HOLD = 4.6; // seconds each backdrop image holds
const FADE = 1.6; // cross-fade length

export default function HeroBackdrop({
  productImages,
  allowMotion,
}: {
  productImages: string[];
  allowMotion: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Real product photos when we have them, curated stills otherwise.
  const tiles = (productImages.length >= 4 ? productImages : FALLBACK_TILES.map((id) => px(id, 500)))
    .slice(0, 4);

  useLayoutEffect(() => {
    if (!rootRef.current || !allowMotion) return;

    const ctx = gsap.context(() => {
      const slides = gsap.utils.toArray<HTMLElement>('.hero-slide');
      if (slides.length === 0) return;

      /* --- backdrop cross-fade with a slow pull-back on each frame --- */
      gsap.set(slides, { opacity: 0, scale: 1.16 });
      gsap.set(slides[0], { opacity: 1 });

      const show = gsap.timeline({ repeat: -1 });
      slides.forEach((slide, i) => {
        const next = slides[(i + 1) % slides.length];
        const at = i * HOLD;
        show
          .to(slide, { scale: 1.02, duration: HOLD + FADE, ease: 'none' }, at)
          .to(next, { opacity: 1, duration: FADE, ease: 'power2.inOut' }, at + HOLD - FADE)
          .to(slide, { opacity: 0, duration: FADE, ease: 'power2.inOut' }, at + HOLD - FADE)
          .set(slide, { scale: 1.16 }, at + HOLD);
      });

      /* --- floating product frames --- */
      const frames = gsap.utils.toArray<HTMLElement>('.hero-tile');
      gsap.fromTo(
        frames,
        { opacity: 0, y: 50, scale: 0.92, clipPath: 'inset(100% 0% 0% 0%)' },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1.2,
          stagger: 0.16,
          delay: 0.5,
          ease: 'power3.out',
        }
      );

      frames.forEach((frame, i) => {
        // Each drifts on its own rhythm so they never move as a block.
        gsap.to(frame, {
          y: i % 2 === 0 ? 20 : -18,
          rotation: i % 2 === 0 ? 1.4 : -1.6,
          duration: 4.5 + i * 0.7,
          delay: 1.7,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      });

      /* --- cursor parallax --- */
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const layers = [
          { el: '.hero-slides', depth: 12 },
          { el: '.hero-tiles', depth: 34 },
        ];
        const setters = layers.map(({ el, depth }) => ({
          depth,
          x: gsap.quickTo(el, 'xPercent', { duration: 0.9, ease: 'power3' }),
          y: gsap.quickTo(el, 'yPercent', { duration: 0.9, ease: 'power3' }),
        }));

        const onMove = (e: PointerEvent) => {
          const nx = e.clientX / window.innerWidth - 0.5;
          const ny = e.clientY / window.innerHeight - 0.5;
          setters.forEach(({ depth, x, y }) => {
            x((-nx * depth) / 10);
            y((-ny * depth) / 10);
          });
        };
        window.addEventListener('pointermove', onMove, { passive: true });
        return () => window.removeEventListener('pointermove', onMove);
      }
    }, rootRef);

    return () => ctx.revert();
  }, [allowMotion]);

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden">
      {/* Full-bleed slideshow */}
      <div className="hero-slides absolute inset-[-6%]">
        {BACKDROP.map((img, i) => (
          <div key={img.id} className="hero-slide absolute inset-0 will-change-transform">
            <img
              src={px(img.id, 1600)}
              alt={i === 0 ? img.alt : ''}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Enough darkening that the headline always wins, but light enough that
          the photography still reads as photography. */}
      <div className="absolute inset-0 bg-ink/55" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/25 to-ink" />

      {/* Floating product frames — pointer devices with room to spare */}
      <div className="hero-tiles absolute inset-0 hidden lg:block">
        {tiles.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className={`hero-tile absolute aspect-[3/4] overflow-hidden rounded-lg shadow-2xl shadow-ink/60 ring-1 ring-gold/25 will-change-transform ${TILE_SPOTS[i]}`}
          >
            <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-ink/25" />
          </div>
        ))}
      </div>
    </div>
  );
}
