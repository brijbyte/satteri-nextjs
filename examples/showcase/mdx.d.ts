// Type for importing `.mdx` files as modules: the default React component plus
// the `frontmatter` / `toc` named exports the satteri loader appends (milestone 4).
declare module '*.mdx' {
  import type { ComponentType } from 'react';
  import type { TocEntry } from 'satteri-nextjs';
  const MDXContent: ComponentType<Record<string, unknown>>;
  export default MDXContent;
  export const frontmatter: Record<string, unknown>;
  export const toc: TocEntry[];
}
