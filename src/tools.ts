import { JSONPath } from 'jsonpath-plus';
import { readFileSync, writeFileSync } from 'fs';
import { JsonValue, JsonValueSchema } from './types.js';

// Helper function to read JSON from file
export function readJSONFile(filePath: string): JsonValue {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(content);
    return JsonValueSchema.parse(parsed);
  } catch (error) {
    throw new Error(`Failed to read or parse JSON file: ${error}`);
  }
}

// Helper function to write JSON to file
export function writeJSONFile(filePath: string, data: JsonValue): void {
  try {
    const content = JSON.stringify(data, null, 2);
    writeFileSync(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write JSON file: ${error}`);
  }
}

// Helper function to search text in JSON
export function searchInJSON(
  data: JsonValue,
  searchText: string,
  currentPath: string = '$'
): Array<{ path: string; value: JsonValue }> {
  const results: Array<{ path: string; value: JsonValue }> = [];
  const lowerSearchText = searchText.toLowerCase();

  function search(obj: JsonValue, path: string) {
    if (obj === null || obj === undefined) {
      return;
    }

    // For primitive values (string, number, boolean), check if they match
    if (typeof obj === 'string') {
      if (obj.toLowerCase().includes(lowerSearchText)) {
        results.push({ path, value: obj });
      }
    } else if (typeof obj === 'number' || typeof obj === 'boolean') {
      // Convert to string to check if the search text matches
      if (String(obj).toLowerCase().includes(lowerSearchText)) {
        results.push({ path, value: obj });
      }
    } else if (typeof obj === 'object' && obj !== null) {
      // For objects and arrays, recursively search children
      // Do NOT check the stringified object itself
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          search(item, `${path}[${index}]`);
        });
      } else {
        Object.keys(obj).forEach((key) => {
          search((obj)[key], `${path}.${key}`);
        });
      }
    }
  }

  search(data, currentPath);
  return results;
}

// Helper function to get value at JSONPath
export function queryByPath(data: JsonValue, path: string): JsonValue[] {
  try {
    return JSONPath({ path, json: data, wrap: true }) as JsonValue[];
  } catch (error) {
    throw new Error(`Invalid JSONPath: ${error}`);
  }
}

// Append to arrays only: path must select array node(s). Throws otherwise.
export function appendToArrayAtPath(data: JsonValue, path: string, newValue: JsonValue): JsonValue {
  const clonedData = JsonValueSchema.parse(JSON.parse(JSON.stringify(data)));

  try {
    const results = JSONPath({
      path,
      json: clonedData,
      resultType: 'all',
    }) as Array<{ value: JsonValue }>;

    results.forEach((result) => {
      const node = result.value;
      if (!Array.isArray(node)) {
        throw new Error('Path must point to array(s) to append into');
      }
      node.push(newValue);
    });

    return clonedData;
  } catch (error) {
    throw new Error(`Failed to append to array at path: ${error}`);
  }
}

// Set (upsert) value at JSONPath.
// Behavior:
// - If path matches existing nodes, replace the first match (or all matches if all=true).
// - If nothing matches, attempt to create the property on an existing parent node
//   (no intermediate creation). If parent not found, throw.
export function setAtPath(data: JsonValue, path: string, value: JsonValue, all = false): JsonValue {
  const clonedData = JsonValueSchema.parse(JSON.parse(JSON.stringify(data)));

  try {
    const results = JSONPath({ path, json: clonedData, resultType: 'all' }) as Array<{
      value: JsonValue;
      parent: JsonValue;
      parentProperty: string | number;
    }>;

    if (results.length > 0) {
      // If all=true, update all matches; otherwise just the first
      const resultsToUpdate = all ? results : [results[0]];
      
      resultsToUpdate.forEach((result) => {
        const parent = result.parent;
        const parentProperty = result.parentProperty;
        if (parent && parentProperty !== undefined) {
          if (Array.isArray(parent)) {
            parent[parentProperty as number] = value;
          } else if (typeof parent === 'object') {
            (parent as Record<string, JsonValue>)[parentProperty as string] = value;
          }
        }
      });
      
      return clonedData;
    }

    // No matches: attempt safe creation. Support simple JSONPath ending with a property.
    function splitParentAndKey(p: string): { parentPath: string; keyExpr: string } | null {
      let depth = 0;
      let inSingle = false;
      let inDouble = false;
      for (let i = p.length - 1; i >= 0; i--) {
        const ch = p[i];
        if (ch === ']' && !inSingle && !inDouble) depth++;
        else if (ch === '[' && !inSingle && !inDouble) depth--;
        else if (ch === "'" && !inDouble) inSingle = !inSingle;
        else if (ch === '"' && !inSingle) inDouble = !inDouble;

        if (ch === '.' && depth === 0 && !inSingle && !inDouble) {
          return { parentPath: p.slice(0, i), keyExpr: p.slice(i + 1) };
        }
      }
      return null;
    }

    const split = splitParentAndKey(path);
    if (!split) {
      throw new Error('set supports only JSONPath expressions with a final property segment');
    }

    const parentPath = split.parentPath || '$';
    const keyExpr = split.keyExpr;
    const bracketMatch = keyExpr.match(/^\[['\"]?([A-Za-z0-9_]+)['\"]?\]$/);
    const key = bracketMatch ? bracketMatch[1] : keyExpr.replace(/^\./, '');

    // Find parent nodes using JSONPath
    const parents = JSONPath({ path: parentPath, json: clonedData, wrap: true }) as JsonValue[];
    if (parents.length === 0) {
      throw new Error('Parent path not found');
    }

    // Only set on the first matched parent
    const parent = parents[0];
    if (typeof parent === 'object' && parent !== null && !Array.isArray(parent)) {
      (parent as Record<string, JsonValue>)[key] = value;
    } else {
      throw new Error('Parent must be an object to set a property');
    }

    return clonedData;
  } catch (error) {
    throw new Error(`Failed to set at path: ${error}`);
  }
}

// Helper function to delete value at JSONPath
export function deleteAtPath(data: JsonValue, path: string): JsonValue {
  const clonedData = JsonValueSchema.parse(JSON.parse(JSON.stringify(data)));

  try {
    const results = JSONPath({
      path,
      json: clonedData,
      resultType: 'all',
    }) as Array<{ value: JsonValue; parent: JsonValue; parentProperty: string | number }>;

    // Process in reverse order to maintain correct indices when deleting from arrays
    results.reverse().forEach((result) => {
      const parent = result.parent;
      const parentProperty = result.parentProperty;

      if (parent && parentProperty !== undefined) {
        if (Array.isArray(parent)) {
          parent.splice(parseInt(parentProperty as string), 1);
        } else if (typeof parent === 'object') {
          delete (parent as Record<string, JsonValue>)[parentProperty as string];
        }
      }
    });

    return clonedData;
  } catch (error) {
    throw new Error(`Failed to delete at path: ${error}`);
  }
}
