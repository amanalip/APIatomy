import React, { useState, useMemo } from 'react';
import { EndpointModel, ServerModel } from '../model';
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

  const activeServer = useMemo(() => {
    return servers.find((s) => s.url === selectedServerUrl) || servers[0];
  }, [servers, selectedServerUrl]);

  const curlCommand = useMemo(() => {
    let rawUrl = selectedServerUrl.replace(/\/$/, '');

    // Resolve server variables if present
    if (activeServer?.variables) {
      for (const [varName, varDef] of Object.entries(activeServer.variables)) {
        rawUrl = rawUrl.replace(`{${varName}}`, varDef.default || 'default');
      }
    }

    let normalizedPath = endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`;
    let url = rawUrl.replace(/\/+$/, '') + normalizedPath;

    // Substitute path parameters with placeholders
    for (const param of endpoint.parameters.filter((p) => p.in === 'path')) {
      const val = param.example !== undefined
        ? encodeURIComponent(String(param.example))
        : param.schema?.default !== undefined
          ? encodeURIComponent(String(param.schema.default))
          : `:${param.name}`;
      url = url.replace(`{${param.name}}`, val);
    }

    // Query parameters
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
              qParts.push(`${p.name}=${encodeURIComponent(String(item))}`);
            }
          } else {
            const joined = arrVal.map(String).join(',');
            qParts.push(`${p.name}=${encodeURIComponent(joined)}`);
          }
        } else {
          let val = p.example !== undefined
            ? p.example
            : p.schema?.default !== undefined
              ? p.schema.default
              : undefined;

          if (val === undefined) {
            if (p.schema?.type === 'boolean') {
              val = 'true';
            } else if (p.schema?.type === 'integer' || p.schema?.type === 'number') {
              val = p.schema.minimum !== undefined ? String(p.schema.minimum) : '1';
            } else {
              val = 'value';
            }
          }
          qParts.push(`${p.name}=${encodeURIComponent(String(val))}`);
        }
      }
      if (qParts.length > 0) {
        url += `?${qParts.join('&')}`;
      }
    }

    const lines: string[] = [`curl -X ${endpoint.method.toUpperCase()} "${url}"`];

    const hasExplicitAuthHeader = endpoint.parameters.some(
      (p) => p.in === 'header' && p.name.toLowerCase() === 'authorization'
    );
    const hasExplicitContentTypeHeader = endpoint.parameters.some(
      (p) => p.in === 'header' && p.name.toLowerCase() === 'content-type'
    );

    // Header parameters
    for (const header of endpoint.parameters.filter((p) => p.in === 'header')) {
      const val = header.example !== undefined
        ? header.example
        : header.schema?.default !== undefined
          ? header.schema.default
          : 'string';
      lines.push(`  -H "${header.name}: ${val}"`);
    }

    // Cookie parameters
    const cookieParams = endpoint.parameters.filter((p) => p.in === 'cookie');
    if (cookieParams.length > 0) {
      const cookieStr = cookieParams
        .map((c) => {
          const val = c.example !== undefined
            ? c.example
            : c.schema?.default !== undefined
              ? c.schema.default
              : 'value';
          return `${c.name}=${val}`;
        })
        .join('; ');
      lines.push(`  -b "${cookieStr}"`);
    }

    // Security header defaults (only if not already provided as explicit header param)
    if (endpoint.security.length > 0 && !hasExplicitAuthHeader) {
      const firstSec = endpoint.security[0];
      const secNameLower = firstSec.name.toLowerCase();
      if (secNameLower.includes('apikey') || secNameLower.includes('key')) {
        lines.push(`  -H "X-API-Key: YOUR_API_KEY"`);
      } else if (secNameLower.includes('basic')) {
        lines.push(`  -u "username:password"`);
      } else {
        lines.push(`  -H "Authorization: Bearer YOUR_TOKEN"`);
      }
    }

    // Request Body
    if (endpoint.requestBody && endpoint.requestBody.content.length > 0) {
      const primaryMedia = endpoint.requestBody.content[0];
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
          const sampleBody = primaryMedia.example
            ? JSON.stringify(primaryMedia.example, null, 2)
            : generateSampleJsonFromSchema(primaryMedia.schema);
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

function generateSampleJsonFromSchema(schema?: any): string {
  if (!schema) return '{}';
  if (schema.example) return JSON.stringify(schema.example, null, 2);

  if (schema.type === 'array') {
    if (schema.items) {
      if (schema.items.example) {
        return JSON.stringify([schema.items.example], null, 2);
      }
      if (schema.items.type === 'string') {
        return JSON.stringify(['string'], null, 2);
      }
      if (schema.items.type === 'number' || schema.items.type === 'integer') {
        return JSON.stringify([0], null, 2);
      }
      if (schema.items.type === 'boolean') {
        return JSON.stringify([true], null, 2);
      }
      if (schema.items.properties) {
        const itemObj: Record<string, unknown> = {};
        for (const [key, prop] of Object.entries(schema.items.properties as Record<string, any>)) {
          itemObj[key] = prop.example !== undefined ? prop.example : prop.type === 'number' ? 0 : 'string';
        }
        return JSON.stringify([itemObj], null, 2);
      }
    }
    return '[]';
  }

  const obj: Record<string, unknown> = {};
  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties as Record<string, any>)) {
      if (prop.example !== undefined) {
        obj[key] = prop.example;
      } else if (prop.type === 'string') {
        obj[key] = prop.format === 'email' ? 'user@example.com' : prop.enum ? prop.enum[0] : 'string';
      } else if (prop.type === 'integer' || prop.type === 'number') {
        obj[key] = 0;
      } else if (prop.type === 'boolean') {
        obj[key] = true;
      } else if (prop.type === 'array') {
        obj[key] = prop.items?.example ? [prop.items.example] : [];
      } else if (prop.type === 'object') {
        obj[key] = {};
      }
    }
  }

  return JSON.stringify(obj, null, 2);
}
