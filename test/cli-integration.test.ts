import { describe, it, expect, afterAll } from 'vitest';
import { exec } from 'child_process';
import { join } from 'path';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);
const commandPath = join(__dirname, '../src/command/index.ts');
const sourcePath = join(__dirname, 'source.graphql');
const outputPath = join(__dirname, 'cli_output.graphql');

describe('CLI', () => {
  afterAll(() => {
    if (existsSync(outputPath)) {
      unlinkSync(outputPath);
    }
  });

  it('should generate output file', async () => {
    // We use ts-node to run the command file
    // npx ts-node src/command/index.ts test/source.graphql -o test/cli_output.graphql -d 5
    const cmd = `npx ts-node "${commandPath}" "${sourcePath}" -o "${outputPath}" -d 5`;
    
    await execAsync(cmd);
    
    expect(existsSync(outputPath)).toBe(true);
    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toContain('query FindUniqueUser');
  }, 10000); // increase timeout for CLI execution

  it('should show help when no args provided', async () => {
    const cmd = `npx ts-node "${commandPath}"`;
    const { stdout } = await execAsync(cmd);
    
    expect(stdout).toContain('USAGE');
    expect(stdout).toContain('ARGUMENTS');
  });
});
