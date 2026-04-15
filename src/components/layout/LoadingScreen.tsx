'use client';

export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-dvh bg-background bg-[radial-gradient(ellipse_at_center,var(--skeuo-raised),var(--background))]" style={{ height: '100dvh' }}>
      <div className="flex flex-col items-center gap-5">
        {/* Logo panel with skeuo styling */}
        <div className="w-14 h-14 skeuo-panel rounded-xl flex items-center justify-center shadow-[var(--skeuo-shadow-raised)] animate-skeuoPulse">
          <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-[var(--af-accent)] fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>

        {/* Recessed spinner well with inner raised spinning element */}
        <div className="w-10 h-10 bg-[var(--skeuo-inset)] rounded-full shadow-[var(--skeuo-shadow-inset)] flex items-center justify-center">
          <div className="w-5 h-5 bg-[var(--skeuo-raised)] rounded-full shadow-[var(--skeuo-shadow-raised-sm)] animate-spin" />
        </div>

        {/* Title with glow */}
        <div style={{ fontFamily: "'DM Serif Display', serif", textShadow: '0 0 20px var(--skeuo-glow)' }} className="text-xl text-[var(--af-accent)]">ArchiFlow</div>

        {/* Premium sub-text */}
        <div className="text-xs text-[var(--af-text3)] tracking-widest uppercase">Premium</div>
      </div>
    </div>
  );
}
