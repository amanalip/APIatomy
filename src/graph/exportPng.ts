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
        // Exclude UI controls panel from snapshot
        if (node instanceof HTMLElement && node.classList.contains('react-flow__panel')) {
          return false;
        }
        return true;
      },
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
    return true;
  } catch (err) {
    console.error('Failed to export graph image:', err);
    return false;
  }
}
