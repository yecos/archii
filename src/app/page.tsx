'use client';
import dynamic from 'next/dynamic';

const Home = dynamic(() => import('./HomeContent'), { ssr: false });

export default function Page() {
  return <Home />;
}
