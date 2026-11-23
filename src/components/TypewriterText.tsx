import {useEffect, useState} from 'react';

interface TypewriterTextProps {
  phrases: string[];
  typingSpeedMs?: number;
  deletingSpeedMs?: number;
  pauseMs?: number;
  className?: string;
}

export function TypewriterText({
  phrases,
  typingSpeedMs = 55,
  deletingSpeedMs = 30,
  pauseMs = 2000,
  className = '',
}: TypewriterTextProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    if (reducedMotion || phrases.length === 0) return;

    const currentPhrase = phrases[phraseIndex % phrases.length];
    let timeoutId: number;

    if (!isDeleting && displayed.length < currentPhrase.length) {
      timeoutId = window.setTimeout(() => {
        setDisplayed(currentPhrase.slice(0, displayed.length + 1));
      }, typingSpeedMs);
    } else if (!isDeleting && displayed.length === currentPhrase.length) {
      timeoutId = window.setTimeout(() => {
        setIsDeleting(true);
      }, pauseMs);
    } else if (isDeleting && displayed.length > 0) {
      timeoutId = window.setTimeout(() => {
        setDisplayed(currentPhrase.slice(0, displayed.length - 1));
      }, deletingSpeedMs);
    } else {
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    }

    return () => window.clearTimeout(timeoutId);
  }, [
    displayed,
    isDeleting,
    phraseIndex,
    phrases,
    typingSpeedMs,
    deletingSpeedMs,
    pauseMs,
    reducedMotion,
  ]);

  if (reducedMotion) {
    return <span className={className}>{phrases[0] || ''}</span>;
  }

  return (
    <span className={className} aria-live="polite">
      {displayed}
      <span
        aria-hidden="true"
        className="inline-block w-[2px] h-[0.95em] bg-amber-400 ml-1 align-middle animate-pulse"
      />
    </span>
  );
}
