import * as runtime from 'react/jsx-runtime';
import type { ComponentType } from 'react';
import { evaluate } from 'satteri';
import { compileMdx } from 'satteri-nextjs/loader';
import { Counter } from '../Counter';

// The sample document we feed through the loader on every request (server-side).
const SAMPLE = `---
title: Loader core demo
status: live
---

# It compiles in Rust

Markdown like **bold**, _italic_, \`inline code\`, and
[links](https://satteri.bruits.org) is parsed and compiled by satteri.

The static parts above collapse into a single \`dangerouslySetInnerHTML\` div.
The interactive component below stays a real React element:

<Counter initial={5} />

## How it works

1. \`compileMdx\` calls satteri's \`mdxToJs\`.
2. We get back \`{ code, frontmatter, data }\`.
3. \`code\` is an ESM module exporting a React component.
`;

const optimizeStatic = {
  component: 'div',
  prop: 'dangerouslySetInnerHTML',
  wrapPropValue: true,
} as const;

export default async function Milestone1() {
  // What the loader emits for a real .mdx file: the React module source.
  const { code, frontmatter } = await compileMdx(SAMPLE, { optimizeStatic });

  // Same satteri compile, but evaluated to a live component so we can render it
  // here (the loader path lands once milestone 2 wires it into webpack).
  // React's jsx-runtime types are stricter than satteri's EvaluateOptions.jsx;
  // cast the options bag to bridge the harmless variance mismatch.
  const evalOptions = { ...runtime, optimizeStatic } as Parameters<typeof evaluate>[1];
  const mod = (await evaluate(SAMPLE, evalOptions)) as {
    default: ComponentType<{ components?: Record<string, unknown> }>;
  };
  const Content = mod.default;

  return (
    <>
      <a className="back" href="/">← all milestones</a>
      <h1>Milestone 1 — Loader core</h1>
      <p className="lede">
        Source MDX → <code>compileMdx</code> → a React module. Below: the input,
        the generated module, the extracted frontmatter, and the live render.
      </p>

      <h2>1. Source</h2>
      <div className="panel">
        <div className="panel-title">sample.mdx</div>
        <pre>{SAMPLE}</pre>
      </div>

      <h2>2. Generated React module (loader output)</h2>
      <div className="panel">
        <div className="panel-title">compileMdx(...).code</div>
        <pre>{code}</pre>
      </div>

      <h2>3. Extracted frontmatter (raw)</h2>
      <div className="panel">
        <div className="panel-title">compileMdx(...).frontmatter</div>
        <pre>{JSON.stringify(frontmatter, null, 2)}</pre>
      </div>

      <h2>4. Live render</h2>
      <div className="panel">
        <div className="panel-title">&lt;Content components=&#123;&#123; Counter &#125;&#125; /&gt;</div>
        <div className="rendered">
          <Content components={{ Counter }} />
        </div>
      </div>
    </>
  );
}
