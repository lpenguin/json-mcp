import { describe, it, expect } from 'vitest';
import {
  searchInJSON,
  queryByPath,
  replaceAtPath,
  appendToArrayAtPath,
  setAtPath,
  deleteAtPath,
} from './tools.js';

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

  describe('appendToArray', () => {
    it('should append into array', () => {
      const newBook = {
        category: 'science',
        author: 'Carl Sagan',
        title: 'Cosmos',
        price: 15.99,
      };
      // append to the book array (path points to the array)
      const result = appendToArrayAtPath(sampleData, '$.store.book', newBook);
      expect(result.store.book).toHaveLength(4);
      expect(result.store.book[3]).toEqual(newBook);
    });

    it('should throw when path points to non-array', () => {
      const newValue = 42;
      expect(() =>
        appendToArrayAtPath(sampleData, '$.store.bicycle', newValue)
      ).toThrow();
    });
  });

  describe('set (upsert)', () => {
    it('should replace existing property', () => {
      const result = setAtPath(sampleData, '$.store.bicycle.color', 'blue');
      expect(result.store.bicycle.color).toBe('blue');
      expect(sampleData.store.bicycle.color).toBe('red');
    });

    it('should create a missing simple property when parent exists', () => {
      const result = setAtPath(sampleData, '$.store.bicycle.newKey', 'newVal');
      expect(result.store.bicycle.newKey).toBe('newVal');
    });

    it('should NOT create intermediate objects when parent chain is missing', () => {
      expect(() => setAtPath(sampleData, '$.newRoot.level1.level2.key', 123)).toThrow();
    });

    it('should only set the first matched parent (no applyToAllMatches)', () => {
      const data = { items: [{ a: 1 }, { a: 2 }] };
      const result = setAtPath(data, '$.items[*].newKey', 'x');
      expect(result.items[0].newKey).toBe('x');
      expect(result.items[1].newKey).toBeUndefined();
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
