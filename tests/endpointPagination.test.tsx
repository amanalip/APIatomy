import { afterEach, describe, expect, it, vi } from 'vitest';
import { EndpointExplorer } from '../src/ui/EndpointExplorer';
import { parseApiSpec } from '../src/parser';
import { mount, click, input } from './reactHarness';

const base = parseApiSpec(
  JSON.stringify({
    openapi: '3.0.0',
    info: { title: 'T', version: '1' },
    paths: { '/test': { get: { responses: { '200': { description: 'OK' } } } } },
  })
).endpoints[0];
let view: ReturnType<typeof mount>;
afterEach(() => view?.unmount());

describe('endpoint pagination', () => {
  it.each([1, 12])('makes all 221 endpoints accessible across %i tags', (tagCount) => {
    const endpoints = Array.from({ length: 221 }, (_, i) => ({
      ...base,
      id: String(i),
      path: `/test/${i}`,
      tags: [`Tag${i % tagCount}`],
    }));
    const select = vi.fn();
    view = mount(
      <EndpointExplorer endpoints={endpoints} selectedEndpoint={null} onSelectEndpoint={select} />
    );
    const seen = new Set<string>();
    for (let page = 0; page < 3; page++) {
      const cards = view.container.querySelectorAll('[data-testid="endpoint-card"]');
      expect(cards.length).toBe(page === 2 ? 21 : 100);
      for (const card of cards) {
        seen.add(card.getAttribute('aria-label')!);
        click(card);
      }
      const next = [...view.container.querySelectorAll('button')].find(
        (b) => b.textContent === 'Next'
      )!;
      expect(next.disabled).toBe(page === 2);
      if (!next.disabled) click(next);
    }
    expect(seen.size).toBe(221);
    expect(select).toHaveBeenCalledTimes(221);
    input(view.container.querySelector('input')!, '/test/220');
    expect(view.container.querySelectorAll('[data-testid="endpoint-card"]')).toHaveLength(1);
    expect(view.container.querySelector('[data-testid="endpoint-card"]')?.textContent).toContain(
      '/test/220'
    );
  });
});
