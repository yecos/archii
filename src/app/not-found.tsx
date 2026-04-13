export default function NotFound() {
  return (
    <div
      className="animate-fadeIn"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1.5rem',
        background: 'var(--background)',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: '420px',
          width: '100%',
        }}
      >
        {/* Logo */}
        <h1
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: '1.75rem',
            color: 'var(--af-accent)',
            marginBottom: '0.5rem',
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
          }}
        >
          ArchiFlow
        </h1>

        {/* Divider */}
        <div
          style={{
            width: '40px',
            height: '2px',
            background: 'var(--border)',
            marginBottom: '2rem',
            borderRadius: '1px',
          }}
        />

        {/* 404 Display */}
        <div
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 'clamp(4rem, 12vw, 7rem)',
            fontWeight: 400,
            lineHeight: 1,
            marginBottom: '0.25rem',
            background: 'linear-gradient(135deg, var(--af-accent), var(--af-accent2))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          404
        </div>

        {/* Subtle decorative line under 404 */}
        <div
          style={{
            width: '32px',
            height: '2px',
            background: 'linear-gradient(90deg, var(--af-accent), transparent)',
            borderRadius: '1px',
            marginBottom: '1.75rem',
          }}
        />

        {/* Heading */}
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'var(--foreground)',
            marginBottom: '0.5rem',
            lineHeight: 1.3,
          }}
        >
          Página no encontrada
        </h2>

        {/* Description */}
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--muted-foreground)',
            marginBottom: '2rem',
            lineHeight: 1.6,
            maxWidth: '320px',
          }}
        >
          Lo sentimos, la página que buscas no existe o fue movida.
        </p>

        {/* Home Button */}
        <a
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.75rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#fff',
            background: 'var(--af-accent)',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1,
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--af-accent2)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--af-accent)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.97)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
        >
          {/* Arrow left icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
