// Single source of truth for the milestone list, driving the index page.
// `source` points at the example route (or the app file) that demonstrates it;
// `lib` at the library file that implements it.

export interface Milestone {
  num: number;
  title: string;
  desc: string;
  done: boolean;
  href?: string;
  /** Example-app file demonstrating this milestone (repo-relative). */
  source?: string;
  /** Library file implementing this milestone (repo-relative). */
  lib?: string;
}

export const milestones: Milestone[] = [
  {
    num: 1,
    title: 'Loader core',
    desc: 'Compile .md/.mdx to a React module via satteri mdxToJs.',
    done: true,
    href: '/milestone-1',
    source: 'examples/showcase/app/milestone-1/page.tsx',
    lib: 'src/loader.ts',
  },
  {
    num: 2,
    title: 'withSatteri config wrapper',
    desc: 'Wire the loader into Next so real .mdx pages render.',
    done: true,
    href: '/milestone-2',
    source: 'examples/showcase/app/milestone-2/page.mdx',
    lib: 'src/index.ts',
  },
  {
    num: 3,
    title: 'Components provider',
    desc: 'useMDXComponents / mdx-components.tsx convention.',
    done: true,
    href: '/milestone-3',
    source: 'examples/showcase/app/milestone-3/page.mdx',
    lib: 'src/index.ts',
  },
  {
    num: 4,
    title: 'TOC / frontmatter export',
    desc: 'Surface result.data (headings, frontmatter) from the module.',
    done: true,
    href: '/milestone-4',
    source: 'examples/showcase/app/milestone-4/page.tsx',
    lib: 'src/headings.ts',
  },
  {
    num: 5,
    title: 'Plugin compat / escape hatch',
    desc: 'Ship satteri-native plugins + serializable string plugin specs.',
    done: true,
    href: '/milestone-5',
    source: 'examples/showcase/app/milestone-5/page.tsx',
    lib: 'src/plugins.ts',
  },
  {
    num: 6,
    title: 'Tests + example app',
    desc: 'Broadened test suite across milestones, plus this polished showcase.',
    done: true,
    source: 'examples/showcase/app/milestones.ts',
    lib: 'test/',
  },
];
