import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Team',
  description: 'Espacio simplificado de Archii para la gestión diaria del equipo.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return children;
}
