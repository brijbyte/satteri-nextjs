import type { Metadata } from 'next';
import Content, { frontmatter, toc } from './content.mdx';

// Frontmatter drives the page's <title>/description — parsed from YAML by the
// loader and surfaced as a plain object export (milestone 4).
export const metadata: Metadata = {
  title: frontmatter.title as string,
  description: frontmatter.description as string,
};

export default function Milestone4() {
  const tags = (frontmatter.tags as string[] | undefined) ?? [];
  return (
    <>
      <a href="/">← all milestones</a>

      <h1>Milestone 4 — {frontmatter.title as string}</h1>

      {/* Frontmatter-driven metadata, read from the `frontmatter` export. */}
      <dl className="frontmatter">
        <dt>Author</dt>
        <dd>{frontmatter.author as string}</dd>
        <dt>Description</dt>
        <dd>{frontmatter.description as string}</dd>
        <dt>Tags</dt>
        <dd>{tags.join(', ')}</dd>
      </dl>

      {/* Table of contents, built from the `toc` export (depth/value/id). */}
      <nav className="toc" aria-label="Table of contents">
        <strong>On this page</strong>
        <ul>
          {toc.map((entry) => (
            <li key={entry.id} style={{ marginLeft: (entry.depth - 1) * 16 }}>
              <a href={`#${entry.id}`}>{entry.value}</a>
            </li>
          ))}
        </ul>
      </nav>

      {/* The .mdx body; headings carry the same ids the TOC links target. */}
      <Content />
    </>
  );
}
