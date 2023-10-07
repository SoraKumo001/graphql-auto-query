#!/usr/bin/env node

import fs from "fs";
import path from "path";
import minimist from "minimist";
import "@colors/colors";
import { generate } from "..";
import {
  buildClientSchema,
  getIntrospectionQuery,
  printSchema,
} from "graphql/utilities";

const main = async () => {
  const argv = minimist(process.argv.slice(2));

  if (!argv._.length) {
    const pkg = require(path.resolve(__dirname, "../../package.json"));
    console.log(`${pkg.name} ${pkg.version}\n`.blue);
    console.log("USAGE".bold);
    console.log("\tcommand <path>");
    console.log("ARGUMENTS".bold);
    console.log(`\t<path> url or path of schema.graphql`);
    console.log("OPTIONS".bold);
    console.log(`\t-d, --depth Output depth levels`);
    console.log(`\t-o, --output output file path`);
  } else {
    const readSchemaText = (path: string) =>
      path.match(/^https?:\/\//)
        ? fetch(path, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: getIntrospectionQuery() }),
          })
            .then((res) => res.json())
            .then((res) => printSchema(buildClientSchema(res.data)))
        : fs.readFileSync(path, "utf-8");

    const url = argv._[0];
    const output = argv.o ?? argv.output;
    const depth = argv.d ?? argv.depth;
    const schemaText = await readSchemaText(url);
    const text = await generate(schemaText, depth);
    if (output) {
      fs.writeFileSync(output, text);
    } else {
      console.log(text);
    }
  }
};

main();
