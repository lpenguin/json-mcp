import { JSONPath } from 'jsonpath-plus';

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
export function insertAtPath(data: any, path: string, newValue: any): any {
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
export function deleteAtPath(data: any, path: string): any {
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
