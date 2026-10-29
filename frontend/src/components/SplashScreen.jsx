import { useState, useEffect, useRef } from 'react';

const STATUSES = [
  { text: 'Initializing...', duration: 800 },
  { text: 'Connecting to server...', duration: 2000 },
  { text: 'Waking up the server...', duration: 3000 },
  { text: 'Almost there...', duration: 2000 },
  { text: 'Ready!', duration: 500 },
];

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SplashScreen = ({ onComplete }) => {
  const [statusIndex, setStatusIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [dots, setDots] = useState('');
  const startedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (statusIndex >= STATUSES.length - 1) return;
    const timer = setTimeout(() => {
      setStatusIndex(prev => prev + 1);
    }, STATUSES[statusIndex].duration);
    return () => clearTimeout(timer);
  }, [statusIndex]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + Math.random() * 8;
        return next >= 92 ? 92 : next;
      });
    }, 600);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    const ping = async () => {
      while (!cancelled) {
        try {
          const res = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, {
            signal: AbortSignal.timeout(8000),
          });
          if (res.ok && !cancelled) {
            setProgress(100);
            setStatusIndex(STATUSES.length - 1);
            await new Promise(r => setTimeout(r, 600));
            if (!cancelled) {
              setFadeOut(true);
              setTimeout(onComplete, 500);
            }
            return;
          }
        } catch {
          // keep retrying until the backend is reachable
        }
        if (!cancelled) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    };

    ping();

    return () => { cancelled = true; };
  }, [onComplete]);

  const status = STATUSES[statusIndex] || STATUSES[STATUSES.length - 1];

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background:
          'radial-gradient(circle at 50% 40%, rgba(126, 92, 255, 0.15), transparent 26%), radial-gradient(circle at 50% 58%, rgba(96, 165, 250, 0.06), transparent 28%), #050b14',
      }}
    >
      <div className="flex flex-col items-center justify-center text-center px-6">
        <div className="mb-8 flex items-center justify-center">
          <div className="relative flex h-[180px] w-[180px] items-center justify-center rounded-[28px] bg-gradient-to-br from-[#f0a14c] via-[#cf89ff] to-[#7f6dff] shadow-[0_0_40px_rgba(173,122,255,0.45)]">
            <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3),transparent_35%)]" />
            <div className="relative h-[92px] w-[92px]">
              <span className="absolute left-0 top-1/2 h-[7px] w-[42px] -translate-y-1/2 rotate-[35deg] rounded-full bg-white/90" />
              <span className="absolute right-0 top-1/2 h-[7px] w-[42px] -translate-y-1/2 -rotate-[35deg] rounded-full bg-white/90" />
              <span className="absolute left-1/2 top-1/2 h-[72px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/95" />
            </div>
          </div>
        </div>

        <h1 className="mb-4 text-[5.1rem] font-black leading-[0.9] tracking-[-0.08em] text-white">
          Xorbits
        </h1>

        <p className="mb-10 text-[2.2rem] font-light text-slate-200">
          Unified Competitive Programming Hub
        </p>

        <p className="mb-5 text-[2.3rem] font-bold tracking-tight text-[#f6b548]">
          {status.text}{statusIndex < STATUSES.length - 1 ? dots : ''}
        </p>

        <div className="h-3 w-[390px] max-w-[80vw] overflow-hidden rounded-full bg-[#1a2340] shadow-inner shadow-black/30">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#f6b548] via-[#f59e0b] to-[#a855f7] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
