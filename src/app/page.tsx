'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PinPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem('ops_authed') === 'true') {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleDigit = (d: string) => {
    if (pin.length >= 4 || loading) return;
    const next = pin + d;
    setPin(next);
    setError('');
    if (next.length === 4) submitPin(next);
  };

  const handleBackspace = () => {
    setPin((p) => p.slice(0, -1));
    setError('');
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleDigit(e.key);
      if (e.key === 'Backspace') handleBackspace();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const submitPin = async (value: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: value }),
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem('ops_authed', 'true');
        router.replace('/dashboard');
      } else {
        setError('Invalid PIN');
        setPin('');
      }
    } catch {
      setError('Connection error');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030712] px-4">

      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -top-64 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#2563EB]/5 blur-3xl" />
      </div>

      <div
        className={`
          relative w-full max-w-xs transition-all duration-700
          ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
      >
        {/* Logo block */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2563EB] shadow-xl shadow-blue-900/50 text-3xl mb-5">
            🐟
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
            Mantaray Ops
          </h1>
          <p className="text-gray-500 text-sm">Enter your PIN to access the dashboard</p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`
                w-3.5 h-3.5 rounded-full border-2 transition-all duration-200
                ${i < pin.length
                  ? 'bg-[#2563EB] border-[#2563EB] scale-110 shadow-md shadow-blue-500/30'
                  : 'border-gray-700 bg-transparent'
                }
              `}
            />
          ))}
        </div>

        {/* Error */}
        <div className="h-6 flex items-center justify-center mb-4">
          {error && (
            <p className="text-red-400 text-sm font-medium animate-fade-in">
              {error}
            </p>
          )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5">
          {digits.map((d, i) => {
            if (d === '') return <div key={i} />;
            if (d === 'back') {
              return (
                <button
                  key={i}
                  onClick={handleBackspace}
                  disabled={loading || pin.length === 0}
                  className="
                    h-14 rounded-xl bg-gray-900 border border-gray-800
                    text-gray-400 text-xl
                    hover:bg-gray-800 hover:border-gray-700 hover:text-gray-200
                    active:scale-95 transition-all duration-150
                    disabled:opacity-30 disabled:cursor-not-allowed
                  "
                >
                  ⌫
                </button>
              );
            }
            return (
              <button
                key={i}
                onClick={() => handleDigit(d)}
                disabled={loading}
                className="
                  h-14 rounded-xl bg-[#0a0f1e] border border-gray-800
                  text-gray-100 text-xl font-semibold
                  hover:bg-[#111827] hover:border-[rgba(37,99,235,0.4)] hover:text-white
                  active:scale-95 active:bg-[#1f2937]
                  transition-all duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {d}
              </button>
            );
          })}
        </div>

        {/* Loading spinner */}
        <div className="flex justify-center mt-6 h-6">
          {loading && (
            <div className="w-5 h-5 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>
    </div>
  );
}
