# graphql-auto-query

[![](https://img.shields.io/npm/l/graphql-auto-query)](https://www.npmjs.com/package/graphql-auto-query)
[![](https://img.shields.io/npm/v/graphql-auto-query)](https://www.npmjs.com/package/graphql-auto-query)
[![](https://img.shields.io/npm/dw/graphql-auto-query)](https://www.npmjs.com/package/graphql-auto-query)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/node-libraries/graphql-auto-query)

`graphql-auto-query` is a powerful tool and library for automatically generating GraphQL queries, mutations, and subscriptions from a GraphQL schema. It simplifies the testing and introspection process by creating comprehensive query documents based on your schema definitions.

It supports generating queries from both local `.graphql` schema files and remote GraphQL endpoints (via introspection).

[schema.graphql](https://raw.githubusercontent.com/SoraKumo001/graphql-auto-query/master/test/source.graphql) -> [query.graphql](https://raw.githubusercontent.com/SoraKumo001/graphql-auto-query/master/test/output.graphql)

## Features

- **Automatic Generation**: Generates `Query`, `Mutation`, and `Subscription` operations.
- **Depth Control**: precise control over the nesting depth of generated queries.
- **Granular Depth**: Configure different depths for queries, mutations, and subscriptions independently.
- **Dual Mode**: Use it as a CLI tool or as a library in your Node.js projects.
- **Remote & Local**: Supports loading schemas from local files or fetching from remote URLs.

## CLI Usage

The CLI tool allows you to generate queries directly from your terminal.

| Command                     | Description                                             |
| :-------------------------- | :------------------------------------------------------ |
| `graphql-auto-query <path>` | Generate queries from the specified schema path or URL. |

### Arguments

| Argument | Description                                                                                   |
| :------- | :-------------------------------------------------------------------------------------------- |
| `<path>` | The file path to a local schema file (e.g., `schema.graphql`) or a URL to a GraphQL endpoint. |

### Options

| Option                | Alias | Description                                                        | Default  |
| :-------------------- | :---- | :----------------------------------------------------------------- | :------- |
| `--depth`             | `-d`  | The maximum depth of the generated queries.                        | `2`      |
| `--queryDepth`        |       | Specific depth for `Query` operations. Overrides `--depth`.        | `depth`  |
| `--mutationDepth`     |       | Specific depth for `Mutation` operations. Overrides `--depth`.     | `depth`  |
| `--subscriptionDepth` |       | Specific depth for `Subscription` operations. Overrides `--depth`. | `depth`  |
| `--output`            | `-o`  | The output file path. If not specified, prints to stdout.          | `stdout` |

### Examples

**1. Generate queries from a local schema file:**

```bash
graphql-auto-query schema.graphql -o query.graphql
```

**2. Generate queries from a remote GraphQL endpoint:**

```bash
graphql-auto-query http://localhost:3000/graphql -o query.graphql
```

**3. Control the nesting depth (default is 2):**

```bash
# Set global depth to 3
graphql-auto-query http://localhost:3000/graphql -d 3
```

**4. Granular control over operation depths:**

```bash
# Set query depth to 3, mutation to 1, and use default for subscription
graphql-auto-query http://localhost:3000/graphql --queryDepth 3 --mutationDepth 1
```

## Library Usage

You can also use `graphql-auto-query` programmatically within your Node.js applications.

```typescript
import fs from "fs";
import { generate } from "graphql-auto-query";

// Read schema from a file
const schema = fs.readFileSync("schema.graphql", "utf-8");

// 1. Simple usage with default options (depth: 2)
const query = generate(schema);
console.log(query);

// 2. Usage with global depth configuration
const deepQuery = generate(schema, 4);
console.log(deepQuery);

// 3. Advanced usage with granular depth configuration
const customQuery = generate(schema, {
  depth: 2, // Global fallback depth
  queryDepth: 3, // Specific depth for queries
  mutationDepth: 1, // Specific depth for mutations
  subscriptionDepth: 1, // Specific depth for subscriptions
});
console.log(customQuery);
```

## License

MIT
