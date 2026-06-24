import type { NextConfig } from 'next';
import type { CompileOptions } from './loader.js';

export interface WithSatteriOptions extends CompileOptions {
  /** File extensions to treat as MDX. Defaults to /\.mdx?$/. */
  extension?: RegExp;
}

/**
 * Wrap a Next.js config so `.md`/`.mdx` files are compiled with satteri
 * (Rust-native parse/compile) instead of `@mdx-js/loader`.
 *
 * Mirrors the `@next/mdx` `nextMdx()` ergonomics.
 *
 * TODO(milestone 2): wire up webpack rule + Turbopack rule pointing at ./loader,
 * extend pageExtensions, and inject the mdx-components provider.
 */
export default function withSatteri(options: WithSatteriOptions = {}) {
  const extension = options.extension ?? /\.mdx?$/;

  return (nextConfig: NextConfig = {}): NextConfig => {
    // Placeholder: real wiring lands in milestone 2. See CONTEXT.md.
    void extension;
    void options;
    return nextConfig;
  };
}

export type { CompileOptions };
