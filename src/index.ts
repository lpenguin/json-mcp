#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { JSONPath } from 'jsonpath-plus';

// In-memory JSON data store
let jsonData: any = {};

// Helper function to search text in JSON
function searchInJSON(data: any, searchText: string, currentPath: string = '$'): Array<{ path: string; value: any; context: any }> {
  const results: Array<{ path: string; value: any; context: any }> = [];
  
  function search(obj: any, path: string, parent: any = null) {
    if (obj === null || obj === undefined) {
      return;
    }
    
    const objString = typeof obj === 'string' ? obj : JSON.stringify(obj);
    if (objString.toLowerCase().includes(searchText.toLowerCase())) {
      results.push({
        path,
        value: obj,
        context: parent
      });
    }
    
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          search(item, `${path}[${index}]`, obj);
        });
      } else {
        Object.keys(obj).forEach(key => {
          search(obj[key], `${path}.${key}`, obj);
        });
      }
    }
  }
  
  search(data, currentPath, null);
  return results;
}

// Helper function to get value at JSONPath
function queryByPath(data: any, path: string): any[] {
  try {
    return JSONPath({ path, json: data, wrap: true });
  } catch (error) {
    throw new Error(`Invalid JSONPath: ${error}`);
  }
}

// Helper function to replace value at JSONPath
function replaceAtPath(data: any, path: string, newValue: any): any {
  const clonedData = JSON.parse(JSON.stringify(data));
  
  try {
    const results = JSONPath({
      path,
      json: clonedData,
      resultType: 'all'
    });
    
    results.forEach((result: any) => {
      const parent = result.parent;
      const parentProperty = result.parentProperty;
      
      if (parent && parentProperty !== undefined) {
        parent[parentProperty] = newValue;
      }
    });
    
    return clonedData;
  } catch (error) {
    throw new Error(`Failed to replace at path: ${error}`);
  }
}

// Helper function to insert value after JSONPath
function insertAtPath(data: any, path: string, newValue: any): any {
  const clonedData = JSON.parse(JSON.stringify(data));
  
  try {
    const results = JSONPath({
      path,
      json: clonedData,
      resultType: 'all'
    });
    
    // Process in reverse order to maintain correct indices when inserting into arrays
    results.reverse().forEach((result: any) => {
      const parent = result.parent;
      const parentProperty = result.parentProperty;
      
      if (parent && parentProperty !== undefined) {
        if (Array.isArray(parent)) {
          // Insert after the current index
          const index = parseInt(parentProperty as string);
          parent.splice(index + 1, 0, newValue);
        } else if (typeof parent === 'object') {
          // For objects, we can't insert "after" in a meaningful way
          // So we'll add it as a new property with a generated key
          let newKey = 'new_item';
          let counter = 0;
          while (parent[newKey] !== undefined) {
            newKey = `new_item_${counter++}`;
          }
          
          parent[newKey] = newValue;
        }
      }
    });
    
    return clonedData;
  } catch (error) {
    throw new Error(`Failed to insert at path: ${error}`);
  }
}

// Helper function to delete value at JSONPath
function deleteAtPath(data: any, path: string): any {
  const clonedData = JSON.parse(JSON.stringify(data));
  
  try {
    const results = JSONPath({
      path,
      json: clonedData,
      resultType: 'all'
    });
    
    // Process in reverse order to maintain correct indices when deleting from arrays
    results.reverse().forEach((result: any) => {
      const parent = result.parent;
      const parentProperty = result.parentProperty;
      
      if (parent && parentProperty !== undefined) {
        if (Array.isArray(parent)) {
          parent.splice(parseInt(parentProperty as string), 1);
        } else {
          delete parent[parentProperty];
        }
      }
    });
    
    return clonedData;
  } catch (error) {
    throw new Error(`Failed to delete at path: ${error}`);
  }
}

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
