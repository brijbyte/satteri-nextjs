// Single source of truth for the milestone list, driving the index page.
// Flip `done` and add an `href` as each milestone lands.

export interface Milestone {
  num: number;
  title: string;
  desc: string;
  done: boolean;
  href?: string;
}

export const milestones: Milestone[] = [
  {
    num: 1,
    title: 'Loader core',
    desc: 'Compile .md/.mdx to a React module via satteri mdxToJs.',
    done: true,
    href: '/milestone-1',
  },
  {
    num: 2,
    title: 'withSatteri config wrapper',
    desc: 'Wire the loader into Next so real .mdx pages render.',
    done: true,
    href: '/milestone-2',
  },
  {
    num: 3,
    title: 'Components provider',
    desc: 'useMDXComponents / mdx-components.tsx convention.',
    done: true,
    href: '/milestone-3',
  },
  {
    num: 4,
    title: 'TOC / frontmatter export',
    desc: 'Surface result.data (headings, frontmatter) from the module.',
    done: true,
    href: '/milestone-4',
  },
  {
    num: 5,
    title: 'Plugin compat / escape hatch',
    desc: 'Adapt a subset of remark/rehype, or document the mdast route.',
    done: false,
  },
  {
    num: 6,
    title: 'Tests + example app',
    desc: 'This app, plus the test suite across milestones.',
    done: false,
  },
];
