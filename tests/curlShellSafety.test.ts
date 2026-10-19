import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { buildCurlCommand } from '../src/ui/CurlGenerator';
import { parseApiSpec } from '../src/parser';

// Execute only against a shell function that captures arguments; never invoke curl or a network.
function argumentsOf(command: string): string[] {
  return execFileSync('/bin/sh', ['-c', `curl() { printf '%s\\0' "$@"; }; ${command}`], {
    encoding: 'utf8',
  })
    .split('\0')
    .slice(0, -1);
}
const hostile = '$(printf EXPANDED)`printf EXPANDED`"\\\' ; & | > <';
function endpoint(contentType?: string) {
  return parseApiSpec(
    JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Safety', version: '1' },
      paths: {
        '/test': {
          post: {
            parameters: [
              { name: hostile, in: 'header', example: hostile, schema: { type: 'string' } },
            ],
            requestBody: contentType
              ? {
                  content: {
                    [contentType]: {
                      schema: { type: 'object', properties: { [hostile]: { type: 'string' } } },
                      example: { value: hostile },
                    },
                  },
                }
              : undefined,
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    })
  ).endpoints[0];
}

describe('cURL shell argument safety', () => {
  it('preserves URLs and full header arguments literally', () => {
    const url = `https://example.com/${hostile}`;
    const args = argumentsOf(buildCurlCommand(endpoint(), url));
    expect(args).toContain(`${url}/test`);
    expect(args).toContain(`${hostile}: ${hostile}`);
  });
  it.each(['multipart/form-data', 'application/x-www-form-urlencoded', 'application/json'])(
    'quotes %s payloads',
    (contentType) => {
      const args = argumentsOf(buildCurlCommand(endpoint(contentType), 'https://example.com'));
      if (contentType.includes('json')) {
        expect(JSON.parse(args[args.indexOf('-d') + 1])).toEqual({ value: hostile });
      } else {
        expect(args).toContain(`${hostile}=value`);
      }
    }
  );
  it.each(['header', 'cookie', 'query'] as const)('quotes API key names in %s', (location) => {
    const ep = endpoint();
    ep.security = [{ name: 'key', scopes: [] }];
    const args = argumentsOf(
      buildCurlCommand(ep, 'https://example.com', undefined, {
        key: { name: 'key', type: 'apiKey', in: location, paramName: hostile },
      })
    );
    expect(args).toContain(
      location === 'query'
        ? `https://example.com/test?${encodeURIComponent(hostile)}=YOUR_API_KEY`
        : `${hostile}${location === 'header' ? ': ' : '='}YOUR_API_KEY`
    );
  });
  it('quotes substituted server variables only once', () => {
    const args = argumentsOf(
      buildCurlCommand(endpoint(), 'https://example.com/{var}', {
        url: 'https://example.com/{var}',
        variables: { var: { default: hostile } },
      })
    );
    expect(args).toContain(`https://example.com/${hostile.replace(/ /g, '%20')}/test`);
  });
});
