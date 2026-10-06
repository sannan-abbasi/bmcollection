import { useEffect, useState } from 'react';

export default function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => {
      setExiting(true);
    }, 1800);

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
    }, 2300);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-cream transition-opacity duration-500 ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex w-full max-w-sm flex-col items-center px-6 text-center">
        {/* Brand */}
        <div
          className={`transition-all duration-700 ${
            exiting
              ? 'translate-y-[-15px] opacity-0'
              : 'translate-y-0 opacity-100'
          }`}
        >
          <h1 className="font-serif text-4xl tracking-[0.18em] text-ink sm:text-5xl">
            BM
          </h1>

          <div className="mt-1 text-[10px] uppercase tracking-[0.5em] text-gold">
            Collection
          </div>
        </div>

        {/* Welcome Text */}
        <p
          className={`mt-10 text-[11px] uppercase tracking-[0.35em] text-stone-500 transition-all duration-700 delay-200 ${
            exiting
              ? 'translate-y-[-10px] opacity-0'
              : 'translate-y-0 opacity-100'
          }`}
        >
          Welcome to BM-Collection
        </p>

        {/* Loading Line */}
        <div className="mt-6 h-px w-40 overflow-hidden bg-stone-200">
          <div
            className={`h-full bg-gold transition-all duration-[1600ms] ease-out ${
              exiting ? 'w-full' : 'w-0'
            }`}
          />
        </div>
      </div>
    </div>
  );
}