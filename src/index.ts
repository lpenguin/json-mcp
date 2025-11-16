#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import {
  searchInJSON,
  queryByPath,
  replaceAtPath,
  insertAtPath,
  deleteAtPath,
  readJSONFile,
  writeJSONFile,
} from './tools.js';

// Create server instance
const server = new Server(
  {
    name: 'json-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
const tools: Tool[] = [
  {
    name: 'search',
    description: 'Search JSON data by simple text and return JSONPaths with context around matching elements',
    inputSchema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description: 'Path to the JSON file to search',
        },
        searchText: {
          type: 'string',
          description: 'Text to search for in the JSON data',
        },
      },
      required: ['file', 'searchText'],
    },
  },
  {
    name: 'query',
    description: 'Query JSON data by JSONPath and return matching elements',
    inputSchema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description: 'Path to the JSON file to query',
        },
        path: {
          type: 'string',
          description: 'JSONPath expression (e.g., "$.store.book[*].author")',
        },
      },
      required: ['file', 'path'],
    },
  },
  {
    name: 'replace',
    description: 'Replace element at JSONPath with new element',
    inputSchema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description: 'Path to the JSON file to modify',
        },
        path: {
          type: 'string',
          description: 'JSONPath expression pointing to the element to replace',
        },
        newValue: {
          description: 'New value to replace the element with',
        },
      },
      required: ['file', 'path', 'newValue'],
    },
  },
  {
    name: 'insert',
    description: 'Insert element after JSONPath (must be an object or array)',
    inputSchema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description: 'Path to the JSON file to modify',
        },
        path: {
          type: 'string',
          description: 'JSONPath expression pointing to the location to insert after',
        },
        newValue: {
          description: 'New value to insert',
        },
      },
      required: ['file', 'path', 'newValue'],
    },
  },
  {
    name: 'delete',
    description: 'Delete element at JSONPath',
    inputSchema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description: 'Path to the JSON file to modify',
        },
        path: {
          type: 'string',
          description: 'JSONPath expression pointing to the element to delete',
        },
      },
      required: ['file', 'path'],
    },
  },
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search': {
        const { file, searchText } = args as { file: string; searchText: string };
        const data = readJSONFile(file);
        const results = searchInJSON(data, searchText);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'query': {
        const { file, path } = args as { file: string; path: string };
        const data = readJSONFile(file);
        const results = queryByPath(data, path);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'replace': {
        const { file, path, newValue } = args as { file: string; path: string; newValue: any };
        const data = readJSONFile(file);
        const result = replaceAtPath(data, path, newValue);
        writeJSONFile(file, result);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'insert': {
        const { file, path, newValue } = args as { file: string; path: string; newValue: any };
        const data = readJSONFile(file);
        const result = insertAtPath(data, path, newValue);
        writeJSONFile(file, result);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'delete': {
        const { file, path } = args as { file: string; path: string };
        const data = readJSONFile(file);
        const result = deleteAtPath(data, path);
        writeJSONFile(file, result);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('JSON MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
