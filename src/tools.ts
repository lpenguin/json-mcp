import { JSONPath } from 'jsonpath-plus';
import { readFileSync, writeFileSync } from 'fs';

// Helper function to read JSON from file
export function readJSONFile(filePath: string): any {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read or parse JSON file: ${error}`);
  }
}

// Helper function to write JSON to file
export function writeJSONFile(filePath: string, data: any): void {
  try {
    const content = JSON.stringify(data, null, 2);
    writeFileSync(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write JSON file: ${error}`);
  }
}

// Helper function to search text in JSON
export function searchInJSON(data: any, searchText: string, currentPath: string = '$'): Array<{ path: string; value: any; context: any }> {
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
        context: parent,
      });
    }

    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          search(item, `${path}[${index}]`, obj);
        });
      } else {
        Object.keys(obj).forEach((key) => {
          search(obj[key], `${path}.${key}`, obj);
        });
      }
    }
  }

  search(data, currentPath, null);
  return results;
}

// Helper function to get value at JSONPath
export function queryByPath(data: any, path: string): any[] {
  try {
    return JSONPath({ path, json: data, wrap: true });
  } catch (error) {
    throw new Error(`Invalid JSONPath: ${error}`);
  }
}

// Helper function to replace value at JSONPath
export function replaceAtPath(data: any, path: string, newValue: any): any {
  const clonedData = JSON.parse(JSON.stringify(data));

  try {
    const results = JSONPath({
      path,
      json: clonedData,
      resultType: 'all',
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

// Append to arrays only: path must select array node(s). Throws otherwise.
export function appendToArrayAtPath(data: any, path: string, newValue: any): any {
  const clonedData = JSON.parse(JSON.stringify(data));

  try {
    const results = JSONPath({
      path,
      json: clonedData,
      resultType: 'all',
    });

    results.forEach((result: any) => {
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
// - If path matches existing nodes, replace the first match only.
// - If nothing matches, attempt to create the property on an existing parent node
//   (no intermediate creation). If parent not found, throw.
export function setAtPath(data: any, path: string, value: any): any {
  const clonedData = JSON.parse(JSON.stringify(data));

  try {
    const results = JSONPath({ path, json: clonedData, resultType: 'all' });

    if (results.length > 0) {
      const result = results[0];
      const parent = result.parent;
      const parentProperty = result.parentProperty;
      if (parent && parentProperty !== undefined) {
        parent[parentProperty] = value;
      }
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
    let keyExpr = split.keyExpr;
    const bracketMatch = keyExpr.match(/^\[['\"]?([A-Za-z0-9_]+)['\"]?\]$/);
    const key = bracketMatch ? bracketMatch[1] : keyExpr.replace(/^\./, '');

    // Find parent nodes using JSONPath
    const parents = JSONPath({ path: parentPath, json: clonedData, wrap: true });
    if (parents.length === 0) {
      throw new Error('Parent path not found');
    }

    // Only set on the first matched parent
    const parent = parents[0];
    parent[key] = value;

    return clonedData;
  } catch (error) {
    throw new Error(`Failed to set at path: ${error}`);
  }
}

// Helper function to delete value at JSONPath
export function deleteAtPath(data: any, path: string): any {
  const clonedData = JSON.parse(JSON.stringify(data));

  try {
    const results = JSONPath({
      path,
      json: clonedData,
      resultType: 'all',
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
