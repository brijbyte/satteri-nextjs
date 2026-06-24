// Ready-made satteri plugins users can pass to `compileMdx`/`withSatteri`.
// These are satteri-NATIVE plugins (not remark/rehype) — see CONTEXT.md
// milestone 5 for why a general unified shim isn't viable.

import { defineHastPlugin } from 'satteri';
import type { HastPluginDefinition } from 'satteri';

export interface ExternalLinksOptions {
  /** `target` set on external anchors. Default `'_blank'`. */
  target?: string;
  /** `rel` set on external anchors. Default `'noopener noreferrer'`. */
  rel?: string;
  /** Decide if an `href` is external. Default: protocol(-relative) absolute URLs. */
  test?: (href: string) => boolean;
}

const isExternal = (href: string) => /^(https?:)?\/\//.test(href);

/**
 * Hast plugin (~ rehype-external-links): add `target`/`rel` to anchors whose
 * `href` points off-site, leaving internal/relative links untouched.
 */
export function externalLinks(options: ExternalLinksOptions = {}): HastPluginDefinition {
  const { target = '_blank', rel = 'noopener noreferrer', test = isExternal } = options;
  return defineHastPlugin({
    name: 'satteri-nextjs:external-links',
    element: {
      filter: ['a'],
      visit(node, ctx) {
        const href = node.properties?.href;
        if (typeof href === 'string' && test(href)) {
          ctx.setProperty(node, 'target', target);
          ctx.setProperty(node, 'rel', rel);
        }
      },
    },
  });
}
