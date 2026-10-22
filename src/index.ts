import { buildSchema, GraphQLSchema } from "graphql";
import { AutoQuery } from "./AutoQuery.js";

export { AutoQuery };

/**
 * Generate a GraphQL query string from a schema
 * @param schema GraphQL schema or schema string
 * @param options Maximum depth level or options object
 * @returns GraphQL query string
 */
export const generate = (
  schema: string | GraphQLSchema,
  options:
    | number
    | {
        depth?: number;
        mutationDepth?: number;
        subscriptionDepth?: number;
        queryDepth?: number;
      } = 2,
) => {
  const autoQuery = new AutoQuery(
    schema instanceof GraphQLSchema ? schema : buildSchema(schema),
  );
  return autoQuery.generate(options);
};