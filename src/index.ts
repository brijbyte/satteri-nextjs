import type { NextConfig } from 'next';
import type { CompileOptions } from './loader.js';

export interface WithSatteriOptions extends CompileOptions {
  /** Files to treat as Markdown/MDX. Defaults to `/\.mdx?$/` (`.md` + `.mdx`). */
  extension?: RegExp;
}

// Bare specifier resolved via this package's `exports["./loader"]` map.
const LOADER = 'satteri-nextjs/loader';

/** satteri options that survive JSON serialization (safe for Turbopack). */
function serializableOptions(options: CompileOptions): Record<string, unknown> {
  const { features, optimizeStatic, providerImportSource, jsxImportSource, development } = options;
  const out: Record<string, unknown> = {};
  if (features !== undefined) out.features = features;
  if (optimizeStatic !== undefined) out.optimizeStatic = optimizeStatic;
  if (providerImportSource !== undefined) out.providerImportSource = providerImportSource;
  if (jsxImportSource !== undefined) out.jsxImportSource = jsxImportSource;
  if (development !== undefined) out.development = development;
  return out;
}

/**
 * Wrap a Next.js config so `.md`/`.mdx` files are compiled with satteri
 * (Rust-native parse/compile) instead of `@mdx-js/loader`.
 *
 * Mirrors `@next/mdx`'s `nextMdx()` ergonomics: returns a function you apply to
 * your `nextConfig`. Wires the loader into both the webpack rule and the
 * Turbopack `turbopack.rules`, and extends `pageExtensions` with `md`/`mdx`.
 *
 * Caveat: Turbopack loader options must be JSON-serializable, so `mdastPlugins`
 * / `hastPlugins` apply under **webpack only**. Everything else (features,
 * optimizeStatic, providerImportSource, ...) works under both.
 */
export default function withSatteri(options: WithSatteriOptions = {}) {
  const { extension = /\.mdx?$/, ...compileOptions } = options;
  const hasPlugins = Boolean(compileOptions.mdastPlugins?.length || compileOptions.hastPlugins?.length);

  if (hasPlugins) {
    console.warn(
      '[satteri-nextjs] mdast/hast plugins are not serializable, so they apply ' +
        'under webpack only — Turbopack will compile without them. See CONTEXT.md.',
    );
  }

  // Turbopack globs derived from the extension (best-effort; defaults to both).
  const turbopackGlobs = [
    extension.test('f.md') ? '*.md' : null,
    extension.test('f.mdx') ? '*.mdx' : null,
  ].filter((g): g is string => g !== null);
  const globs = turbopackGlobs.length ? turbopackGlobs : ['*.md', '*.mdx'];

  return (nextConfig: NextConfig = {}): NextConfig => {
    const basePageExtensions = nextConfig.pageExtensions ?? ['tsx', 'ts', 'jsx', 'js'];
    const pageExtensions = [
      ...basePageExtensions,
      ...['md', 'mdx'].filter((e) => !basePageExtensions.includes(e)),
    ];

    const turbopackRule = {
      loaders: [{ loader: LOADER, options: serializableOptions(compileOptions) }],
      as: '*.js',
    };
    const turbopackRules: Record<string, typeof turbopackRule> = {};
    for (const glob of globs) turbopackRules[glob] = turbopackRule;

    return {
      ...nextConfig,
      pageExtensions,
      // Options are JSON-serializable (enforced by serializableOptions); cast to
      // satisfy Next's stricter JSONValue typing on Turbopack loader options.
      turbopack: {
        ...nextConfig.turbopack,
        rules: {
          ...nextConfig.turbopack?.rules,
          ...turbopackRules,
        },
      } as NextConfig['turbopack'],
      webpack(config, context) {
        // Loaders run right-to-left: our loader compiles MDX→JS first, then
        // Next's default (swc) loader handles RSC/'use client'/module transforms.
        config.module.rules.push({
          test: extension,
          use: [context.defaultLoaders.babel, { loader: LOADER, options: compileOptions }],
        });
        return typeof nextConfig.webpack === 'function'
          ? nextConfig.webpack(config, context)
          : config;
      },
    };
  };
}

export { compileMdx } from './loader.js';
export type { CompileOptions };
