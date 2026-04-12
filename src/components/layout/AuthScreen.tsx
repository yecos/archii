'use client';

import { useApp } from '@/context/AppContext';

export default function AuthScreen() {
  const { forms, setForms, doLogin, doRegister, doGoogleLogin, doMicrosoftLogin } = useApp();

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-6">
      <div className="bg-[var(--card)] border border-[var(--input)] rounded-2xl p-8 w-full max-w-[400px]">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 bg-[var(--af-accent)] rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-background fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl">ArchiFlow</span>
        </div>

        {/* Login Form */}
        {!forms.showRegister ? (<>
          <div className="text-xl font-semibold mb-1">Bienvenido de vuelta</div>
          <div className="text-sm text-[var(--muted-foreground)] mb-7">Ingresa con tu cuenta para continuar</div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Correo electrónico</label>
            <input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="tu@correo.com" value={forms.loginEmail || ''} onChange={e => setForms(p => ({ ...p, loginEmail: e.target.value }))} onKeyDown={e => e.key === 'Enter' && doLogin()} />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Contraseña</label>
            <input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" type="password" placeholder="Mínimo 6 caracteres" value={forms.loginPass || ''} onChange={e => setForms(p => ({ ...p, loginPass: e.target.value }))} />
          </div>
          <button className="w-full bg-[var(--af-accent)] text-background border-none rounded-lg py-3 text-sm font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors" onClick={doLogin}>Ingresar</button>
          <div className="flex items-center gap-3 my-4 text-xs text-[var(--af-text3)]"><div className="flex-1 h-px bg-[var(--border)]" />o<div className="flex-1 h-px bg-[var(--border)]" /></div>
          <button className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg py-2.5 text-sm font-medium text-[var(--foreground)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors flex items-center justify-center gap-2.5" onClick={doGoogleLogin}>
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continuar con Google
          </button>
          <button className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg py-2.5 text-sm font-medium text-[var(--foreground)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors flex items-center justify-center gap-2.5 mt-2" onClick={() => doMicrosoftLogin()}>
            <svg viewBox="0 0 21 21" className="w-[18px] h-[18px]"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
            Continuar con Microsoft
          </button>
          <div className="text-center mt-5 text-sm text-[var(--af-text3)]">¿No tienes cuenta? <a className="text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => setForms(p => ({ ...p, showRegister: true }))}>Regístrate</a></div>
        </>) : (<>
          {/* Register Form */}
          <div className="text-xl font-semibold mb-1">Crear cuenta</div>
          <div className="text-sm text-[var(--muted-foreground)] mb-7">Únete a tu equipo en ArchiFlow</div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Nombre completo</label>
            <input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" placeholder="Tu nombre" value={forms.regName || ''} onChange={e => setForms(p => ({ ...p, regName: e.target.value }))} />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Correo electrónico</label>
            <input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" type="email" placeholder="tu@correo.com" value={forms.regEmail || ''} onChange={e => setForms(p => ({ ...p, regEmail: e.target.value }))} />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Contraseña</label>
            <input className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--af-accent)]" type="password" placeholder="Mínimo 6 caracteres" value={forms.regPass || ''} onChange={e => setForms(p => ({ ...p, regPass: e.target.value }))} onKeyDown={e => e.key === 'Enter' && doRegister()} />
          </div>
          <button className="w-full bg-[var(--af-accent)] text-background border-none rounded-lg py-3 text-sm font-semibold cursor-pointer hover:bg-[var(--af-accent2)] transition-colors" onClick={doRegister}>Crear cuenta</button>
          <div className="flex items-center gap-3 my-4 text-xs text-[var(--af-text3)]"><div className="flex-1 h-px bg-[var(--border)]" />o<div className="flex-1 h-px bg-[var(--border)]" /></div>
          <button className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg py-2.5 text-sm font-medium text-[var(--foreground)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors flex items-center justify-center gap-2.5" onClick={doGoogleLogin}>
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Registrarse con Google
          </button>
          <button className="w-full bg-[var(--af-bg3)] border border-[var(--input)] rounded-lg py-2.5 text-sm font-medium text-[var(--foreground)] cursor-pointer hover:bg-[var(--af-bg4)] transition-colors flex items-center justify-center gap-2.5 mt-2" onClick={() => doMicrosoftLogin()}>
            <svg viewBox="0 0 21 21" className="w-[18px] h-[18px]"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
            Registrarse con Microsoft
          </button>
          <div className="text-center mt-5 text-sm text-[var(--af-text3)]">¿Ya tienes cuenta? <a className="text-[var(--af-accent)] cursor-pointer hover:underline" onClick={() => setForms(p => ({ ...p, showRegister: false }))}>Ingresar</a></div>
        </>)}
      </div>
    </div>
  );
}
