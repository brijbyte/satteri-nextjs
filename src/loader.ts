// Webpack/Turbopack loader: compiles MDX source to a React module via satteri.
// Skeleton only — see CONTEXT.md milestone 1 for the full plan.

export interface CompileOptions {
  /** satteri mdast plugins (~ remark). */
  mdastPlugins?: unknown[];
  /** satteri hast plugins (~ rehype). */
  hastPlugins?: unknown[];
  /** satteri Features toggles (gfm, frontmatter, math, directive, ...). */
  features?: Record<string, unknown>;
}

// Lazy native import so the Rust binary isn't pulled in unless the loader runs.
let satteriMod: typeof import('satteri') | undefined;
async function loadSatteri() {
  satteriMod ??= await import('satteri');
  return satteriMod;
}

/**
 * Compile MDX source to React-compatible ESM module code.
 *
 * Uses React-style static optimization so static subtrees collapse to
 * `dangerouslySetInnerHTML` instead of per-node JSX calls.
 */
export async function compileMdx(source: string, options: CompileOptions = {}): Promise<string> {
  const { mdxToJs } = await loadSatteri();
  const js = await mdxToJs(source, {
    mdastPlugins: options.mdastPlugins as never,
    hastPlugins: options.hastPlugins as never,
    features: options.features as never,
    optimizeStatic: {
      component: 'div',
      prop: 'dangerouslySetInnerHTML',
      wrapPropValue: true,
    },
  });
  // TODO: surface result.data (headings/frontmatter), inject mdx-components
  // provider, add `'use client'` only where needed, source maps, HMR.
  return js as string;
}

// webpack loader entry (async).
export default function satteriLoader(this: any, source: string) {
  const callback = this.async();
  const options = (this.getOptions?.() ?? {}) as CompileOptions;
  compileMdx(source, options).then(
    (code) => callback(null, code),
    (err) => callback(err),
  );
}
