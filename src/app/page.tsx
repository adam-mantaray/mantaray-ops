'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PinPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem('ops_authed') === 'true') {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError('');
    if (next.length === 4) {
      submitPin(next);
    }
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
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🐟</div>
          <h1 className="text-2xl font-bold text-gray-100 mb-1">Mantaray Ops</h1>
          <p className="text-gray-500 text-sm">Enter PIN to continue</p>
        </div>

        <div className="flex justify-center gap-3 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                i < pin.length
                  ? 'bg-blue-400 border-blue-400 scale-110'
                  : 'border-gray-600'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-400 text-center text-sm mb-4 animate-pulse">{error}</p>
        )}

        <div className="grid grid-cols-3 gap-3">
          {digits.map((d, i) => {
            if (d === '') return <div key={i} />;
            if (d === 'back') {
              return (
                <button
                  key={i}
                  onClick={handleBackspace}
                  disabled={loading}
                  className="h-14 rounded-xl bg-gray-800 text-gray-400 text-lg hover:bg-gray-700 active:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  &#x232B;
                </button>
              );
            }
            return (
              <button
                key={i}
                onClick={() => handleDigit(d)}
                disabled={loading}
                className="h-14 rounded-xl bg-gray-900 border border-gray-800 text-gray-100 text-xl font-medium hover:bg-gray-800 active:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {d}
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="flex justify-center mt-6">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
