# graphql-auto-query

## usage

|               |                    |                                 |
| ------------- | ------------------ | ------------------------------- |
| **USAGE**     | [option] _\<path>_ |                                 |
| **ARGUMENTS** | _\<path>_          | url or path of schema.graphql   |
| **OPTIONS**   | _-d, --depth_      | Output depth levels (default 2) |
|               | _-o, --output_     | output file path                |

```sh

# Standard output from server
graphql-auto-query http://localhost:3000/graphql

# Set output field hierarchy depth to 3
graphql-auto-query http://localhost:3000/graphql -d 3

# File output from local files
graphql-auto-query schema/schema.graphql -o query.graphql
```

## When used as a library

```ts
import fs from "fs";
import { generate } from "graphql-auto-query";

const schema = fs.read("schema.graphql");
console.log(generate(schema));
```
