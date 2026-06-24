import * as runtime from 'react/jsx-runtime';
import type { ComponentType } from 'react';
import { evaluate } from 'satteri';
import { compileMdx } from 'satteri-nextjs/loader';
import { externalLinks } from 'satteri-nextjs/plugins';

// A sample doc mixing external and internal links, so the plugin's effect shows.
const SAMPLE = `# Plugins in action

This is rewritten by a **satteri-native** hast plugin, \`externalLinks\`:

- An [external link](https://satteri.bruits.org) gets \`target\`/\`rel\`.
- A [protocol-relative link](//example.com/cdn) is external too.
- An [internal link](/milestone-4) is left untouched.
`;

const optimizeStatic = {
  component: 'div',
  prop: 'dangerouslySetInnerHTML',
  wrapPropValue: true,
} as const;

export default async function Milestone5() {
  // Pass the satteri plugin straight through compileMdx. (We compile + evaluate
  // here rather than route a .mdx file, because plugins aren't JSON-serializable
  // and so don't survive the Turbopack loader — see the note below.)
  const options = { hastPlugins: [externalLinks()], optimizeStatic };
  const { code } = await compileMdx(SAMPLE, options);

  const evalOptions = { ...runtime, ...options } as Parameters<typeof evaluate>[1];
  const mod = (await evaluate(SAMPLE, evalOptions)) as { default: ComponentType };
  const Content = mod.default;

  // The collapsed static HTML, so the added target/rel are visible as text.
  const html = code.match(/__html: "([\s\S]*?)" \}/)?.[1]?.replace(/\\"/g, '"').replace(/\\n/g, '\n') ?? '';

  return (
    <>
      <a className="back" href="/">← all milestones</a>
      <h1>Milestone 5 — Plugin compat / escape hatch</h1>
      <p className="lede">
        satteri has its <strong>own</strong> plugin format (not remark/rehype).
        Below, a satteri hast plugin rewrites external links — and we document why
        a general unified shim isn’t viable today.
      </p>

      <h2>1. Source</h2>
      <div className="panel">
        <div className="panel-title">sample.md</div>
        <pre>{SAMPLE}</pre>
      </div>

      <h2>2. After the externalLinks plugin (emitted HTML)</h2>
      <div className="panel">
        <div className="panel-title">compileMdx(src, &#123; hastPlugins: [externalLinks()] &#125;)</div>
        <pre>{html}</pre>
      </div>

      <h2>3. Live render</h2>
      <div className="panel">
        <div className="panel-title">&lt;Content /&gt; — hover the links</div>
        <div className="rendered">
          <Content />
        </div>
      </div>

      <h2>Why no remark/rehype shim?</h2>
      <div className="rendered">
        <ul>
          <li>
            satteri AST nodes are <strong>read-only views</strong> over a Rust
            arena; unified plugins mutate JS nodes directly, so they can’t run
            against satteri’s tree.
          </li>
          <li>
            The escape hatch (<code>markdownToMdast</code> → transform with
            unified → recompile) dead-ends: <code>mdxToJs</code> takes a{' '}
            <strong>source string</strong>, not an mdast tree, so a
            unified-transformed tree can’t be fed back into satteri’s compiler.
          </li>
          <li>
            Conclusion: write <strong>satteri-native</strong> plugins (like{' '}
            <code>externalLinks</code> / <code>collectHeadings</code>). They’re the
            supported extension path; pass them via <code>compileMdx</code> or{' '}
            <code>withSatteri</code> (webpack only, since Turbopack can’t serialize
            functions).
          </li>
        </ul>
      </div>
    </>
  );
}
