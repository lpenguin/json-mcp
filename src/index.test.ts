import { describe, it, expect } from 'vitest';
import { JSONPath } from 'jsonpath-plus';

// Test data
const sampleData = {
  store: {
    book: [
      {
        category: 'reference',
        author: 'Nigel Rees',
        title: 'Sayings of the Century',
        price: 8.95,
      },
      {
        category: 'fiction',
        author: 'Evelyn Waugh',
        title: 'Sword of Honour',
        price: 12.99,
      },
      {
        category: 'fiction',
        author: 'Herman Melville',
        title: 'Moby Dick',
        isbn: '0-553-21311-3',
        price: 8.99,
      },
    ],
    bicycle: {
      color: 'red',
      price: 19.95,
    },
  },
};

// Helper functions from index.ts (extracted for testing)
function searchInJSON(
  data: any,
  searchText: string,
  currentPath: string = '$'
): Array<{ path: string; value: any; context: any }> {
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

function queryByPath(data: any, path: string): any[] {
  try {
    return JSONPath({ path, json: data, wrap: true });
  } catch (error) {
    throw new Error(`Invalid JSONPath: ${error}`);
  }
}

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
          const index = parseInt(parentProperty as string);
          parent.splice(index + 1, 0, newValue);
        } else if (typeof parent === 'object') {
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

describe('JSON MCP Server Tools', () => {
  describe('search', () => {
    it('should find matching text in strings', () => {
      const results = searchInJSON(sampleData, 'Moby');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.value === 'Moby Dick')).toBe(true);
    });

    it('should find matching text case-insensitively', () => {
      const results = searchInJSON(sampleData, 'moby');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find matching text in nested objects', () => {
      const results = searchInJSON(sampleData, 'fiction');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array when no matches found', () => {
      const results = searchInJSON(sampleData, 'nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('query', () => {
    it('should query by JSONPath and return matching elements', () => {
      const results = queryByPath(sampleData, '$.store.book[*].author');
      expect(results).toHaveLength(3);
      expect(results).toContain('Nigel Rees');
      expect(results).toContain('Evelyn Waugh');
      expect(results).toContain('Herman Melville');
    });

    it('should query single element', () => {
      const results = queryByPath(sampleData, '$.store.bicycle.color');
      expect(results).toEqual(['red']);
    });

    it('should query with filter', () => {
      const results = queryByPath(
        sampleData,
        '$.store.book[?(@.price < 10)].title'
      );
      expect(results).toHaveLength(2);
      expect(results).toContain('Sayings of the Century');
      expect(results).toContain('Moby Dick');
    });

    it('should return empty array for non-matching path', () => {
      const results = queryByPath(sampleData, '$.nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('replace', () => {
    it('should replace a single value', () => {
      const result = replaceAtPath(
        sampleData,
        '$.store.bicycle.color',
        'blue'
      );
      expect(result.store.bicycle.color).toBe('blue');
      // Original should be unchanged
      expect(sampleData.store.bicycle.color).toBe('red');
    });

    it('should replace multiple values', () => {
      const result = replaceAtPath(
        sampleData,
        '$.store.book[*].price',
        9.99
      );
      expect(result.store.book[0].price).toBe(9.99);
      expect(result.store.book[1].price).toBe(9.99);
      expect(result.store.book[2].price).toBe(9.99);
    });

    it('should replace object value', () => {
      const newBicycle = { color: 'green', price: 25.0 };
      const result = replaceAtPath(
        sampleData,
        '$.store.bicycle',
        newBicycle
      );
      expect(result.store.bicycle).toEqual(newBicycle);
    });
  });

  describe('insert', () => {
    it('should insert into array', () => {
      const newBook = {
        category: 'science',
        author: 'Carl Sagan',
        title: 'Cosmos',
        price: 15.99,
      };
      const result = insertAtPath(sampleData, '$.store.book[0]', newBook);
      expect(result.store.book).toHaveLength(4);
      expect(result.store.book[1]).toEqual(newBook);
    });

    it('should insert into object', () => {
      const result = insertAtPath(
        sampleData,
        '$.store.bicycle.color',
        'additional_value'
      );
      expect(result.store.bicycle.new_item).toBe('additional_value');
    });
  });

  describe('delete', () => {
    it('should delete array element', () => {
      const result = deleteAtPath(sampleData, '$.store.book[0]');
      expect(result.store.book).toHaveLength(2);
      expect(result.store.book[0].author).toBe('Evelyn Waugh');
    });

    it('should delete object property', () => {
      const result = deleteAtPath(sampleData, '$.store.bicycle.color');
      expect(result.store.bicycle.color).toBeUndefined();
      expect(result.store.bicycle.price).toBe(19.95);
    });

    it('should delete multiple elements', () => {
      const result = deleteAtPath(
        sampleData,
        '$.store.book[?(@.category == "fiction")]'
      );
      expect(result.store.book).toHaveLength(1);
      expect(result.store.book[0].category).toBe('reference');
    });
  });
});
