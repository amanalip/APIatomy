import LZString from 'lz-string';

self.onmessage = (e: MessageEvent<{ id: number; text: string }>) => {
  const { id, text } = e.data;
  try {
    const compressed = LZString.compressToEncodedURIComponent(text);
    (self as unknown as Worker).postMessage({ id, compressed });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: String(err) });
  }
};
