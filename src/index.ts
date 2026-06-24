import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';
import type { CompileOptions } from './loader.js';

export interface WithSatteriOptions extends CompileOptions {
  /** Files to treat as Markdown/MDX. Defaults to `/\.mdx?$/` (`.md` + `.mdx`). */
  extension?: RegExp;
}

// Bare specifier resolved via this package's `exports["./loader"]` map.
const LOADER = 'satteri-nextjs/loader';

// Magic specifier satteri's output imports `useMDXComponents` from; we alias it
// to the app's `mdx-components` file (Next's `mdx-components.tsx` convention).
const PROVIDER_SOURCE = 'next-mdx-import-source-file';

// No-op provider used when the app has no `mdx-components` file.
const FALLBACK_PROVIDER = fileURLToPath(new URL('./mdx-components-fallback.js', import.meta.url));
const FALLBACK_SPECIFIER = 'satteri-nextjs/mdx-components-fallback';

/**
 * Alias targets for the provider, per bundler: webpack wants an absolute path;
 * Turbopack treats string values as project-root-relative (or bare module
 * specifiers), so absolute paths are mis-joined there.
 */
interface ProviderAlias {
  webpack: string;
  turbopack: string;
}

/** Find the app's `mdx-components` file (root or `src/`), else the fallback. */
function resolveProvider(): ProviderAlias {
  const cwd = process.cwd();
  for (const dir of ['', 'src']) {
    for (const ext of ['tsx', 'ts', 'jsx', 'js', 'mjs']) {
      const candidate = join(cwd, dir, `mdx-components.${ext}`);
      if (existsSync(candidate)) {
        return { webpack: candidate, turbopack: './' + relative(cwd, candidate) };
      }
    }
  }
  return { webpack: FALLBACK_PROVIDER, turbopack: FALLBACK_SPECIFIER };
}

/** satteri options that survive JSON serialization (safe for Turbopack). */
function serializableOptions(options: CompileOptions): Record<string, unknown> {
  const { features, optimizeStatic, providerImportSource, jsxImportSource, development, toc, frontmatter } = options;
  const out: Record<string, unknown> = {};
  if (features !== undefined) out.features = features;
  if (optimizeStatic !== undefined) out.optimizeStatic = optimizeStatic;
  if (providerImportSource !== undefined) out.providerImportSource = providerImportSource;
  if (jsxImportSource !== undefined) out.jsxImportSource = jsxImportSource;
  if (development !== undefined) out.development = development;
  if (toc !== undefined) out.toc = toc;
  if (frontmatter !== undefined) out.frontmatter = frontmatter;
  return out;
}

/**
 * Wrap a Next.js config so `.md`/`.mdx` files are compiled with satteri
 * (Rust-native parse/compile) instead of `@mdx-js/loader`.
 *
 * Mirrors `@next/mdx`'s `nextMdx()` ergonomics: returns a function you apply to
 * your `nextConfig`. Wires the loader into both the webpack rule and the
 * Turbopack `turbopack.rules`, extends `pageExtensions` with `md`/`mdx`, and
 * enables the `mdx-components.tsx` component provider convention.
 *
 * Caveats:
 * - Turbopack loader options must be JSON-serializable, so `mdastPlugins`
 *   /`hastPlugins` apply under **webpack only**. Everything else works under both.
 * - The provider is on by default (`providerImportSource`); pass your own
 *   `providerImportSource` to override, in which case you wire its alias yourself.
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

  // Default the provider to our managed specifier; only then do we own the alias.
  const provider = compileOptions.providerImportSource ?? PROVIDER_SOURCE;
  const ownsProvider = provider === PROVIDER_SOURCE;
  const loaderOptions: CompileOptions = { ...compileOptions, providerImportSource: provider };
  const providerAlias = ownsProvider ? resolveProvider() : undefined;

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
      loaders: [{ loader: LOADER, options: serializableOptions(loaderOptions) }],
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
        resolveAlias: providerAlias
          ? { ...nextConfig.turbopack?.resolveAlias, [PROVIDER_SOURCE]: providerAlias.turbopack }
          : nextConfig.turbopack?.resolveAlias,
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
          use: [context.defaultLoaders.babel, { loader: LOADER, options: loaderOptions }],
        });
        if (providerAlias) {
          config.resolve ??= {};
          config.resolve.alias ??= {};
          config.resolve.alias[PROVIDER_SOURCE] = providerAlias.webpack;
        }
        return typeof nextConfig.webpack === 'function'
          ? nextConfig.webpack(config, context)
          : config;
      },
    };
  };
}

export { compileMdx } from './loader.js';
export { collectHeadings } from './headings.js';
export { parseFrontmatter } from './frontmatter.js';
export type { CompileOptions };
export type { TocEntry } from './headings.js';
