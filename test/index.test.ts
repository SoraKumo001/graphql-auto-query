import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { generate } from '../src/index';

describe('graphql-auto-query', () => {
  it('should generate queries from schema', () => {
    const source = readFileSync(join(__dirname, 'source.graphql'), 'utf-8');
    const expected = readFileSync(join(__dirname, 'output.graphql'), 'utf-8');
    
    // The test:generate script uses depth 5
    const result = generate(source, 5);
    
    expect(result.trim()).toBe(expected.trim());
  });
});
