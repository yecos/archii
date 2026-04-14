'use client';
import { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number; // ms per character
  className?: string;
  onComplete?: () => void;
}

export function TypewriterText({ text, speed = 20, className = '', onComplete }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setDone(true);
        onComplete?.();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  if (done) return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      {displayed}
      <span className="inline-block w-[2px] h-[1em] bg-[var(--af-accent)] ml-0.5 animate-pulse align-middle" />
    </span>
  );
}
