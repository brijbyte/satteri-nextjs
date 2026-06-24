// Serializable plugin references. A plugin passed as a function/object only
// survives the webpack loader; a *string* specifier (optionally with options)
// is JSON-serializable, so it threads through the Turbopack loader rule too.
// Resolved to a real satteri plugin at compile time via dynamic import.

/**
 * A plugin referenced by module specifier instead of an imported value:
 * - `'pkg/mod'` / `'pkg/mod#namedExport'` (default export when `#name` omitted)
 * - `['pkg/mod#namedExport', options]` — rehype-style `[plugin, options]`
 *
 * The resolved export is called as `factory(options)` when it's a function,
 * else used as-is (a plain plugin definition).
 */
export type PluginSpec = string | readonly [specifier: string, options?: unknown];

/** True for the serializable string/tuple forms (vs an imported function/object). */
export function isPluginSpec(plugin: unknown): plugin is PluginSpec {
  return (
    typeof plugin === 'string' ||
    (Array.isArray(plugin) && plugin.length > 0 && typeof plugin[0] === 'string')
  );
}

/** Split `'module#exportName'` into parts; a leading `#` (Node "imports"
 * specifiers) is kept with the module, and a missing `#name` → default export. */
function parseSpecifier(specifier: string): { modulePath: string; exportName: string } {
  const sep = specifier.indexOf('#', specifier.startsWith('#') ? 1 : 0);
  return sep === -1
    ? { modulePath: specifier, exportName: 'default' }
    : { modulePath: specifier.slice(0, sep), exportName: specifier.slice(sep + 1) };
}

/** Import a spec and produce the satteri plugin it names. */
async function resolvePlugin(spec: PluginSpec): Promise<unknown> {
  const [specifier, options] = typeof spec === 'string' ? [spec, undefined] : spec;
  const { modulePath, exportName } = parseSpecifier(specifier);
  const mod = (await import(modulePath)) as Record<string, unknown>;
  const exported = mod[exportName];
  if (exported === undefined) {
    throw new Error(`[satteri-nextjs] plugin module "${modulePath}" has no export "${exportName}".`);
  }
  return typeof exported === 'function'
    ? (exported as (o?: unknown) => unknown)(options)
    : exported;
}

/** Resolve a mixed list of imported plugins + string specs to plugin values. */
export async function resolvePlugins<T>(
  plugins: ReadonlyArray<T | PluginSpec> | undefined,
): Promise<T[]> {
  if (!plugins?.length) return [];
  return Promise.all(
    plugins.map((p) => (isPluginSpec(p) ? resolvePlugin(p) : p)),
  ) as Promise<T[]>;
}
