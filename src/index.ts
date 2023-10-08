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
    [key: string]: string;
  } = {};

  constructor(schema: GraphQLSchema) {
    this.schema = schema;
    this.types = this.createTypes();
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

  createFragmentFields(fieldMaps: GraphQLFieldMap<any, any>): string {
    const fields = Object.values(fieldMaps).filter(
      (field) => !field.args.length && !this.isFields(field.type)
    );
    return [
      "{",
      ...fields.map((field) => `${createSpaces(2)}${field.name}`),
      `}`,
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
    if (level > maxLevel) return "";
    const type = this.getBaseType(field.type);
    const fragment = this.fragments[type.name];
    const fieldMaps = this.getFieldTypes(type);
    const fields = Object.values(fieldMaps).filter(
      (field) => field.args.length || this.isFields(field.type)
    );

    const name = upperFirst(field.name);
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
                  const genName = this.generateName(argsMap, argName, false);
                  argsMap[genName] = arg.type.toString();
                  return `${createSpaces((level + 2) * 2)}${
                    arg.name
                  }: $${genName}`;
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
                    this.fragments[type.name]
                  }`
                : [],
              fields
                .map((field) =>
                  this.createOutputFields(field, argsMap, maxLevel, level + 1)
                )
                .filter((v) => v),
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
  generateName(
    target: { [key: string]: string },
    name: string,
    types: boolean
  ) {
    const values = new Set(Object.values(target));
    const typeNames = types
      ? new Set(this.types.map((v) => v.name))
      : undefined;
    let genName = lowercaseFirst(name);
    while (values.has(genName) || typeNames?.has(genName)) {
      genName = `${genName}_`;
    }
    return genName;
  }
  createFragment() {
    return this.types
      .filter(
        ({ name }) => !["Query", "Mutation", "Subscription"].includes(name)
      )
      .map((v) => {
        const name = this.generateName(this.fragments, v.name, true);
        this.fragments[v.name] = name;
        return `fragment ${name} on ${v.name} ${this.createFragmentFields(
          v.getFields()
        )}\n`;
      })
      .join("\n");
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

  createOperations(operation: string, maxLevel = 2) {
    const name = lowercaseFirst(operation);
    return Object.values(
      this.types.find(({ name }) => name === operation)?.getFields() ?? {}
    )
      .map((v) => {
        const argsMap: { [key: string]: string } = {};
        const children = this.createOutputFields(v, argsMap, maxLevel);
        const args = Object.entries(argsMap);

        return (
          [
            this.createOperation(name, upperFirst(v.name), args),
            children,
            "}",
          ].join("\n") + "\n"
        );
      })
      .join("\n");
  }

  generate(depth: number) {
    return [
      this.createFragment(),
      this.createOperations("Query", depth),
      this.createOperations("Mutation", depth),
      this.createOperations("Subscription", depth),
    ].join("\n");
  }
}

export const generate = (schema: string | GraphQLSchema, depth = 2) => {
  const autoQuery = new AutoQuery(
    schema instanceof GraphQLSchema ? schema : buildSchema(schema)
  );
  return autoQuery.generate(depth);
};
