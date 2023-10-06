import fs from "fs";
import {
  buildSchema,
  GraphQLEnumType,
  GraphQLField,
  GraphQLFieldMap,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLType,
  GraphQLUnionType,
  Kind,
} from "graphql";

const lowercaseFirst = (str: string) =>
  str.charAt(0).toLowerCase() + str.slice(1);

const upperFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

const createSpaces = (num: number) => Array(num).fill(" ").join("");

class AutoQuery {
  schema: GraphQLSchema;
  types: GraphQLObjectType<any, any>[];
  fragments: {
    [key: string]: { name: string; value: GraphQLObjectType<any, any> };
  } = {};
  queries: { [key: string]: { name: string; value: string } } = {};

  constructor(schema: GraphQLSchema) {
    this.schema = schema;
    this.types = this.createTypes();
    this.createFragment();
    this.createQuery();
  }

  getBaseType(
    type: GraphQLOutputType
  ):
    | GraphQLEnumType
    | GraphQLInterfaceType
    | GraphQLUnionType
    | GraphQLScalarType<unknown, unknown>
    | GraphQLObjectType {
    if (type instanceof GraphQLNonNull) {
      return this.getBaseType(type.ofType);
    }
    if (type instanceof GraphQLList) {
      return this.getBaseType(type.ofType);
    }
    return type;
  }
  getFieldTypes(type: GraphQLType) {
    return type instanceof GraphQLObjectType ? type.getFields() : {};
  }

  isFields(rawType: GraphQLOutputType) {
    const type = this.getBaseType(rawType);
    const fieldMaps = this.getFieldTypes(type);
    return Object.entries(fieldMaps).length > 0;
  }

  createTypes() {
    return Object.values(this.schema.getTypeMap()).filter(
      (obj): obj is GraphQLObjectType =>
        obj.astNode?.kind === Kind.OBJECT_TYPE_DEFINITION
    );
  }

  createFragmentFields(
    fieldMaps: GraphQLFieldMap<any, any>,
    maxLevel: number,
    level = 0
  ): string {
    const fields = Object.values(fieldMaps).filter(({ args }) => !args.length);
    if (!fields.length || level >= maxLevel) return "";
    return [
      "{",
      ...fields.map(
        (field) =>
          `${createSpaces((level + 1) * 2)}${
            field.name
          }${this.createFragmentFields(
            this.getFieldTypes(this.getBaseType(field.type)),
            maxLevel,
            level + 1
          )}`
      ),
      `${createSpaces(level * 2)}}`,
    ].join("\n");
  }
  createOutputFields(
    field: GraphQLField<any, any>,
    argsMap: {
      [key: string]: string;
    },
    maxLevel: number,
    level = 0
  ): string {
    const type = this.getBaseType(field.type);
    const fieldMaps = this.getFieldTypes(type);
    const fields = Object.values(fieldMaps).filter(
      (field) =>
        field.args.length && (level <= maxLevel || !this.isFields(field.type))
    );

    const name = upperFirst(field.name);
    const fragment = this.fragments[type.name];
    return [
      `${createSpaces((level + 1) * 2)}${field.name}${
        field.args.length
          ? [
              "(",
              field.args
                .map((arg) => {
                  const argName = level
                    ? `${name}${upperFirst(arg.name)}`
                    : arg.name;
                  argsMap[argName] = arg.type.toString();
                  return `${createSpaces((level + 2) * 2)}${
                    arg.name
                  }: $${argName}`;
                })
                .join(",\n"),
              `${createSpaces((level + 1) * 2)})`,
            ].join("\n")
          : ""
      }${
        fragment || fields.length
          ? [
              " {",
              fragment
                ? `${createSpaces((level + 2) * 2)}...${
                    this.fragments[type.name].name
                  }`
                : [],
              fields.map((field) =>
                [
                  this.createOutputFields(field, argsMap, maxLevel, level + 1),
                ].join("\n")
              ),
              fragment || fields.length
                ? [`${createSpaces((level + 1) * 2)}}`]
                : [],
            ]
              .flat()
              .join("\n")
          : ""
      }`,
    ].join("\n");
  }
  createFragment() {
    this.types
      .filter(({ name }) => !["Query", "Mutation"].includes(name))
      .forEach((v) => {
        const name = lowercaseFirst(v.name);
        this.fragments[v.name] = { name, value: v };
      });
  }

  createOperation(operation: string, name: string, args: [string, string][]) {
    return `${operation} ${name}${
      args.length
        ? [
            "(",
            args.map(([name, type]) => `  $${name}: ${type}`).join(",\n"),
            ")",
          ].join("\n")
        : ""
    } {`;
  }
  createQuery() {
    Object.values(
      this.types.find(({ name }) => name === "Query")?.getFields() ?? {}
    ).forEach((v) => {
      const argsMap: { [key: string]: string } = {};
      const children = this.createOutputFields(v, argsMap, 2);
      const args = Object.entries(argsMap);
      this.queries[v.name] = {
        name: upperFirst(v.name),
        value:
          [
            this.createOperation("query", upperFirst(v.name), args),
            children,
            "}",
          ].join("\n") + "\n",
      };
    });
  }
  output() {
    console.log(
      Object.entries(this.fragments)
        .map(
          (v) =>
            `fragment ${v[1].name} on ${v[0]} ${this.createFragmentFields(
              v[1].value.getFields(),
              2
            )}\n`
        )
        .join("\n")
    );
    console.log(
      Object.values(this.queries)
        .map((v) => v.value)
        .join("\n")
    );
  }
}

const schemaText = fs.readFileSync("schema/schema.graphql", "utf-8");
const autoQuery = new AutoQuery(buildSchema(schemaText));
autoQuery.output();
