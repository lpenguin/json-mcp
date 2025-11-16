# json-mcp

A Model Context Protocol (MCP) server for querying and manipulating JSON data using JSONPath expressions.

## Features

This MCP server provides powerful tools for working with JSON data:

- **search**: Search JSON data by simple text and return JSONPaths with context around matching elements
- **query**: Query JSON data by JSONPath expressions
- **replace**: Replace element at JSONPath with new element
- **insert**: Insert element after JSONPath (must be an object or array)
- **delete**: Delete element at JSONPath
- **set_data**: Store JSON data in server memory
- **get_data**: Retrieve stored JSON data

## Installation

You can run this server using npx:

```bash
npx @lpenguin/json-mcp
```

Or install it globally:

```bash
npm install -g @lpenguin/json-mcp
```

## Usage

### As an MCP Server

Add to your MCP client configuration (e.g., Claude Desktop, Cline):

```json
{
  "mcpServers": {
    "@lpenguin/json-mcp": {
      "command": "npx",
      "args": ["-y", "@lpenguin/json-mcp"]
    }
  }
}
```

### Tool Examples

#### Search for text in JSON

```javascript
// Search for "apple" in the data
{
  "name": "search",
  "arguments": {
    "searchText": "apple",
    "data": {
      "items": ["apple", "banana", "cherry"],
      "metadata": { "fruit": "apple" }
    }
  }
}
```

#### Query by JSONPath

```javascript
// Get all book titles
{
  "name": "query",
  "arguments": {
    "path": "$.store.book[*].title",
    "data": {
      "store": {
        "book": [
          { "title": "Book 1", "price": 10 },
          { "title": "Book 2", "price": 20 }
        ]
      }
    }
  }
}
```

#### Replace data at path

```javascript
// Update a user's age
{
  "name": "replace",
  "arguments": {
    "path": "$.user.age",
    "newValue": 31,
    "data": { "user": { "name": "Alice", "age": 30 } }
  }
}
```

#### Insert data

```javascript
// Insert into array after first element
{
  "name": "insert",
  "arguments": {
    "path": "$.items[0]",
    "newValue": 1.5,
    "data": { "items": [1, 2, 3] }
  }
}
// Result: { "items": [1, 1.5, 2, 3] }
```

#### Delete data

```javascript
// Delete first item from array
{
  "name": "delete",
  "arguments": {
    "path": "$.items[0]",
    "data": { "items": [1, 2, 3, 4] }
  }
}
// Result: { "items": [2, 3, 4] }
```

## JSONPath Syntax

This server uses [jsonpath-plus](https://www.npmjs.com/package/jsonpath-plus) which supports the full JSONPath specification:

- `$` - Root node
- `@` - Current node
- `.` - Child operator
- `..` - Recursive descent
- `*` - Wildcard
- `[]` - Array subscript
- `[,]` - Union operator
- `[start:end:step]` - Array slice
- `?()` - Filter expression
- `()` - Script expression

### Examples:

- `$.store.book[*].author` - All authors
- `$..author` - All authors (recursive)
- `$.store.*` - All things in store
- `$.store..price` - All prices in store
- `$..book[?(@.price < 10)]` - All books cheaper than 10
- `$..book[-1:]` - Last book

## Development

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
npm run test:watch  # Watch mode
npm run test:ui     # UI mode
```

## License

MIT
