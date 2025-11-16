import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('MCP Integration Tests', () => {
  let client: Client;
  let transport: StdioClientTransport;
  let testDir: string;

  beforeEach(async () => {
    // Create temporary directory for test files
    testDir = mkdtempSync(join(tmpdir(), 'json-mcp-test-'));

    // Start the MCP server
    const serverProcess = spawn('tsx', ['src/index.ts'], {
      cwd: process.cwd(),
    });

    transport = new StdioClientTransport({
      command: 'tsx',
      args: ['src/index.ts'],
    });

    client = new Client(
      {
        name: 'test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
  });

  afterEach(() => {
    // Clean up temporary directory
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should list all available tools', async () => {
    const response = await client.listTools();
    
    expect(response.tools).toBeDefined();
    expect(response.tools.length).toBe(6); // Now 6 tools (added set)
    
    const toolNames = response.tools.map((tool) => tool.name);
    expect(toolNames).toContain('search');
    expect(toolNames).toContain('query');
    expect(toolNames).toContain('replace');
    expect(toolNames).toContain('appendToArray');
    expect(toolNames).toContain('delete');
    expect(toolNames).toContain('set');
  });

  it('should search JSON data', async () => {
    const testData = {
      items: ['apple', 'banana', 'cherry'],
      metadata: { fruit: 'apple' },
    };
    
    const testFile = join(testDir, 'test-search.json');
    writeFileSync(testFile, JSON.stringify(testData, null, 2));

    const searchResponse = await client.callTool({
      name: 'search',
      arguments: {
        file: testFile,
        searchText: 'apple',
      },
    });

    const results = JSON.parse(((searchResponse as any).content[0] as any).text);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should query JSON data by JSONPath', async () => {
    const testData = {
      store: {
        books: [
          { title: 'Book 1', price: 10 },
          { title: 'Book 2', price: 20 },
        ],
      },
    };
    
    const testFile = join(testDir, 'test-query.json');
    writeFileSync(testFile, JSON.stringify(testData, null, 2));

    const queryResponse = await client.callTool({
      name: 'query',
      arguments: {
        file: testFile,
        path: '$.store.books[*].title',
      },
    });

  const results = JSON.parse(((queryResponse as any).content[0] as any).text);
    expect(results).toEqual(['Book 1', 'Book 2']);
  });

  it('should replace data at JSONPath', async () => {
    const testData = {
      user: { name: 'Alice', age: 30 },
    };
    
    const testFile = join(testDir, 'test-replace.json');
    writeFileSync(testFile, JSON.stringify(testData, null, 2));

    const replaceResponse = await client.callTool({
      name: 'replace',
      arguments: {
        file: testFile,
        path: '$.user.age',
        newValue: 31,
      },
    });

  const result = JSON.parse(((replaceResponse as any).content[0] as any).text);
    expect(result.user.age).toBe(31);
  });

  it('should delete data at JSONPath', async () => {
    const testData = {
      items: [1, 2, 3, 4],
    };
    
    const testFile = join(testDir, 'test-delete.json');
    writeFileSync(testFile, JSON.stringify(testData, null, 2));

    const deleteResponse = await client.callTool({
      name: 'delete',
      arguments: {
        file: testFile,
        path: '$.items[0]',
      },
    });

  const result = JSON.parse(((deleteResponse as any).content[0] as any).text);
    expect(result.items).toEqual([2, 3, 4]);
  });

  it('should append data at JSONPath', async () => {
    const testData = {
      items: [1, 2, 3],
    };
    
  const testFile = join(testDir, 'test-append.json');
    writeFileSync(testFile, JSON.stringify(testData, null, 2));

    const insertResponse = await client.callTool({
      name: 'appendToArray',
      arguments: {
        file: testFile,
        path: '$.items',
        newValue: 1.5,
      },
    });

  const result = JSON.parse(((insertResponse as any).content[0] as any).text);
    // append semantics: newValue is added to the end of the array
    expect(result.items).toEqual([1, 2, 3, 1.5]);
  });

  it('should handle errors gracefully', async () => {
    // Test with missing required parameter
    try {
      await client.callTool({
        name: 'query',
        arguments: {
          // Missing required 'file' and 'path' parameters
        },
      });
      // If we get here, the test should fail
      expect(true).toBe(false);
    } catch (error) {
      // Expected to throw
      expect(error).toBeDefined();
    }
  });

  describe('invalid parameters', () => {
    it('search should error when missing searchText', async () => {
      const testFile = join(testDir, 'test-invalid-search.json');
      writeFileSync(testFile, JSON.stringify({ a: 1 }, null, 2));

      const resp = await client.callTool({
        name: 'search',
        arguments: { file: testFile }, // missing searchText
      });

      expect(resp).toBeDefined();
      expect(resp.isError).toBe(true);
  expect(((resp as any).content[0] as any).text).toContain('Missing required parameter: searchText');
    });

    it('query should error when missing file', async () => {
      const resp = await client.callTool({
        name: 'query',
        arguments: { path: '$.a' }, // missing file
      });

      expect(resp).toBeDefined();
      expect(resp.isError).toBe(true);
  expect(((resp as any).content[0] as any).text).toContain('Missing required parameter: file');
    });

    it('replace should error when missing newValue', async () => {
      const testFile = join(testDir, 'test-invalid-replace.json');
      writeFileSync(testFile, JSON.stringify({ user: { age: 1 } }, null, 2));
      const resp = await client.callTool({
        name: 'replace',
        arguments: { file: testFile, path: '$.user.age' }, // missing newValue
      });

      expect(resp).toBeDefined();
      expect(resp.isError).toBe(true);
  expect(((resp as any).content[0] as any).text).toContain('Missing required parameter: newValue');
    });

    it('appendToArray should error when missing path', async () => {
      const testFile = join(testDir, 'test-invalid-insert.json');
      writeFileSync(testFile, JSON.stringify({ items: [1] }, null, 2));
      const resp = await client.callTool({
        name: 'appendToArray',
        arguments: { file: testFile, newValue: 2 }, // missing path
      });

      expect(resp).toBeDefined();
      expect(resp.isError).toBe(true);
  expect(((resp as any).content[0] as any).text).toContain('Missing required parameter: path');
    });

    it('delete should error when missing path', async () => {
      const testFile = join(testDir, 'test-invalid-delete.json');
      writeFileSync(testFile, JSON.stringify({ items: [1] }, null, 2));
      const resp = await client.callTool({
        name: 'delete',
        arguments: { file: testFile }, // missing path
      });

      expect(resp).toBeDefined();
      expect(resp.isError).toBe(true);
  expect(((resp as any).content[0] as any).text).toContain('Missing required parameter: path');
    });
  });
});
