import { describe, it, expect } from 'vitest';
import { generateMockData } from '../src/model/mockGenerator';
import { SchemaModel } from '../src/model';

describe('Schema Mock Data Generator Suite', () => {
  it('generates sample data for primitive string formats', () => {
    expect(generateMockData({ type: 'string', format: 'email' })).toBe('alex@example.com');
    expect(generateMockData({ type: 'string', format: 'ipv4' })).toBe('192.168.1.1');
    expect(generateMockData({ type: 'string', format: 'uuid' })).toBe('a1b2c3d4-e5f6-7a8b-9c0d-ef1234567890');
    expect(generateMockData({ type: 'string', format: 'uri' })).toBe('https://api.example.com');
    expect(generateMockData({ type: 'string', format: 'byte' })).toBe('U3dhZ2dlciByb2Nrcw==');
  });

  it('respects example and default values', () => {
    expect(generateMockData({ type: 'string', example: 'CustomExample' })).toBe('CustomExample');
    expect(generateMockData({ type: 'integer', default: 42 })).toBe(42);
  });

  it('selects first enum value when enum constraint is present', () => {
    expect(generateMockData({ type: 'string', enum: ['active', 'inactive', 'pending'] })).toBe('active');
  });

  it('generates arrays adhering to minItems constraints', () => {
    const res = generateMockData({
      type: 'array',
      minItems: 3,
      items: { type: 'string' },
    }) as string[];

    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(3);
  });

  it('resolves schema references and handles composition', () => {
    const allSchemas: Record<string, SchemaModel> = {
      Address: {
        type: 'object',
        properties: {
          city: { type: 'string', example: 'San Francisco' },
        },
      },
      User: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Alice' },
          address: { type: 'object', refTarget: 'Address' },
        },
      },
    };

    const mockUser = generateMockData(allSchemas['User'], allSchemas) as any;
    expect(mockUser.name).toBe('Alice');
    expect(mockUser.address?.city).toBe('San Francisco');
  });

  it('prevents infinite recursion on recursive circular schemas', () => {
    const allSchemas: Record<string, SchemaModel> = {
      Node: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          next: { type: 'object', refTarget: 'Node' },
        },
      },
    };

    const res = generateMockData(allSchemas['Node'], allSchemas) as any;
    expect(res).toBeDefined();
    expect(typeof res).toBe('object');
  });
});
