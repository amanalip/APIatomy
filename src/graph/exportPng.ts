import { toPng } from 'html-to-image';

export async function exportGraphToPng(
  elementId: string,
  filename = 'apiatomy-topology.png',
  backgroundColor = '#020617'
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) return false;

  try {
    const dataUrl = await toPng(element, {
      backgroundColor,
      quality: 0.95,
      pixelRatio: 2,
      filter: (node) => {
        if (node instanceof Element) {
          if (node.getAttribute('data-export-ignore') === 'true') return false;
          if ((node as HTMLElement).classList?.contains('react-flow__panel')) return false;
        }
        return true;
      },
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    // Append to DOM for Firefox/Safari compatibility
    if (link.style) link.style.display = 'none';
    try {
      if (document.body && typeof document.body.appendChild === 'function') {
        document.body.appendChild(link);
      }
    } catch {
      /* ignore append errors in test env */
    }
    link.click();
    // Cleanup after trigger
    setTimeout(() => {
      try {
        document.body?.removeChild(link);
      } catch {
        /* ignore */
      }
    }, 100);
    return true;
  } catch (err) {
    console.error('Failed to export graph image:', err);
    return false;
  }
}
