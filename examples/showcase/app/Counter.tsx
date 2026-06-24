'use client';
import { useState } from 'react';

// Interactive component supplied to MDX via `components` — proves the compiled
// output resolves custom JSX from the provided component map, not the loader.
export function Counter({ initial = 0 }: { initial?: number }) {
  const [n, setN] = useState(initial);
  return (
    <button
      onClick={() => setN((v) => v + 1)}
      style={{
        padding: '0.4rem 0.9rem',
        borderRadius: 8,
        border: '1px solid #30363d',
        background: '#21262d',
        color: '#e6edf3',
        cursor: 'pointer',
        font: 'inherit',
      }}
    >
      count: {n} (click +1)
    </button>
  );
}
