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

/**
 * Convert the first character of a string to lowercase
 * @param str Input string
 * @returns String with first character in lowercase
 */
const lowercaseFirst = (str: string) =>
  str.charAt(0).toLowerCase() + str.slice(1);

/**
 * Convert the first character of a string to uppercase
 * @param str Input string
 * @returns String with first character in uppercase
 */
const upperFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Create a string of spaces
 * @param num Number of spaces
 * @returns String of spaces
 */
const createSpaces = (num: number) => Array(num).fill(" ").join("");

/**
 * Class representing an auto query generator
 */
class AutoQuery {
  schema: GraphQLSchema;
  types: GraphQLObjectType<any, any>[];
  fragments: {
    [key: string]: string;
  } = {};

  /**
   * Create an instance of AutoQuery
   * @param schema GraphQL schema
   */
  constructor(schema: GraphQLSchema) {
    this.schema = schema;
    this.types = this.createTypes();
  }

  /**
   * Get the base type of a GraphQL output type
   * @param type GraphQL output type
   * @returns Base type
   */
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

  /**
   * Get the field types of a GraphQL type
   * @param type GraphQL type
   * @returns Field types
   */
  getFieldTypes(type: GraphQLType) {
    return type instanceof GraphQLObjectType ? type.getFields() : {};
  }

  /**
   * Check if a GraphQL output type is a fields type
   * @param rawType GraphQL output type
   * @returns Whether the type is a fields type
   */
  isFields(rawType: GraphQLOutputType) {
    const type = this.getBaseType(rawType);
    const fieldMaps = this.getFieldTypes(type);
    return Object.entries(fieldMaps).length > 0;
  }

  /**
   * Create an array of GraphQL object types from the schema
   * @returns Array of GraphQL object types
   */
  createTypes() {
    return Object.values(this.schema.getTypeMap()).filter(
      (obj): obj is GraphQLObjectType =>
        obj.astNode?.kind === Kind.OBJECT_TYPE_DEFINITION
    );
  }

  /**
   * Create a string of fields for a GraphQL fragment
   * @param fieldMaps Field maps
   * @returns String of fields
   */
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

  /**
   * Generate a unique name for a GraphQL argument
   * @param target Object containing existing argument names
   * @param name Argument name
   * @returns Unique argument name
   */
  generateArgsName(target: { [key: string]: string }, name: string) {
    const values = new Set(Object.keys(target));
    const baseName = lowercaseFirst(name);
    let genName = baseName;
    for (let count = 1; values.has(genName); count++) {
      genName = `${baseName}${count <= 1 ? "" : count}`;
    }
    return genName;
  }

  /**
   * Create a string of output fields for a GraphQL field
   * @param field GraphQL field
   * @param argsMap Map of argument names to types
   * @param maxLevel Maximum depth level
   * @param level Current depth level
   * @returns String of output fields
   */
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
    const fieldOutput = `${createSpaces((level + 1) * 2)}${field.name}${
      field.args.length
        ? [
            "(",
            field.args
              .map((arg) => {
                const argName = level
                  ? `${name}${upperFirst(arg.name)}`
                  : arg.name;
                const genName = this.generateArgsName(argsMap, argName);
                argsMap[genName] = arg.type.toString();
                return `${createSpaces((level + 2) * 2)}${
                  arg.name
                }: $${genName}`;
              })
              .join(",\n"),
            `${createSpaces((level + 1) * 2)})`,
          ].join("\n")
        : ""
    }${fragment || fields.length ? " {" : ""}`;

    const childOutput = fields
      .map((field) =>
        this.createOutputFields(field, argsMap, maxLevel, level + 1)
      )
      .filter((v) => v)
      .join("\n");

    const fragmentOutput = fragment
      ? `${createSpaces((level + 2) * 2)}...${this.fragments[type.name]}`
      : "";

    const closingOutput =
      fragment || fields.length ? `${createSpaces((level + 1) * 2)}}` : "";

    return [fieldOutput, fragmentOutput, childOutput, closingOutput]
      .filter((v) => v)
      .join("\n");
  }

  /**
   * Generate a unique name for a GraphQL fragment
   * @param target Object containing existing fragment names
   * @param name Fragment name
   * @returns Unique fragment name
   */
  generateFragmentName(target: { [key: string]: string }, name: string) {
    const values = new Set(Object.values(target));
    const typeNames = new Set(this.types.map((v) => v.name));

    let genName = lowercaseFirst(name);
    while (values.has(genName) || typeNames?.has(genName)) {
      genName = `${genName}_`;
    }
    return genName;
  }

  /**
   * Create a string of GraphQL fragments
   * @returns String of GraphQL fragments
   */
  createFragment() {
    return this.types
      .filter(
        ({ name }) => !["Query", "Mutation", "Subscription"].includes(name)
      )
      .map((v) => {
        const name = this.generateFragmentName(this.fragments, v.name);
        this.fragments[v.name] = name;
        return `fragment ${name} on ${v.name} ${this.createFragmentFields(
          v.getFields()
        )}\n`;
      })
      .join("\n");
  }

  /**
   * Create a string of GraphQL operations for a given operation type
   * @param operation Operation type
   * @param maxLevel Maximum depth level
   * @returns String of GraphQL operations
   */
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

  /**
   * Create a string of GraphQL operation arguments
   * @param operation Operation type
   * @param name Operation name
   * @param args Array of argument names and types
   * @returns String of GraphQL operation arguments
   */
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

  /**
   * Generate a GraphQL query string
   * @param depth Maximum depth level
   * @returns GraphQL query string
   */
  generate(depth: number) {
    return [
      this.createFragment(),
      this.createOperations("Query", depth),
      this.createOperations("Mutation", depth),
      this.createOperations("Subscription", depth),
    ].join("\n");
  }
}

/**
 * Generate a GraphQL query string from a schema
 * @param schema GraphQL schema or schema string
 * @param depth Maximum depth level
 * @returns GraphQL query string
 */
export const generate = (schema: string | GraphQLSchema, depth = 2) => {
  const autoQuery = new AutoQuery(
    schema instanceof GraphQLSchema ? schema : buildSchema(schema)
  );
  return autoQuery.generate(depth);
};
