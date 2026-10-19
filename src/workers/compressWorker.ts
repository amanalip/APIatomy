import { SpecProject } from '../share/project';
import { prepareShare } from '../share/sharePreparation';

self.onmessage = (event: MessageEvent<{ project: SpecProject }>) => {
  try {
    self.postMessage({ result: prepareShare(event.data.project) });
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
};
