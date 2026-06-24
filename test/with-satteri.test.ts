import { describe, it, expect, vi } from 'vitest';
import withSatteri, { isLegacyTurbopackVersion } from '../src/index.js';

function applyWebpack(nextConfig: any, base = { module: { rules: [] as any[] } }) {
  const context = { defaultLoaders: { babel: 'next-swc-loader' } } as any;
  const result = nextConfig.webpack(base, context);
  return result;
}

describe('withSatteri (config wrapper)', () => {
  it('extends pageExtensions with md/mdx without dropping existing ones', () => {
    const cfg = withSatteri()({ pageExtensions: ['tsx'] });
    expect(cfg.pageExtensions).toEqual(['tsx', 'md', 'mdx']);
  });

  it('defaults pageExtensions when none provided', () => {
    const cfg = withSatteri()({});
    expect(cfg.pageExtensions).toEqual(['tsx', 'ts', 'jsx', 'js', 'md', 'mdx']);
  });

  it('registers Turbopack rules for *.md and *.mdx pointing at the loader', () => {
    const cfg = withSatteri({ features: { gfm: true } })({});
    const rules = cfg.turbopack!.rules!;
    expect(Object.keys(rules)).toEqual(expect.arrayContaining(['*.md', '*.mdx']));
    const rule: any = rules['*.mdx'];
    expect(rule.loaders[0].loader).toBe('satteri-nextjs/loader');
    expect(rule.as).toBe('*.js');
    expect(rule.loaders[0].options).toEqual({
      features: { gfm: true },
      providerImportSource: 'next-mdx-import-source-file',
    });
  });

  it('pushes a webpack rule with the loader after defaultLoaders.babel', () => {
    const cfg = withSatteri()({});
    const config = applyWebpack(cfg);
    const rule = config.module.rules.at(-1);
    expect(rule.test.test('page.mdx')).toBe(true);
    expect(rule.test.test('page.md')).toBe(true);
    expect(rule.test.test('page.tsx')).toBe(false);
    expect(rule.use[0]).toBe('next-swc-loader');
    expect(rule.use[1].loader).toBe('satteri-nextjs/loader');
  });

  it('passes full options (including plugins) to the webpack loader', () => {
    const plugin = { heading() {} };
    const cfg = withSatteri({ mdastPlugins: [plugin] })({});
    const config = applyWebpack(cfg);
    const rule = config.module.rules.at(-1);
    expect(rule.use[1].options.mdastPlugins).toEqual([plugin]);
  });

  it('strips non-serializable (imported) plugins from Turbopack options and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cfg = withSatteri({ mdastPlugins: [{ heading() {} }] })({});
    const rule: any = cfg.turbopack!.rules!['*.mdx'];
    expect(rule.loaders[0].options.mdastPlugins).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('keeps string/tuple plugin specs in Turbopack options without warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cfg = withSatteri({
      hastPlugins: ['satteri-nextjs/plugins#externalLinks', ['pkg/mod#p', { a: 1 }]],
    })({});
    const rule: any = cfg.turbopack!.rules!['*.mdx'];
    expect(rule.loaders[0].options.hastPlugins).toEqual([
      'satteri-nextjs/plugins#externalLinks',
      ['pkg/mod#p', { a: 1 }],
    ]);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('enables the component provider by default and aliases it both ways', () => {
    const cfg = withSatteri()({});
    // Loader is told to import useMDXComponents from the magic specifier.
    const tbRule: any = cfg.turbopack!.rules!['*.mdx'];
    expect(tbRule.loaders[0].options.providerImportSource).toBe('next-mdx-import-source-file');
    // No mdx-components file in the test cwd → both point at the no-op fallback,
    // but in the bundler-appropriate form (Turbopack: specifier, webpack: path).
    const tbAlias = (cfg.turbopack as any).resolveAlias['next-mdx-import-source-file'];
    expect(tbAlias).toBe('satteri-nextjs/mdx-components-fallback');
    const config = applyWebpack(cfg, { module: { rules: [] }, resolve: { alias: {} } } as any);
    expect(config.resolve.alias['next-mdx-import-source-file']).toMatch(/mdx-components-fallback\.js$/);
  });

  it('does not own the alias when a custom providerImportSource is given', () => {
    const cfg = withSatteri({ providerImportSource: '@mdx-js/react' })({});
    expect((cfg.turbopack as any).resolveAlias).toBeUndefined();
    const tbRule: any = cfg.turbopack!.rules!['*.mdx'];
    expect(tbRule.loaders[0].options.providerImportSource).toBe('@mdx-js/react');
    const config = applyWebpack(cfg, { module: { rules: [] }, resolve: { alias: {} } } as any);
    expect(config.resolve.alias['next-mdx-import-source-file']).toBeUndefined();
  });

  it('picks the Turbopack config key by Next version (experimental.turbo <15.3)', () => {
    // 13.0.0–15.2.x → legacy experimental.turbo
    expect(isLegacyTurbopackVersion('14.2.0')).toBe(true);
    expect(isLegacyTurbopackVersion('15.0.0')).toBe(true);
    expect(isLegacyTurbopackVersion('15.2.9')).toBe(true);
    // 15.3.0+ → top-level turbopack
    expect(isLegacyTurbopackVersion('15.3.0')).toBe(false);
    expect(isLegacyTurbopackVersion('16.2.9')).toBe(false);
    // Unknown/unparseable → modern key (safe default)
    expect(isLegacyTurbopackVersion(undefined)).toBe(false);
    expect(isLegacyTurbopackVersion('canary')).toBe(false);
  });

  it('preserves an existing nextConfig.webpack hook', () => {
    const original = vi.fn((c: any) => c);
    const cfg = withSatteri()({ webpack: original } as any);
    applyWebpack(cfg);
    expect(original).toHaveBeenCalledOnce();
  });
});
