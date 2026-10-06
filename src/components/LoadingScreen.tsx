import { useEffect, useState } from 'react';

export default function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    // Total loading animation time
    const duration = 3400;

    const animate = (time: number) => {
      if (!startTime) startTime = time;

      const elapsed = time - startTime;
      const percentage = Math.min(elapsed / duration, 1);

      // Smooth luxury-style easing
      const eased = 1 - Math.pow(1 - percentage, 3);

      setProgress(Math.round(eased * 100));

      if (percentage < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    // Start exit animation
    const exitTimer = window.setTimeout(() => {
      setExiting(true);
    }, 3900);

    // Completely remove loader
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
        exiting
          ? 'pointer-events-none opacity-0'
          : 'opacity-100'
      }`}
    >
      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      {/* Burgundy ambient circle */}
      <div
        className={`pointer-events-none absolute -right-[180px] -top-[180px] h-[520px] w-[520px] rounded-full bg-[#6E2634]/[0.055] blur-[2px] transition-transform duration-[2500ms] ${
          exiting ? 'scale-125' : 'scale-100'
        }`}
      />

      {/* Champagne glow */}
      <div
        className={`pointer-events-none absolute -bottom-[220px] -left-[180px] h-[520px] w-[520px] rounded-full bg-[#B49462]/[0.10] blur-[80px] transition-all duration-[2500ms] ${
          exiting
            ? 'scale-125 opacity-0'
            : 'scale-100 opacity-100'
        }`}
      />

      {/* Very subtle center glow */}
      <div
        className={`pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FFFFFF]/30 blur-[100px] transition-opacity duration-[2000ms] ${
          exiting ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* =====================================================
          EDITORIAL FRAME
      ====================================================== */}

      <div className="pointer-events-none absolute inset-5 border border-[#CFC2B0] sm:inset-8" />

      <div className="pointer-events-none absolute inset-7 border border-[#FFFFFF]/60 sm:inset-11" />

      {/* =====================================================
          TOP LEFT
      ====================================================== */}

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

      {/* =====================================================
          TOP RIGHT
      ====================================================== */}

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

      {/* =====================================================
          CENTER
      ====================================================== */}

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

          {/* =================================================
              WELCOME
          ================================================= */}

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

          {/* =================================================
              IMAGE MONOGRAM
          ================================================= */}

          <div
            className={`relative transition-all duration-[1500ms] ease-out ${
              exiting
                ? 'scale-110 -translate-y-8 opacity-0'
                : 'scale-100 translate-y-0 opacity-100'
            }`}
          >
            {/* Outer champagne ring */}
            <div className="absolute left-1/2 top-1/2 h-[188px] w-[188px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#B49462]/80 sm:h-[214px] sm:w-[214px]" />

            {/* Inner fine ring */}
            <div className="absolute left-1/2 top-1/2 h-[174px] w-[174px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#FFFFFF]/70 sm:h-[198px] sm:w-[198px]" />

            {/* Image container */}
            <div className="relative h-[158px] w-[158px] overflow-hidden rounded-full bg-[#6E2634] shadow-[0_15px_45px_rgba(48,41,37,0.15)] sm:h-[180px] sm:w-[180px]">

              {/* Fashion image */}
              <img
                src="/images/loading-fashion.jpg"
                alt="BM Collections"
                className="h-full w-full object-cover object-center"
              />

              {/* Burgundy luxury tint */}
              <div className="absolute inset-0 bg-[#6E2634]/15 mix-blend-multiply" />

              {/* Warm highlight */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#6E2634]/30 via-transparent to-[#F4EFE7]/10" />

              {/* Soft cinematic shine */}
              <div
                className={`absolute inset-y-0 -left-full w-1/2 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-[1800ms] ${
                  progress > 15 ? 'left-[150%]' : ''
                }`}
              />
            </div>

            {/* Small BM badge */}
            <div className="absolute -bottom-2 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-[#B49462] bg-[#F4EFE7] shadow-sm">
              <span className="font-serif text-[9px] tracking-[-0.08em] text-[#6E2634]">
                BM
              </span>
            </div>
          </div>

          {/* =================================================
              BRAND NAME
          ================================================= */}

          <div
            className={`mt-10 transition-all delay-200 duration-[1200ms] ${
              exiting
                ? 'translate-y-5 opacity-0'
                : 'translate-y-0 opacity-100'
            }`}
          >
            <h1 className="font-serif text-[19px] uppercase tracking-[0.38em] text-[#302925] sm:text-[21px]">
              BM Collections
            </h1>

            {/* Decorative divider */}
            <div className="mx-auto mt-4 flex items-center justify-center gap-3">
              <span className="h-px w-10 bg-[#B49462]" />

              <span className="h-1 w-1 rounded-full bg-[#6E2634]" />

              <span className="h-px w-10 bg-[#B49462]" />
            </div>

            <p className="mt-4 font-serif text-[13px] italic tracking-[0.08em] text-[#75685B]">
              Where style meets identity.
            </p>
          </div>

          {/* =================================================
              PROGRESS
          ================================================= */}

          <div
            className={`mt-14 w-56 transition-all delay-300 duration-[1000ms] sm:w-64 ${
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

            {/* Progress track */}
            <div className="relative h-[2px] w-full overflow-hidden bg-[#D8CCBC]">
              {/* Burgundy progress */}
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

      {/* =====================================================
          BOTTOM LEFT
      ====================================================== */}

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

      {/* =====================================================
          BOTTOM RIGHT
      ====================================================== */}

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

      {/* =====================================================
          CORNER DETAILS
      ====================================================== */}

      <div className="pointer-events-none absolute left-5 top-5 h-5 w-5 border-l border-t border-[#9A7650]/50 sm:left-8 sm:top-8" />

      <div className="pointer-events-none absolute right-5 top-5 h-5 w-5 border-r border-t border-[#9A7650]/50 sm:right-8 sm:top-8" />

      <div className="pointer-events-none absolute bottom-5 left-5 h-5 w-5 border-b border-l border-[#9A7650]/50 sm:bottom-8 sm:left-8" />

      <div className="pointer-events-none absolute bottom-5 right-5 h-5 w-5 border-b border-r border-[#9A7650]/50 sm:bottom-8 sm:right-8" />
    </div>
  );
}