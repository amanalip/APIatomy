import { act } from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
beforeEach(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 0; });
});
afterEach(() => { vi.unstubAllGlobals(); delete (Element.prototype as any).scrollIntoView; });
import { useSchemaNavigation } from '../src/hooks/useSchemaNavigation';
import { mount, click, input } from './reactHarness';
import { SchemaViewer } from '../src/ui/SchemaViewer';
let navigation: ReturnType<typeof useSchemaNavigation>;
function Harness({ name }: { name?: string }) { navigation = useSchemaNavigation(name); return null; }
it('opens explicit links and returns to the list without forgetting selection intent', () => {
  const view = mount(<Harness />);
  expect(navigation.showDetails).toBe(false);
  act(() => navigation.openDetails());
  expect(navigation.showDetails).toBe(true);
  act(() => navigation.backToList());
  expect(navigation.showDetails).toBe(false);
  view.rerender(<Harness name="Linked" />);
  expect(navigation.showDetails).toBe(true);
  view.unmount();
});
it('retains schema search when selecting details and navigating Back', () => {
  const view = mount(<SchemaViewer schemas={{ Pet: { type: 'string' }, Other: { type: 'integer' } }} />);
  input(view.container.querySelector('input')!, 'Pet');
  click([...view.container.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Pet')!);
  click([...view.container.querySelectorAll('button')].find((button) => button.textContent === 'Back to schemas')!);
  expect(view.container.querySelector('input')?.value).toBe('Pet');
  expect(view.container.querySelector('h2')?.textContent).toBe('Pet');
  view.unmount();
});
