import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { buildSchema, getIntrospectionQuery, graphql } from 'graphql';

describe('CLI Unit', () => {
  const originalArgv = process.argv;
  const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
  const commandPath = '../src/command/index';
  
  // Mock global fetch
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetModules();
    process.argv = [...originalArgv];
    consoleLog.mockClear();
    global.fetch = originalFetch;
  });

  afterEach(() => {
    process.argv = originalArgv;
    global.fetch = originalFetch;
  });

  it('should show help when no args provided', async () => {
    process.argv = ['node', 'cli']; // minimist slices 2, so result is empty
    await import(commandPath);
    const calls = consoleLog.mock.calls.flat().join('\n');
    expect(calls).toContain('USAGE');
  });

  it('should generate output file from file source', async () => {
    const sourcePath = path.join(__dirname, 'source.graphql');
    const outputPath = path.join(__dirname, 'unit_output.graphql');
    
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    process.argv = ['node', 'cli', sourcePath, '-o', outputPath, '-d', '5'];
    
    await import(commandPath);
    
    // Simple poll
    for (let i = 0; i < 10; i++) {
        if (fs.existsSync(outputPath)) break;
        await new Promise(r => setTimeout(r, 100));
    }
    
    expect(fs.existsSync(outputPath)).toBe(true);
    
    if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
    }
  });

  it('should output to stdout when no output file specified', async () => {
    const sourcePath = path.join(__dirname, 'source.graphql');
    process.argv = ['node', 'cli', sourcePath, '-d', '5']; // No -o
    
    await import(commandPath);
    
    // Wait for execution (simulated via short delay as we can't await main)
    await new Promise(r => setTimeout(r, 200));

    const calls = consoleLog.mock.calls.flat().join('\n');
    expect(calls).toContain('query FindUniqueUser');
  });

  it('should fetch schema from URL', async () => {
    const schema = buildSchema('type Query { helloFromUrl: String }');
    const result = await graphql({ schema, source: getIntrospectionQuery() });
    
    global.fetch = vi.fn().mockResolvedValue({
        json: async () => ({ data: result.data })
    } as any);

    process.argv = ['node', 'cli', 'http://example.com/graphql', '-d', '1'];
    
    await import(commandPath);

    await new Promise(r => setTimeout(r, 200));

    const calls = consoleLog.mock.calls.flat().join('\n');
    expect(calls).toContain('helloFromUrl');
    expect(global.fetch).toHaveBeenCalledWith('http://example.com/graphql', expect.anything());
  });
});
