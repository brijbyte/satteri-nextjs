// Default provider used when the app has no root `mdx-components.{tsx,ts,js}`
// file. Returns an empty component map so MDX still compiles and renders.
// satteri's compiled output calls this via `providerImportSource`.
export function useMDXComponents(
  components?: Record<string, unknown>,
): Record<string, unknown> {
  return components ?? {};
}
