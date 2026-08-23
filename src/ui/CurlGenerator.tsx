import React, { useState, useMemo } from 'react';
import { EndpointModel, ServerModel } from '../model';
import { generateMockData } from '../model/mockGenerator';
import { Copy, Check, Terminal } from 'lucide-react';
import { copyTextToClipboard } from '../share/urlHash';

interface CurlGeneratorProps {
  endpoint: EndpointModel;
  servers: ServerModel[];
}

export const CurlGenerator: React.FC<CurlGeneratorProps> = ({ endpoint, servers }) => {
  const [copied, setCopied] = useState(false);
  const [selectedServerUrl, setSelectedServerUrl] = useState<string>(
    servers[0]?.url || 'https://api.example.com'
  );

  // Sync selected server when available servers change (e.g., new spec loaded)
  React.useEffect(() => {
    if (servers.length === 0) return;
    const exists = servers.some((s) => s.url === selectedServerUrl);
    if (!exists) {
      setSelectedServerUrl(servers[0].url);
    }
  }, [servers, selectedServerUrl]);

  const activeServer = useMemo(() => {
    return servers.find((s) => s.url === selectedServerUrl) || servers[0];
  }, [servers, selectedServerUrl]);

  const curlCommand = useMemo(() => {
    return buildCurlCommand(endpoint, selectedServerUrl, activeServer);
  }, [endpoint, selectedServerUrl, activeServer]);

  const handleCopy = async () => {
    const success = await copyTextToClipboard(curlCommand);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 shadow-sm transition-colors duration-150">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-300">cURL Command</span>
        </div>

        <div className="flex items-center gap-2">
          {servers.length > 1 && (
            <select
              value={selectedServerUrl}
              onChange={(e) => setSelectedServerUrl(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] rounded px-2 py-0.5"
            >
              {servers.map((s) => (
                <option key={s.url} value={s.url}>
                  {s.url}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition shadow-sm"
            title="Copy curl command to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto whitespace-pre leading-relaxed border border-slate-800 shadow-inner">
        <code>{curlCommand}</code>
      </pre>
    </div>
  );
};

export function buildCurlCommand(
  endpoint: EndpointModel,
  selectedServerUrl: string,
  activeServer?: ServerModel
): string {
  let rawUrl = (selectedServerUrl || 'https://api.example.com').replace(/\/+$/, '');

  if (activeServer?.variables) {
    for (const [varName, varDef] of Object.entries(activeServer.variables)) {
      const defVal = (varDef as any)?.default;
      const replacement = defVal !== undefined && String(defVal).trim() !== '' ? String(defVal) : (varDef as any)?.enum?.[0] ?? 'default';
      rawUrl = rawUrl.split(`{${varName}}`).join(replacement);
    }
  }

  let normalizedPath = endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`;
  let url = rawUrl.replace(/\/+$/, '') + normalizedPath;

  for (const param of endpoint.parameters.filter((p) => p.in === 'path')) {
    const val = param.example !== undefined
      ? encodeURIComponent(String(param.example))
      : param.schema?.default !== undefined
        ? encodeURIComponent(String(param.schema.default))
        : `:${param.name}`;
    url = url.split(`{${param.name}}`).join(val);
  }

  const queryParams = endpoint.parameters.filter((p) => p.in === 'query');
  if (queryParams.length > 0) {
    const qParts: string[] = [];
    for (const p of queryParams) {
      if (p.schema?.type === 'array' || Array.isArray(p.example)) {
        const arrVal = Array.isArray(p.example)
          ? p.example
          : Array.isArray(p.schema?.default)
            ? (p.schema.default as unknown[])
            : ['value1', 'value2'];
        if (p.explode !== false) {
          for (const item of arrVal) {
            qParts.push(`${encodeURIComponent(p.name)}=${encodeURIComponent(String(item))}`);
          }
        } else {
          let delimiter = ',';
          if (p.style === 'spaceDelimited') delimiter = '%20';
          else if (p.style === 'pipeDelimited') delimiter = '|';
          // Encode each value individually and keep delimiter unencoded per OpenAPI spec
          const encodedVals = arrVal.map((v) => encodeURIComponent(String(v)));
          const joined = delimiter === '%20' ? encodedVals.join('%20') : encodedVals.join(delimiter);
          qParts.push(`${encodeURIComponent(p.name)}=${joined}`);
        }
      } else {
        let val = p.example !== undefined
          ? p.example
          : p.schema?.default !== undefined
            ? p.schema.default
            : undefined;
        if (val === undefined) {
          if (p.schema?.type === 'boolean') val = 'true';
          else if (p.schema?.type === 'integer' || p.schema?.type === 'number') {
            if (p.schema.minimum !== undefined) val = String(p.schema.minimum);
            else if (p.schema.maximum !== undefined && p.schema.maximum < 1) val = String(p.schema.maximum);
            else val = '1';
          } else val = 'value';
        }
        qParts.push(`${encodeURIComponent(p.name)}=${encodeURIComponent(String(val))}`);
      }
    }
    if (qParts.length > 0) url += `?${qParts.join('&')}`;
  }

  const lines: string[] = [`curl -X ${endpoint.method.toUpperCase()} "${url}"`];
  const hasExplicitAuthHeader = endpoint.parameters.some(
    (p) => p.in === 'header' && p.name.toLowerCase() === 'authorization'
  );
  const hasExplicitContentTypeHeader = endpoint.parameters.some(
    (p) => p.in === 'header' && p.name.toLowerCase() === 'content-type'
  );

  for (const header of endpoint.parameters.filter((p) => p.in === 'header')) {
    let val = header.example !== undefined
      ? header.example
      : header.schema?.default !== undefined
        ? header.schema.default
        : undefined;
    if (val === undefined) {
      if (header.schema?.format === 'uuid') val = '123e4567-e89b-12d3-a456-426614174000';
      else if (header.schema?.type === 'integer' || header.schema?.type === 'number') val = '1';
      else if (header.schema?.type === 'boolean') val = 'true';
      else val = 'string';
    }
    const sanitizedVal = String(val).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
    lines.push(`  -H "${header.name}: ${sanitizedVal}"`);
  }

  const cookieParams = endpoint.parameters.filter((p) => p.in === 'cookie');
  if (cookieParams.length > 0) {
    const cookieStr = cookieParams
      .map((c) => {
        const val = c.example !== undefined
          ? c.example
          : c.schema?.default !== undefined
            ? c.schema.default
            : 'value';
        return `${encodeURIComponent(c.name)}=${encodeURIComponent(String(val))}`;
      })
      .join('; ');
    lines.push(`  -b "${cookieStr}"`);
  }

  if (endpoint.security.length > 0 && !hasExplicitAuthHeader) {
    const seen = new Set<string>();
    for (const sec of endpoint.security) {
      if (seen.has(sec.name)) continue;
      seen.add(sec.name);
      const secNameLower = sec.name.toLowerCase();
      const isApiKey = secNameLower === 'apikey' || secNameLower.includes('api_key') || secNameLower.includes('api-key');
      const isBasic = secNameLower === 'basic' || secNameLower.includes('basic_auth') || secNameLower.includes('basic-auth');
      if (isApiKey) {
        lines.push(`  -H "X-API-Key: YOUR_API_KEY"`);
      } else if (isBasic) {
        lines.push(`  -u "username:password"`);
      } else {
        lines.push(`  -H "Authorization: Bearer YOUR_TOKEN"`);
      }
    }
  }

  if (endpoint.requestBody && endpoint.requestBody.content.length > 0) {
    // Prefer JSON if available, otherwise first content type
    const primaryMedia = endpoint.requestBody.content.find((c) => c.contentType.includes('json')) || endpoint.requestBody.content[0];
    const isMultipart = primaryMedia.contentType.includes('multipart/form-data');
    const isFormUrlEncoded = primaryMedia.contentType.includes('application/x-www-form-urlencoded');
    if (isMultipart) {
      if (primaryMedia.schema?.properties) {
        for (const [propKey, propVal] of Object.entries(primaryMedia.schema.properties)) {
          const isFile = propVal.format === 'binary' || (propVal.type as string) === 'file';
          lines.push(`  -F "${propKey}=${isFile ? '@filename.ext' : 'value'}"`);
        }
      } else {
        lines.push(`  -F "file=@filename.ext"`);
      }
    } else {
      if (!hasExplicitContentTypeHeader) {
        lines.push(`  -H "Content-Type: ${primaryMedia.contentType}"`);
      }
      if (primaryMedia.contentType.includes('json')) {
        const rawBody = primaryMedia.example
          ? JSON.stringify(primaryMedia.example, null, 2)
          : generateSampleJsonFromSchema(primaryMedia.schema);
        // Escape single quotes for shell: ' -> '\'' (close, escaped, reopen)
        const sampleBody = rawBody.replace(/'/g, `'\\''`);
        lines.push(`  -d '${sampleBody}'`);
      } else if (isFormUrlEncoded) {
        if (primaryMedia.schema?.properties) {
          const formFields = Object.keys(primaryMedia.schema.properties)
            .map((k) => `${k}=value`)
            .join('&');
          lines.push(`  --data-urlencode "${formFields || 'field=value'}"`);
        } else {
          lines.push(`  -d "field=value"`);
        }
      } else {
        lines.push(`  -d "field=value"`);
      }
    }
  }

  return lines.join(' \\\n');
}

export function generateSampleJsonFromSchema(schema?: any): string {
  if (!schema) return '{}';
  if (schema.example !== undefined) return JSON.stringify(schema.example, null, 2);
  try {
    const mock = generateMockData(schema as any, {}, 0);
    if (mock !== undefined) return JSON.stringify(mock, null, 2);
  } catch {
    // fallback to legacy generation below
  }
  if (schema.type === 'array') {
    if (schema.items?.example) return JSON.stringify([schema.items.example], null, 2);
    return '[]';
  }
  return '{}';
}
