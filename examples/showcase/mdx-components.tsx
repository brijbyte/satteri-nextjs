import type { ReactNode } from 'react';
import { Counter } from './app/Counter';

function Note({ children }: { children?: ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid #d29922',
        borderRadius: 8,
        padding: '0.75rem 1rem',
        background: 'rgba(210,153,34,0.1)',
        margin: '1rem 0',
      }}
    >
      💡 {children}
    </div>
  );
}

// Next.js `mdx-components` convention. satteri's compiled output imports this via
// `providerImportSource` (aliased by withSatteri) and merges the returned map —
// so any .mdx file can use <Counter/> / <Note/> with no per-page wiring.
export function useMDXComponents(
  components: Record<string, unknown> = {},
): Record<string, unknown> {
  return { Counter, Note, ...components };
}
