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
 * Returns the full satteri result so callers (the loader, `withSatteri`) can
 * also reach `frontmatter` and the plugin `data` bag (milestone 4).
 */
export async function compileMdx(
  source: string,
  options: CompileOptions = {},
  fileURL?: URL,
): Promise<MdxToJsResult> {
  const { mdxToJs } = await loadSatteri();
  const result = await mdxToJs(source, {
    mdastPlugins: options.mdastPlugins,
    hastPlugins: options.hastPlugins,
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
  return result;
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
