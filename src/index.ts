import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';
import type { CompileOptions } from './loader.js';
import { isPluginSpec } from './plugin-spec.js';

export interface WithSatteriOptions extends CompileOptions {
  /** Files to treat as Markdown/MDX. Defaults to `/\.mdx?$/` (`.md` + `.mdx`). */
  extension?: RegExp;
}

// Bare specifier resolved via this package's `exports["./loader"]` map.
const LOADER = 'satteri-nextjs/loader';

// Magic specifier satteri's output imports `useMDXComponents` from; we alias it
// to the app's `mdx-components` file (Next's `mdx-components.tsx` convention).
const PROVIDER_SOURCE = 'next-mdx-import-source-file';

// No-op provider used when the app has no `mdx-components` file. Computed lazily
// (see resolveProvider) so importing this module never runs `fileURLToPath` —
// a top-level call breaks if a bundler ever inlines this entry into app code.
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
  const fallback = fileURLToPath(new URL('./mdx-components-fallback.js', import.meta.url));
  return { webpack: fallback, turbopack: FALLBACK_SPECIFIER };
}

/** satteri options that survive JSON serialization (safe for Turbopack).
 * String/tuple plugin specs are kept; imported function/object plugins are not. */
function serializableOptions(options: CompileOptions): Record<string, unknown> {
  const {
    features,
    optimizeStatic,
    providerImportSource,
    jsxImportSource,
    development,
    toc,
    frontmatter,
  } = options;
  const out: Record<string, unknown> = {};
  if (features !== undefined) out.features = features;
  if (optimizeStatic !== undefined) out.optimizeStatic = optimizeStatic;
  if (providerImportSource !== undefined) out.providerImportSource = providerImportSource;
  if (jsxImportSource !== undefined) out.jsxImportSource = jsxImportSource;
  if (development !== undefined) out.development = development;
  if (toc !== undefined) out.toc = toc;
  if (frontmatter !== undefined) out.frontmatter = frontmatter;
  const mdastSpecs = options.mdastPlugins?.filter(isPluginSpec);
  const hastSpecs = options.hastPlugins?.filter(isPluginSpec);
  if (mdastSpecs?.length) out.mdastPlugins = mdastSpecs;
  if (hastSpecs?.length) out.hastPlugins = hastSpecs;
  return out;
}

/**
 * Next moved the Turbopack config key from `experimental.turbo` (13.0.0–15.2.x)
 * to the top-level `turbopack` (15.3.0+). We support `next >=14`, so the version
 * decides where our rules/alias must go — otherwise they land on a key Next
 * ignores and silently do nothing. Returns `false` (modern key) for an unknown
 * or unparseable version.
 */
export function isLegacyTurbopackVersion(version: string | undefined): boolean {
  if (!version) return false;
  const [major, minor] = version.split('.', 2).map((n) => Number.parseInt(n, 10));
  if (Number.isNaN(major) || Number.isNaN(minor)) return false;
  return major < 15 || (major === 15 && minor < 3);
}

/** Read the installed Next version and decide the Turbopack config key. */
function usesLegacyTurbopackKey(): boolean {
  try {
    const require = createRequire(import.meta.url);
    return isLegacyTurbopackVersion(require('next/package.json').version);
  } catch {
    return false;
  }
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
  // Imported function/object plugins can't be serialized into the Turbopack rule;
  // string/tuple specs can. Only warn about the non-serializable ones.
  const nonSerializablePlugins = [
    ...(compileOptions.mdastPlugins ?? []),
    ...(compileOptions.hastPlugins ?? []),
  ].some((p) => !isPluginSpec(p));

  if (nonSerializablePlugins) {
    console.warn(
      '[satteri-nextjs] imported mdast/hast plugins are not serializable, so they ' +
        'apply under webpack only — Turbopack compiles without them. Pass a string ' +
        "spec (e.g. 'pkg/mod#plugin' or ['pkg/mod#plugin', options]) to use them under both."
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

    // Next <15.3 reads Turbopack config from `experimental.turbo`; 15.3+ from the
    // top-level `turbopack`. Merge with whichever the user already populated.
    const legacy = usesLegacyTurbopackKey();
    const existingTurbopack = legacy
      ? (nextConfig.experimental as Record<string, NextConfig['turbopack']> | undefined)?.turbo
      : nextConfig.turbopack;
    const turbopackConfig = {
      ...existingTurbopack,
      resolveAlias: providerAlias
        ? { ...existingTurbopack?.resolveAlias, [PROVIDER_SOURCE]: providerAlias.turbopack }
        : existingTurbopack?.resolveAlias,
      rules: {
        ...existingTurbopack?.rules,
        ...turbopackRules,
      },
    } as NextConfig['turbopack'];

    return {
      ...nextConfig,
      pageExtensions,
      // Place the Turbopack config under the version-correct key (options are
      // JSON-serializable, enforced by serializableOptions).
      ...(legacy
        ? {
            // `experimental.turbo` is gone from Next 16's types but is the only
            // key older Next reads; cast to set it on those versions.
            experimental: {
              ...nextConfig.experimental,
              turbo: turbopackConfig,
            } as NextConfig['experimental'],
          }
        : { turbopack: turbopackConfig }),
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
export { externalLinks } from './plugins.js';
export { isPluginSpec } from './plugin-spec.js';
export type { CompileOptions };
export type { TocEntry } from './headings.js';
export type { ExternalLinksOptions } from './plugins.js';
export type { PluginSpec } from './plugin-spec.js';
