# json-mcp

A Model Context Protocol (MCP) server for querying and manipulating JSON data using JSONPath expressions.

## Features

This MCP server provides powerful tools for working with JSON files:

- **search**: Search JSON data in a file by simple text and return JSONPaths with context around matching elements
- **query**: Query JSON data in a file by JSONPath expressions
- **replace**: Replace element at JSONPath in a file with new element
- **append**: Append element to a parent object or array selected by JSONPath
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

#### Replace data at path

```javascript
// Update a user's age in users.json
{
  "name": "replace",
  "arguments": {
    "file": "/path/to/users.json",
    "path": "$.user.age",
    "newValue": 31
  }
}
```

#### Insert data

```javascript
// Insert into array after first element in items.json
{
  "name": "insert",
  "arguments": {
    "file": "/path/to/items.json",
    "path": "$.items[0]",
    "newValue": 1.5
  }
}
// Result: { "items": [1, 1.5, 2, 3] }
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
