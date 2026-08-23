import { describe, it, expect } from 'vitest';
import { getMethodConfig, getStatusCategory } from '../src/model/httpMethods';
import { HttpMethod } from '../src/model';

describe('HTTP Methods and Status Codes Utilities Suite', () => {
  it('returns valid configurations for standard HTTP methods', () => {
    const standardMethods: HttpMethod[] = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'];

    for (const m of standardMethods) {
      const config = getMethodConfig(m);
      expect(config.label).toBe(m.toUpperCase());
      expect(config.badgeBg).toBeDefined();
      expect(config.text).toBeDefined();
      expect(config.border).toBeDefined();
      expect(config.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('provides fallback configuration for unknown or custom HTTP verbs', () => {
    const customConfig = getMethodConfig('propfind' as HttpMethod);
    expect(customConfig.label).toBe('PROPFIND');
    expect(customConfig.badgeBg).toBeDefined();
  });

  it('categorizes 2xx and wildcard 2XX status codes as Success', () => {
    expect(getStatusCategory(200).label).toBe('Success');
    expect(getStatusCategory('201').label).toBe('Success');
    expect(getStatusCategory('2XX').label).toBe('Success');
    expect(getStatusCategory('2xx').label).toBe('Success');
  });

  it('categorizes 4xx and wildcard 4XX status codes as Client Error', () => {
    expect(getStatusCategory(400).label).toBe('Client Error');
    expect(getStatusCategory('404').label).toBe('Client Error');
    expect(getStatusCategory('4XX').label).toBe('Client Error');
    expect(getStatusCategory('4xx').label).toBe('Client Error');
  });

  it('categorizes 5xx, 3xx, and default status codes correctly', () => {
    expect(getStatusCategory(500).label).toBe('Server Error');
    expect(getStatusCategory(302).label).toBe('Redirect');
    expect(getStatusCategory('default').label).toBe('Default');
  });
});
