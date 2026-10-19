import { act } from 'react';
import { createPortal } from 'react-dom';
import { afterEach, expect, it } from 'vitest';
import { useFocusTrap } from '../src/hooks/useFocusTrap';
import { mount } from './reactHarness';

function Dialog({ enabled }: { enabled: boolean }) {
  const ref = useFocusTrap(true);
  return createPortal(
    <div ref={ref}>
      <button>First</button>
      <button disabled={!enabled}>Last</button>
    </div>,
    document.body
  );
}
let view: ReturnType<typeof mount>;
afterEach(() => {
  view?.unmount();
  document.getElementById('root')?.remove();
});

it('makes the background inert, tracks newly enabled controls, and restores focus on close', () => {
  const root = document.createElement('div');
  root.id = 'root';
  const trigger = document.createElement('button');
  root.append(trigger);
  document.body.append(root);
  trigger.focus();
  view = mount(<Dialog enabled={false} />);
  expect(root.inert).toBe(true);
  expect(root.getAttribute('aria-hidden')).toBe('true');
  view.rerender(<Dialog enabled={true} />);
  const last = [...document.querySelectorAll('button')].find(
    (button) => button.textContent === 'Last'
  )!;
  last.focus();
  act(() =>
    last.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    )
  );
  expect(document.activeElement?.textContent).toBe('First');
  view.unmount();
  expect(root.inert).toBeFalsy();
  expect(root.hasAttribute('aria-hidden')).toBe(false);
  expect(document.activeElement).toBe(trigger);
});
