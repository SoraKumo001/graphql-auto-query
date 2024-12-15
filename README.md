# graphql-auto-query

This project automatically generates GraphQL queries from GraphQL schemas.

[schema.graphql](https://raw.githubusercontent.com/SoraKumo001/graphql-auto-query/master/test/source.graphql) -> [query.graphql](https://raw.githubusercontent.com/SoraKumo001/graphql-auto-query/master/test/output.graphql)

## usage

|               |                    |                                 |
| ------------- | ------------------ | ------------------------------- |
| **USAGE**     | [option] _\<path>_ |                                 |
| **ARGUMENTS** | _\<path>_          | url or path of schema.graphql   |
| **OPTIONS**   | _-d, --depth_      | Output depth levels (default 2) |
|               | _-o, --output_     | output file path                |

### CLI

```sh
# Standard output from server
graphql-auto-query http://localhost:3000/graphql

# Set output field hierarchy depth to 3
graphql-auto-query http://localhost:3000/graphql -d 3

# File output from local files
graphql-auto-query schema/schema.graphql -o query.graphql

# other
graphql-auto-query https://beta.pokeapi.co/graphql/v1beta -o test/output2.graphql -d 1
graphql-auto-query https://graphqlpokemon.favware.tech/v8 -o test/output3.graphql -d 1

```

## library

```ts
import fs from "fs";
import { generate } from "graphql-auto-query";

const schema = fs.readFileSync("schema.graphql", "utf-8");
console.log(generate(schema));
```
