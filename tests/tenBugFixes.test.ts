import { describe, it, expect } from 'vitest';
import { parseApiSpec } from '../src/parser';
import { buildCurlCommand } from '../src/ui/CurlGenerator';
import { isExternalRef } from '../src/parser/refResolver';

describe('Ten bug fixes verification', () => {
  it('bug 1: apiKey paramName preserved', () => {
    const spec = `
openapi: 3.0.0
info:
  title: Test
  version: 1.0.0
paths:
  /test:
    get:
      security:
        - ApiKeyAuth: []
      responses:
        '200':
          description: ok
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
`;
    const parsed = parseApiSpec(spec);
    const scheme = parsed.securitySchemes['ApiKeyAuth'];
    expect(scheme).toBeDefined();
    expect(scheme.type).toBe('apiKey');
    expect(scheme.paramName).toBe('X-API-Key');
    expect(scheme.name).toBe('ApiKeyAuth');
    const ep = parsed.endpoints[0];
    const cmd = buildCurlCommand(ep, 'https://api.example.com', undefined, parsed.securitySchemes);
    expect(cmd).toContain('X-API-Key: YOUR_API_KEY');
    expect(cmd).not.toContain('ApiKeyAuth: YOUR_API_KEY');
  });

  it('bug 2: security OR and AND preserved', () => {
    const spec = `
openapi: 3.0.0
info:
  title: Test
  version: 1.0.0
paths:
  /secure:
    get:
      security:
        - ApiKeyAuth: []
        - OAuth2: []
        - BearerAuth: []
      responses:
        '200':
          description: ok
  /optional:
    get:
      security:
        - {}
        - ApiKeyAuth: []
      responses:
        '200':
          description: ok
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
    OAuth2:
      type: oauth2
      flows:
        implicit:
          authorizationUrl: https://example.com/auth
          scopes: {}
    BearerAuth:
      type: http
      scheme: bearer
`;
    const parsed = parseApiSpec(spec);
    const ep = parsed.endpoints.find((e) => e.path === '/secure')!;
    expect(ep.securityAlternatives).toBeDefined();
    expect(ep.securityAlternatives!.length).toBe(3);
    expect(ep.securityAlternatives![0][0].name).toBe('ApiKeyAuth');
    const cmd = buildCurlCommand(ep, 'https://api.example.com', undefined, parsed.securitySchemes);
    expect(cmd).toContain('X-API-Key');
    expect(cmd).not.toContain('Authorization: Bearer');
    expect((cmd.match(/YOUR_API_KEY/g) || []).length).toBe(1);

    const opt = parsed.endpoints.find((e) => e.path === '/optional')!;
    expect(opt.securityAlternatives![0].length).toBe(0);
    expect(opt.securityAlternatives![1][0].name).toBe('ApiKeyAuth');
  });

  it('bug 2b: security AND group', () => {
    const spec = `
openapi: 3.0.0
info:
  title: Test
  version: 1.0.0
paths:
  /both:
    get:
      security:
        - ApiKeyAuth: []
          BearerAuth: []
      responses:
        '200':
          description: ok
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
    BearerAuth:
      type: http
      scheme: bearer
`;
    const parsed = parseApiSpec(spec);
    const ep = parsed.endpoints[0];
    expect(ep.securityAlternatives![0].length).toBe(2);
    const cmd = buildCurlCommand(ep, 'https://api.example.com', undefined, parsed.securitySchemes);
    expect(cmd).toContain('X-API-Key');
    expect(cmd).toContain('Authorization: Bearer');
  });

  it('bug 3: operation and path servers precedence', () => {
    const spec = `
openapi: 3.0.0
info:
  title: Test
  version: 1.0.0
servers:
  - url: https://root.example.com
paths:
  /a:
    servers:
      - url: https://path.example.com
    get:
      responses:
        '200':
          description: ok
  /b:
    get:
      servers:
        - url: https://op.example.com
      responses:
        '200':
          description: ok
  /c:
    get:
      responses:
        '200':
          description: ok
`;
    const parsed = parseApiSpec(spec);
    const a = parsed.endpoints.find((e) => e.path === '/a')!;
    const b = parsed.endpoints.find((e) => e.path === '/b')!;
    const c = parsed.endpoints.find((e) => e.path === '/c')!;
    expect(a.servers![0].url).toBe('https://path.example.com');
    expect(b.servers![0].url).toBe('https://op.example.com');
    expect(c.servers).toBeUndefined();
    const cmdA = buildCurlCommand(a, a.servers![0].url, a.servers![0]);
    expect(cmdA).toContain('https://path.example.com');
    const cmdB = buildCurlCommand(b, b.servers![0].url, b.servers![0]);
    expect(cmdB).toContain('https://op.example.com');
  });

  it('bug 4: allowReserved does not decode fragment and ampersand', () => {
    const spec = `
openapi: 3.0.0
info:
  title: Test
  version: 1.0.0
paths:
  /search:
    get:
      parameters:
        - name: q
          in: query
          allowReserved: true
          schema:
            type: string
          example: a#b&c+d
      responses:
        '200':
          description: ok
`;
    const parsed = parseApiSpec(spec);
    const ep = parsed.endpoints[0];
    const cmd = buildCurlCommand(ep, 'https://api.example.com', undefined, {});
    expect(cmd).toContain('q=a%23b%26c%2Bd');
    expect(cmd).not.toContain('q=a#b&c+d');
    const safe = buildCurlCommand(
      {
        ...ep,
        parameters: [{ ...ep.parameters[0], example: 'a:b/c[1]' }],
      },
      'https://api.example.com',
      undefined,
      {}
    );
    expect(safe).toContain('a:b/c[1]');
  });

  it('bug 5: path item $ref resolved', () => {
    const spec = `
openapi: 3.0.0
info:
  title: Test
  version: 1.0.0
paths:
  /pets:
    $ref: '#/components/pathItems/Pets'
components:
  pathItems:
    Pets:
      get:
        summary: List pets
        responses:
          '200':
            description: ok
`;
    const parsed = parseApiSpec(spec);
    expect(parsed.endpoints.length).toBe(1);
    expect(parsed.endpoints[0].path).toBe('/pets');
    expect(parsed.endpoints[0].method).toBe('get');
  });

  it('bug 6: schema $ref siblings preserved', () => {
    const spec = `
openapi: 3.0.0
info:
  title: Test
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Base'
                description: sibling description
                title: sibling title
components:
  schemas:
    Base:
      type: object
      properties:
        id:
          type: string
`;
    const parsed = parseApiSpec(spec);
    const schema = parsed.schemas['Base'];
    expect(schema).toBeDefined();
    const respSchema = parsed.endpoints[0].responses[0].content[0].schema!;
    expect(respSchema.$ref).toBe('#/components/schemas/Base');
    expect(respSchema.description).toBe('sibling description');
    expect(respSchema.title).toBe('sibling title');
    expect(respSchema.properties).toBeDefined();
    expect(respSchema.properties!['id']).toBeDefined();
  });

  it('bug 7: object query params serialized', () => {
    const specDeep = `
openapi: 3.0.0
info:
  title: Test
  version: 1.0.0
paths:
  /test:
    get:
      parameters:
        - name: filter
          in: query
          style: deepObject
          explode: true
          schema:
            type: object
            properties:
              r:
                type: string
              g:
                type: string
          example:
            r: "100"
            g: "200"
      responses:
        '200':
          description: ok
`;
    const parsedDeep = parseApiSpec(specDeep);
    const epDeep = parsedDeep.endpoints[0];
    const cmdDeep = buildCurlCommand(epDeep, 'https://api.example.com', undefined, {});
    expect(cmdDeep).toMatch(/filter(\[|%5B)r(\]|%5D)=100/);
    expect(cmdDeep).toMatch(/filter(\[|%5B)g(\]|%5D)=200/);

    const specForm = `
openapi: 3.0.0
info:
  title: Test
  version: 1.0.0
paths:
  /test:
    get:
      parameters:
        - name: id
          in: query
          style: form
          explode: true
          schema:
            type: object
            properties:
              r:
                type: string
              g:
                type: string
      responses:
        '200':
          description: ok
`;
    const parsedForm = parseApiSpec(specForm);
    const epForm = parsedForm.endpoints[0];
    const objParam = { ...epForm.parameters[0], example: { r: '100', g: '200' } };
    const cmdForm = buildCurlCommand({ ...epForm, parameters: [objParam] }, 'https://api.example.com', undefined, {});
    expect(cmdForm).toContain('r=100');
    expect(cmdForm).toContain('g=200');
    expect(cmdForm).not.toContain('%5Bobject%20Object%5D');
  });

  it('bug 8: external ref detection', () => {
    expect(isExternalRef('#/components/schemas/Pet')).toBe(false);
    expect(isExternalRef('./schemas.yaml#/components/schemas/Pet')).toBe(true);
    expect(isExternalRef('https://example.com/spec.yaml#/components/schemas/Pet')).toBe(true);
    expect(isExternalRef('schemas.yaml#/Pet')).toBe(true);
    const spec = `
openapi: 3.0.0
info:
  title: Test
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema:
                $ref: './other.yaml#/components/schemas/Other'
`;
    const parsed = parseApiSpec(spec);
    expect(parsed.endpoints[0].responses[0].content[0].schema!.description).toContain('External reference');
  });
});
