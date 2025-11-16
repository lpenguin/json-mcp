# json-mcp

A Model Context Protocol (MCP) server for querying and manipulating JSON data using JSONPath expressions.

## Features

This MCP server provides powerful tools for working with JSON files:

- **search**: Search JSON data in a file by simple text and return JSONPaths with context around matching elements
- **query**: Query JSON data in a file by JSONPath expressions
- **appendToArray**: Append element to array(s) selected by JSONPath
- **set**: Set (upsert) a value at a JSONPath. Can update a single match or all matches.
- **delete**: Delete element at JSONPath in a file

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

#### Search for text in JSON file

```javascript
// Search for "apple" in data.json
{
  "name": "search",
  "arguments": {
    "file": "/path/to/data.json",
    "searchText": "apple"
  }
}
```

#### Query by JSONPath

```javascript
// Get all book titles from books.json
{
  "name": "query",
  "arguments": {
    "file": "/path/to/books.json",
    "path": "$.store.book[*].title"
  }
}
```

#### Append to array

```javascript
// Append new item to array in items.json
{
  "name": "appendToArray",
  "arguments": {
    "file": "/path/to/items.json",
    "path": "$.items",
    "value": {"name": "new item", "price": 9.99}
  }
}
```

#### Set (upsert) data

```javascript
// Set or create a value at path in config.json (updates first match only)
{
  "name": "set",
  "arguments": {
    "file": "/path/to/config.json",
    "path": "$.settings.timeout",
    "value": 5000
  }
}

// Set value at all matching paths (when all=true)
{
  "name": "set",
  "arguments": {
    "file": "/path/to/data.json",
    "path": "$.items[*].price",
    "value": 9.99,
    "all": true
  }
}
```

#### Delete data

```javascript
// Delete first item from array in items.json
{
  "name": "delete",
  "arguments": {
    "file": "/path/to/items.json",
    "path": "$.items[0]"
  }
}
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
