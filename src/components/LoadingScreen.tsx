
import { useEffect, useState } from 'react';

export default function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const duration = 3400;

    const animate = (time: number) => {
      if (!startTime) startTime = time;

      const elapsed = time - startTime;
      const percentage = Math.min(elapsed / duration, 1);

      // Smooth, elegant easing
      const eased = 1 - Math.pow(1 - percentage, 3);

      setProgress(Math.round(eased * 100));

      if (percentage < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    const exitTimer = window.setTimeout(() => {
      setExiting(true);
    }, 3900);

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
    }, 4800);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden bg-[#F4EFE7] transition-opacity duration-[900ms] ease-out ${
        exiting ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/* =========================
          BACKGROUND
      ========================== */}

      {/* Large burgundy ambient shape */}
      <div
        className={`pointer-events-none absolute -right-[180px] -top-[180px] h-[520px] w-[520px] rounded-full bg-[#6E2634]/[0.055] blur-[2px] transition-transform duration-[2500ms] ${
          exiting ? 'scale-125' : 'scale-100'
        }`}
      />

      {/* Champagne glow */}
      <div
        className={`pointer-events-none absolute -bottom-[220px] -left-[180px] h-[520px] w-[520px] rounded-full bg-[#B49462]/[0.10] blur-[80px] transition-all duration-[2500ms] ${
          exiting ? 'scale-125 opacity-0' : 'scale-100 opacity-100'
        }`}
      />

      {/* Editorial frame */}
      <div className="pointer-events-none absolute inset-5 border border-[#CFC2B0] sm:inset-8" />

      {/* Inner subtle frame */}
      <div className="pointer-events-none absolute inset-7 border border-[#FFFFFF]/60 sm:inset-11" />

      {/* =========================
          TOP LEFT
      ========================== */}

      <div
        className={`absolute left-10 top-10 transition-all duration-1000 sm:left-14 sm:top-14 ${
          exiting
            ? '-translate-y-5 opacity-0'
            : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="h-px w-7 bg-[#9A7650]" />

          <span className="text-[8px] uppercase tracking-[0.4em] text-[#6D6257]">
            Est. 2024
          </span>
        </div>
      </div>

      {/* =========================
          TOP RIGHT
      ========================== */}

      <div
        className={`absolute right-10 top-10 transition-all delay-100 duration-1000 sm:right-14 sm:top-14 ${
          exiting
            ? '-translate-y-5 opacity-0'
            : 'translate-y-0 opacity-100'
        }`}
      >
        <span className="text-[8px] uppercase tracking-[0.4em] text-[#6D6257]">
          Islamabad
        </span>
      </div>

      {/* =========================
          CENTER
      ========================== */}

      <div className="flex h-full items-center justify-center px-8">
        <div className="relative flex w-full max-w-md flex-col items-center text-center">

          {/* Vertical gold line */}
          <div
            className={`absolute -top-28 h-20 w-px origin-top bg-[#9A7650] transition-all duration-[1500ms] ${
              exiting
                ? 'scale-y-0 opacity-0'
                : 'scale-y-100 opacity-100'
            }`}
          />

          {/* Welcome */}
          <div
            className={`mb-7 transition-all duration-[1200ms] ${
              exiting
                ? '-translate-y-5 opacity-0'
                : 'translate-y-0 opacity-100'
            }`}
          >
            <p className="text-[9px] uppercase tracking-[0.55em] text-[#8C6A47]">
              Welcome to
            </p>
          </div>

          {/* =========================
              MONOGRAM
          ========================== */}

          <div
            className={`relative transition-all duration-[1500ms] ease-out ${
              exiting
                ? 'scale-110 -translate-y-8 opacity-0'
                : 'scale-100 translate-y-0 opacity-100'
            }`}
          >
            {/* Burgundy background circle */}
            <div className="absolute left-1/2 top-1/2 h-[145px] w-[145px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6E2634] sm:h-[165px] sm:w-[165px]" />

            {/* Champagne ring */}
            <div className="absolute left-1/2 top-1/2 h-[164px] w-[164px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#B49462]/60 sm:h-[188px] sm:w-[188px]" />

            {/* Monogram */}
            <div className="relative z-10 flex h-[150px] w-[150px] items-center justify-center font-serif text-[70px] leading-none tracking-[-0.1em] text-[#F4EFE7] sm:h-[170px] sm:w-[170px] sm:text-[80px]">
              <span>B</span>
              <span className="-ml-2">M</span>
            </div>
          </div>

          {/* =========================
              BRAND NAME
          ========================== */}

          <div
            className={`mt-8 transition-all delay-200 duration-[1200ms] ${
              exiting
                ? 'translate-y-5 opacity-0'
                : 'translate-y-0 opacity-100'
            }`}
          >
            <h1 className="font-serif text-[19px] uppercase tracking-[0.38em] text-[#302925]">
              BM Collections
            </h1>

            <div className="mx-auto mt-4 flex items-center justify-center gap-3">
              <span className="h-px w-10 bg-[#B49462]" />

              <span className="h-1 w-1 rounded-full bg-[#6E2634]" />

              <span className="h-px w-10 bg-[#B49462]" />
            </div>

            <p className="mt-4 font-serif text-[13px] italic tracking-[0.08em] text-[#75685B]">
              Where style meets identity.
            </p>
          </div>

          {/* =========================
              PROGRESS
          ========================== */}

          <div
            className={`mt-14 w-56 transition-all delay-300 duration-[1000ms] ${
              exiting
                ? 'translate-y-4 opacity-0'
                : 'translate-y-0 opacity-100'
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[8px] uppercase tracking-[0.35em] text-[#8A7A6A]">
                Preparing your experience
              </span>

              <span className="font-serif text-[11px] text-[#6E2634]">
                {progress}%
              </span>
            </div>

            <div className="relative h-[2px] w-full overflow-hidden bg-[#D8CCBC]">
              <div
                className="absolute left-0 top-0 h-full bg-[#6E2634] transition-[width] duration-100 ease-linear"
                style={{
                  width: `${progress}%`,
                }}
              />

              {/* Gold moving highlight */}
              <div
                className="absolute top-0 h-full w-8 bg-[#C7A66D] opacity-80 blur-[1px]"
                style={{
                  left: `${Math.max(progress - 8, 0)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* =========================
          BOTTOM LEFT
      ========================== */}

      <div
        className={`absolute bottom-10 left-10 transition-all duration-1000 sm:bottom-14 sm:left-14 ${
          exiting
            ? 'translate-y-5 opacity-0'
            : 'translate-y-0 opacity-100'
        }`}
      >
        <span className="text-[8px] uppercase tracking-[0.32em] text-[#85776A]">
          Fashion · Elegance · Identity
        </span>
      </div>

      {/* =========================
          BOTTOM RIGHT
      ========================== */}

      <div
        className={`absolute bottom-10 right-10 transition-all duration-1000 sm:bottom-14 sm:right-14 ${
          exiting
            ? 'translate-y-5 opacity-0'
            : 'translate-y-0 opacity-100'
        }`}
      >
        <span className="font-serif text-[13px] italic text-[#6E2634]">
          B / M
        </span>
      </div>
    </div>
  );
}

