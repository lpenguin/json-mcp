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
} from './tools.js';

// In-memory JSON data store
let jsonData: any = {};

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
        searchText: {
          type: 'string',
          description: 'Text to search for in the JSON data',
        },
        data: {
          type: 'object',
          description: 'Optional JSON data to search. If not provided, uses the stored data.',
        },
      },
      required: ['searchText'],
    },
  },
  {
    name: 'query',
    description: 'Query JSON data by JSONPath and return matching elements',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'JSONPath expression (e.g., "$.store.book[*].author")',
        },
        data: {
          type: 'object',
          description: 'Optional JSON data to query. If not provided, uses the stored data.',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'replace',
    description: 'Replace element at JSONPath with new element',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'JSONPath expression pointing to the element to replace',
        },
        newValue: {
          description: 'New value to replace the element with',
        },
        data: {
          type: 'object',
          description: 'Optional JSON data to modify. If not provided, uses and updates the stored data.',
        },
      },
      required: ['path', 'newValue'],
    },
  },
  {
    name: 'insert',
    description: 'Insert element after JSONPath (must be an object or array)',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'JSONPath expression pointing to the location to insert after',
        },
        newValue: {
          description: 'New value to insert',
        },
        data: {
          type: 'object',
          description: 'Optional JSON data to modify. If not provided, uses and updates the stored data.',
        },
      },
      required: ['path', 'newValue'],
    },
  },
  {
    name: 'delete',
    description: 'Delete element at JSONPath',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'JSONPath expression pointing to the element to delete',
        },
        data: {
          type: 'object',
          description: 'Optional JSON data to modify. If not provided, uses and updates the stored data.',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'set_data',
    description: 'Set the JSON data to work with',
    inputSchema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          description: 'JSON data to store',
        },
      },
      required: ['data'],
    },
  },
  {
    name: 'get_data',
    description: 'Get the currently stored JSON data',
    inputSchema: {
      type: 'object',
      properties: {},
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
        const { searchText, data } = args as { searchText: string; data?: any };
        const dataToSearch = data || jsonData;
        const results = searchInJSON(dataToSearch, searchText);
        
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
        const { path, data } = args as { path: string; data?: any };
        const dataToQuery = data || jsonData;
        const results = queryByPath(dataToQuery, path);
        
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
        const { path, newValue, data } = args as { path: string; newValue: any; data?: any };
        const dataToModify = data || jsonData;
        const result = replaceAtPath(dataToModify, path, newValue);
        
        if (!data) {
          jsonData = result;
        }
        
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
        const { path, newValue, data } = args as { path: string; newValue: any; data?: any };
        const dataToModify = data || jsonData;
        const result = insertAtPath(dataToModify, path, newValue);
        
        if (!data) {
          jsonData = result;
        }
        
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
        const { path, data } = args as { path: string; data?: any };
        const dataToModify = data || jsonData;
        const result = deleteAtPath(dataToModify, path);
        
        if (!data) {
          jsonData = result;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'set_data': {
        const { data } = args as { data: any };
        jsonData = data;
        
        return {
          content: [
            {
              type: 'text',
              text: 'Data stored successfully',
            },
          ],
        };
      }

      case 'get_data': {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(jsonData, null, 2),
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
