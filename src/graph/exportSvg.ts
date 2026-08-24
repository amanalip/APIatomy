export async function exportGraphSvg(
  element: HTMLElement,
  filename = 'apiatomy-graph.svg'
): Promise<void> {
  try {
    const mod = await import('html-to-image');
    const dataUrl = await (
      mod as unknown as { toSvg: (el: HTMLElement, opts?: unknown) => Promise<string> }
    ).toSvg(element, {
      cacheBust: true,
      backgroundColor: getComputedStyle(element).backgroundColor || '#f8fafc',
    });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 0);
    return;
  } catch {
    // fallback to cloning svg
  }
  const svg = element.querySelector('svg');
  if (!svg) throw new Error('No SVG found');
  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(clone);
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}
