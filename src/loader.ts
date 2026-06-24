// Webpack/Turbopack loader: compiles Markdown/MDX source to a React module
// via satteri's Rust-native `mdxToJs`. See CONTEXT.md milestone 1.

import { pathToFileURL } from 'node:url';
import type {
  Features,
  MdastPluginInput,
  HastPluginInput,
  OptimizeStaticConfig,
  MdxToJsResult,
} from 'satteri';
import { collectHeadings } from './headings.js';
import { parseFrontmatter } from './frontmatter.js';

/** React-style static optimization: collapse static subtrees to one
 * `dangerouslySetInnerHTML` div instead of per-node `jsx()` calls. */
const REACT_OPTIMIZE_STATIC: OptimizeStaticConfig = {
  component: 'div',
  prop: 'dangerouslySetInnerHTML',
  wrapPropValue: true,
};

export interface CompileOptions {
  /** satteri mdast plugins (~ remark). */
  mdastPlugins?: MdastPluginInput[];
  /** satteri hast plugins (~ rehype). */
  hastPlugins?: HastPluginInput[];
  /** satteri parser feature toggles (gfm, frontmatter, math, directive, ...). */
  features?: Features;
  /** Static-subtree collapsing. Defaults to the React-style config; pass
   * `false` to emit per-node JSX with no collapsing. */
  optimizeStatic?: OptimizeStaticConfig | false;
  /** Module to import the component provider (`useMDXComponents`) from.
   * Wired up by `withSatteri` in milestone 3. */
  providerImportSource?: string;
  /** Where automatic JSX runtime is imported from. Default: "react". */
  jsxImportSource?: string;
  /** Emit development output (jsxDEV, source info). Defaults from build mode. */
  development?: boolean;
  /** Slug headings + export a `toc` array (`{ depth, value, id }[]`) from the
   * compiled module. Default `true`. Set `false` to skip heading ids + TOC. */
  toc?: boolean;
  /** Parse YAML frontmatter and export it as `frontmatter` from the compiled
   * module. Default `true`. Set `false` to skip the export. */
  frontmatter?: boolean;
}

// Lazy native import so the Rust binary isn't pulled in unless the loader runs.
let satteriMod: typeof import('satteri') | undefined;
async function loadSatteri() {
  satteriMod ??= await import('satteri');
  return satteriMod;
}

/**
 * Compile Markdown/MDX source to a React-compatible ESM module.
 *
 * Returns the full satteri result. When `toc`/`frontmatter` are enabled
 * (default), the returned `code` also carries `export const toc`/`frontmatter`
 * so pages can `import { frontmatter, toc }` from the file (milestone 4).
 */
export async function compileMdx(
  source: string,
  options: CompileOptions = {},
  fileURL?: URL,
): Promise<MdxToJsResult> {
  const { mdxToJs } = await loadSatteri();
  const wantToc = options.toc !== false;
  const wantFrontmatter = options.frontmatter !== false;

  // Inject our heading collector last so user hast plugins run first.
  const hastPlugins = wantToc
    ? [...(options.hastPlugins ?? []), collectHeadings()]
    : options.hastPlugins;

  const result = await mdxToJs(source, {
    mdastPlugins: options.mdastPlugins,
    hastPlugins,
    features: options.features,
    optimizeStatic:
      options.optimizeStatic === false
        ? undefined
        : options.optimizeStatic ?? REACT_OPTIMIZE_STATIC,
    providerImportSource: options.providerImportSource,
    jsxImportSource: options.jsxImportSource,
    development: options.development,
    fileURL,
  });

  // Append named exports so the module surfaces frontmatter + TOC alongside the
  // default `MDXContent` export. satteri emits an ESM program, so this is valid.
  let suffix = '';
  if (wantFrontmatter) {
    const fm = parseFrontmatter(result.frontmatter);
    suffix += `\nexport const frontmatter = ${JSON.stringify(fm)};`;
  }
  if (wantToc) {
    const toc = (result.data.toc as unknown) ?? [];
    suffix += `\nexport const toc = ${JSON.stringify(toc)};`;
  }

  return suffix ? { ...result, code: result.code + suffix } : result;
}

// Minimal webpack loader context surface we rely on.
interface LoaderContext {
  async(): (err: Error | null, content?: string, map?: unknown) => void;
  getOptions?: () => CompileOptions;
  resourcePath?: string;
  mode?: 'development' | 'production' | 'none';
}

// Webpack loader entry (async).
export default function satteriLoader(this: LoaderContext, source: string) {
  const callback = this.async();
  const options = this.getOptions?.() ?? {};
  const development = options.development ?? this.mode === 'development';
  const fileURL = this.resourcePath ? pathToFileURL(this.resourcePath) : undefined;

  compileMdx(source, { ...options, development }, fileURL).then(
    (result) => callback(null, result.code),
    (err) => callback(err instanceof Error ? err : new Error(String(err))),
  );
}
