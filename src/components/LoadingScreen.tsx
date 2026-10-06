
import { useEffect, useState } from 'react';

export default function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const progressTimer = window.setTimeout(() => {
      setProgress(100);
    }, 100);

    const exitTimer = window.setTimeout(() => {
      setExiting(true);
    }, 2200);

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
    }, 2900);

    return () => {
      window.clearTimeout(progressTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden bg-[#F3EFE8] transition-all duration-700 ${
        exiting ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/* Subtle editorial border */}
      <div className="pointer-events-none absolute inset-5 border border-[#D8D0C3]/60 sm:inset-8" />

      {/* Top branding */}
      <div
        className={`absolute left-8 top-8 transition-all duration-1000 sm:left-12 sm:top-10 ${
          exiting
            ? '-translate-y-4 opacity-0'
            : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="text-[9px] uppercase tracking-[0.45em] text-[#6D6255]">
          Est. 2024
        </div>
      </div>

      {/* Top right */}
      <div
        className={`absolute right-8 top-8 transition-all delay-100 duration-1000 sm:right-12 sm:top-10 ${
          exiting
            ? '-translate-y-4 opacity-0'
            : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="text-[9px] uppercase tracking-[0.35em] text-[#6D6255]">
          Islamabad
        </div>
      </div>

      {/* Main content */}
      <div className="flex h-full items-center justify-center px-8">
        <div className="relative flex w-full max-w-md flex-col items-center text-center">

          {/* Decorative vertical line */}
          <div
            className={`absolute -top-32 h-20 w-px bg-[#B49A72]/60 transition-all duration-1000 ${
              exiting ? 'scale-y-0 opacity-0' : 'scale-y-100 opacity-100'
            }`}
          />

          {/* Monogram */}
          <div
            className={`relative transition-all duration-[1200ms] ease-out ${
              exiting
                ? 'scale-110 -translate-y-8 opacity-0'
                : 'scale-100 translate-y-0 opacity-100'
            }`}
          >
            {/* Large background B */}
            <span className="absolute -left-12 -top-10 select-none font-serif text-[150px] leading-none text-[#E7E0D5] sm:text-[180px]">
              B
            </span>

            {/* Main BM */}
            <div className="relative z-10 flex items-center font-serif text-[72px] leading-none tracking-[-0.08em] text-[#2D2925] sm:text-[88px]">
              <span>B</span>
              <span className="-ml-2">M</span>
            </div>
          </div>

          {/* Brand name */}
          <div
            className={`mt-7 transition-all delay-200 duration-1000 ${
              exiting
                ? 'translate-y-4 opacity-0'
                : 'translate-y-0 opacity-100'
            }`}
          >
            <h1 className="font-serif text-[17px] uppercase tracking-[0.42em] text-[#2D2925]">
              BM Collections
            </h1>

            <div className="mx-auto mt-3 h-px w-8 bg-[#B49A72]" />

            <p className="mt-3 text-[9px] uppercase tracking-[0.5em] text-[#8A7D6D]">
              Curated for you
            </p>
          </div>

          {/* Progress */}
          <div
            className={`mt-14 w-52 transition-all delay-300 duration-1000 ${
              exiting
                ? 'translate-y-3 opacity-0'
                : 'translate-y-0 opacity-100'
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[8px] uppercase tracking-[0.3em] text-[#8A7D6D]">
                Loading
              </span>

              <span className="font-serif text-[11px] text-[#6D6255]">
                {progress}%
              </span>
            </div>

            <div className="relative h-[1px] w-full overflow-hidden bg-[#D8D0C3]">
              <div
                className="absolute left-0 top-0 h-full bg-[#8D7654] transition-all duration-[2000ms] ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom left */}
      <div
        className={`absolute bottom-8 left-8 transition-all delay-200 duration-1000 sm:bottom-10 sm:left-12 ${
          exiting ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <span className="text-[8px] uppercase tracking-[0.35em] text-[#8A7D6D]">
          Fashion • Elegance • Identity
        </span>
      </div>

      {/* Bottom right */}
      <div
        className={`absolute bottom-8 right-8 transition-all delay-300 duration-1000 sm:bottom-10 sm:right-12 ${
          exiting ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <span className="font-serif text-[12px] italic text-[#8D7654]">
          BM
        </span>
      </div>

      {/* Soft ambient glow */}
      <div
        className={`pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D8C8AF]/10 blur-[100px] transition-opacity duration-1000 ${
          exiting ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </div>
  );
}

