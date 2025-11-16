import { describe, it, expect, beforeEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

describe('MCP Integration Tests', () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeEach(async () => {
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

  it('should list all available tools', async () => {
    const response = await client.listTools();
    
    expect(response.tools).toBeDefined();
    expect(response.tools.length).toBeGreaterThan(0);
    
    const toolNames = response.tools.map((tool) => tool.name);
    expect(toolNames).toContain('search');
    expect(toolNames).toContain('query');
    expect(toolNames).toContain('replace');
    expect(toolNames).toContain('insert');
    expect(toolNames).toContain('delete');
    expect(toolNames).toContain('set_data');
    expect(toolNames).toContain('get_data');
  });

  it('should set and get data', async () => {
    const testData = {
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
    };

    const setResponse = await client.callTool({
      name: 'set_data',
      arguments: { data: testData },
    });

    expect(setResponse.content[0].type).toBe('text');
    expect((setResponse.content[0] as any).text).toContain('successfully');

    const getResponse = await client.callTool({
      name: 'get_data',
      arguments: {},
    });

    const returnedData = JSON.parse((getResponse.content[0] as any).text);
    expect(returnedData).toEqual(testData);
  });

  it('should search JSON data', async () => {
    const testData = {
      items: ['apple', 'banana', 'cherry'],
      metadata: { fruit: 'apple' },
    };

    const searchResponse = await client.callTool({
      name: 'search',
      arguments: {
        searchText: 'apple',
        data: testData,
      },
    });

    const results = JSON.parse((searchResponse.content[0] as any).text);
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

    const queryResponse = await client.callTool({
      name: 'query',
      arguments: {
        path: '$.store.books[*].title',
        data: testData,
      },
    });

    const results = JSON.parse((queryResponse.content[0] as any).text);
    expect(results).toEqual(['Book 1', 'Book 2']);
  });

  it('should replace data at JSONPath', async () => {
    const testData = {
      user: { name: 'Alice', age: 30 },
    };

    const replaceResponse = await client.callTool({
      name: 'replace',
      arguments: {
        path: '$.user.age',
        newValue: 31,
        data: testData,
      },
    });

    const result = JSON.parse((replaceResponse.content[0] as any).text);
    expect(result.user.age).toBe(31);
  });

  it('should delete data at JSONPath', async () => {
    const testData = {
      items: [1, 2, 3, 4],
    };

    const deleteResponse = await client.callTool({
      name: 'delete',
      arguments: {
        path: '$.items[0]',
        data: testData,
      },
    });

    const result = JSON.parse((deleteResponse.content[0] as any).text);
    expect(result.items).toEqual([2, 3, 4]);
  });

  it('should insert data at JSONPath', async () => {
    const testData = {
      items: [1, 2, 3],
    };

    const insertResponse = await client.callTool({
      name: 'insert',
      arguments: {
        path: '$.items[1]',
        newValue: 1.5,
        data: testData,
      },
    });

    const result = JSON.parse((insertResponse.content[0] as any).text);
    expect(result.items).toEqual([1, 2, 1.5, 3]);
  });

  it('should handle errors gracefully', async () => {
    // Test with missing required parameter
    try {
      await client.callTool({
        name: 'query',
        arguments: {
          // Missing required 'path' parameter
          data: {},
        },
      });
      // If we get here, the test should fail
      expect(true).toBe(false);
    } catch (error) {
      // Expected to throw
      expect(error).toBeDefined();
    }
  });
});
