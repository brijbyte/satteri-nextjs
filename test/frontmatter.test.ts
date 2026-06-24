import { describe, it, expect, vi } from 'vitest';
import { parseFrontmatter } from '../src/frontmatter.js';

describe('parseFrontmatter', () => {
  it('returns {} for null (no frontmatter block)', () => {
    expect(parseFrontmatter(null)).toEqual({});
  });

  it('parses a YAML map into a plain object', () => {
    const fm = { kind: 'yaml' as const, value: 'title: Hello\ntags: [a, b]\ndraft: false' };
    expect(parseFrontmatter(fm)).toEqual({ title: 'Hello', tags: ['a', 'b'], draft: false });
  });

  it('returns {} for non-map YAML (scalar or sequence)', () => {
    expect(parseFrontmatter({ kind: 'yaml', value: 'just a string' })).toEqual({});
    expect(parseFrontmatter({ kind: 'yaml', value: '- a\n- b' })).toEqual({});
  });

  it('returns {} and warns for TOML (not parsed)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseFrontmatter({ kind: 'toml', value: 'title = "Hello"' })).toEqual({});
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
