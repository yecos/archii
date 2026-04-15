
interface WelcomeHeaderProps {
  userName: string;
  initials: string;
}

export default function WelcomeHeader({ userName, initials }: WelcomeHeaderProps) {
  return (
    <div className="bg-gradient-to-br from-[var(--card)] to-[var(--af-bg3)] border border-[var(--border)] rounded-xl p-5 md:p-6 relative overflow-hidden">
      <div className="absolute -right-10 -top-10 w-48 h-48 border-[40px] border-[var(--af-accent)]/5 rounded-full" />
      <div className="relative">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold border-2"
            style={{ borderColor: 'var(--af-accent)' }}
          >
            {initials}
          </div>
          <div>
            <h1
              className="text-xl md:text-2xl font-semibold"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              Bienvenido, {userName}
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Portal del Cliente — Seguimiento de proyectos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
