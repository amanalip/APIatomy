import { MAX_PROJECT_BYTES, assertTextLimit } from '../share/projectLimits';

/** Bound network input while streaming, even when Content-Length is absent or misleading. */
export async function readImportResponse(response: Response, signal: AbortSignal): Promise<string> {
  const declared = Number(response.headers.get('content-length'));
  if (declared > MAX_PROJECT_BYTES) throw new Error('Project file exceeds 20 MB');
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    assertTextLimit(text, MAX_PROJECT_BYTES, 'Project file');
    return text;
  }
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let bytes = 0;
  try {
    while (true) {
      if (signal.aborted) throw new DOMException('Request cancelled', 'AbortError');
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_PROJECT_BYTES) throw new Error('Project file exceeds 20 MB');
      chunks.push(decoder.decode(chunk.value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return chunks.join('');
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}
