import { describe, it, expect } from 'vitest';
import { useMDXComponents } from '../src/mdx-components-fallback.js';

describe('mdx-components fallback provider', () => {
  it('returns an empty map when no components are passed', () => {
    expect(useMDXComponents()).toEqual({});
  });

  it('passes through the app-provided components unchanged', () => {
    const components = { Counter: () => null };
    expect(useMDXComponents(components)).toBe(components);
  });
});
