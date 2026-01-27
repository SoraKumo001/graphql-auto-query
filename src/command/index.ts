#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

import { promises as fs } from "fs";
import path from "path";
import { buildClientSchema, getIntrospectionQuery } from "graphql/utilities";
import minimist from "minimist";
import "@colors/colors";
import { generate } from "..";

const readPackage = () => {
  try {
    return require(path.resolve(__dirname, "../../../package.json"));
  } catch {
    //
  }
  return require(path.resolve(__dirname, "../../package.json"));
};

const main = async () => {
  const argv = minimist(process.argv.slice(2));

  if (!argv._.length) {
    const pkg = readPackage();
    console.log(`${pkg.name} ${pkg.version}\n`.blue);
    console.log("USAGE".bold);
    console.log("\tcommand <path>");
    console.log("ARGUMENTS".bold);
    console.log(`\t<path> url or path of schema.graphql`);
    console.log("OPTIONS".bold);
    console.log(`\t-d, --depth Output depth levels`);
    console.log(`\t-o, --output output file path`);
  } else {
    const readSchema = (path: string) =>
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
            .then((res) => {
              return buildClientSchema(res.data);
            })
        : fs.readFile(path, "utf-8");

    const url = argv._[0];
    const output = argv.o ?? argv.output;
    const depth = argv.d ?? argv.depth;
    const schema = await readSchema(url);
    const text = generate(schema, depth);
    if (output) {
      const dir = path.dirname(output);
      await fs.mkdir(dir, { recursive: true });
      fs.writeFile(output, text);
    } else {
      console.log(text);
    }
  }
};

main();
