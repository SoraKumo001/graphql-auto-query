import { describe, it, expect } from 'vitest';
import { generate } from '../src/index';

describe('graphql-auto-query coverage', () => {
  it('should handle Subscriptions', () => {
    const schema = `
      type Subscription {
        newMessage: String
      }
      type Query {
        hello: String
      }
    `;
    const result = generate(schema);
    expect(result).toContain('subscription NewMessage {');
    expect(result).toContain('newMessage');
  });

  it('should handle Interfaces', () => {
    const schema = `
      interface Node {
        id: ID!
      }
      type User implements Node {
        id: ID!
        username: String
      }
      type Query {
        node: Node
      }
    `;
    const result = generate(schema);
    // It should generate fragments for implementations if the logic supports it,
    // or at least handle the interface type in fragments.
    // Based on code: createTypes includes InterfaceType.
    // createFragment generates fragments for types.
    // expect(result).toContain('fragment user on User'); // Implementation fragments are not auto-used if return type is Interface
    expect(result).toContain('fragment node on Node');
  });

  it('should handle name collisions in operations', () => {
    const schema = `
      type User { id: ID }
      type Query {
        user: User
      }
      type Mutation {
        user: User
      }
    `;
    const result = generate(schema);
    // Query.user -> "User"
    // Mutation.user -> "User_" (because "User" is taken)
    expect(result).toContain('query User {');
    expect(result).toContain('mutation User_ {');
  });

  it('should handle name collisions in arguments (nested)', () => {
    const schema = `
      type Post {
        id: ID
      }
      type User {
        posts(id: ID): [Post]
      }
      type Query {
        user(postsId: ID): User
      }
    `;
    // Level 0: user(postsId). argName="postsId". genName="postsId".
    // Level 1: user.posts(id). argName="PostsId". genName="PostsId" (if case sensitive? lowercaseFirst is used).
    // lowercaseFirst("PostsId") -> "postsId".
    // Collision with level 0 "postsId".
    // Should become "postsId1".
    
    const result = generate(schema, 3);
    expect(result).toContain('$postsId: ID');
    expect(result).toContain('$postsId2: ID');
    expect(result).toContain('postsId: $postsId');
    expect(result).toContain('id: $postsId2');
  });

  it('should respect depth limit', () => {
    const schema = `
      type User {
        id: ID
        friend: User
      }
      type Query {
        user: User
      }
    `;
    // Depth 0: user { id } (friend is object, fields check base type, if field types exist)
    // createOutputFields: if level > maxLevel return ""
    // level starts at 0.
    
    // If maxLevel is 0.
    // user (level 0).
    // fields: id, friend.
    // friend (level 1). -> 1 > 0 -> returns ""?
    
    // Let's test depth 1.
    // user (0) -> friend (1) -> friend (2).
    // if depth 1.
    // user { friend { ... } } ?
    
    const result = generate(schema, 1);
    // Should have user -> friend. But friend's friend should be cut off?
    // Actually, createOutputFields:
    // fieldOutput = space + name + args ... + {
    // childOutput = fields.map( ... level + 1 )
    
    // If level (1) > maxLevel (1) -> return "".
    // So friend (level 1) output fields logic:
    // It enters createOutputFields for 'friend' with level 1.
    // maxLevel 1. 1 > 1 is false.
    // It generates "friend {".
    // Children of friend: 'friend' (level 2).
    // recursive call level 2. 2 > 1 -> returns "".
    // So 'friend' (level 1) has empty childOutput.
    // Logic: if childOutput == "" && fragmentOutput == "" && closingOutput !== "" -> return "".
    // So 'friend' field itself might be removed if it has no children?
    // Wait, "id" is a scalar field.
    // user (level 0). children: id (level 1), friend (level 1).
    // id (level 1): not an object?
    // getFieldTypes returns {} for scalars.
    // fields filter: args.length || isFields(field.type).
    // Scalar 'id' has no args and !isFields. So it's NOT in 'fields' list for child recursion?
    // Wait. `createOutputFields` iterates over `fields`.
    // `fields` comes from `getFieldTypes(type)`.
    // `type` is the return type of the field we are processing.
    // For `Query.user`, type is `User`. `User` has fields `id`, `friend`.
    // We iterate these fields.
    // 1. `id`. `isFields(ID)` is false. args.length 0.
    //    -> filtered OUT of `fields` array in `createOutputFields`.
    //    -> So `id` is NOT recursively processed?
    //    -> Wait, where are scalars outputted?
    //    -> Ah, `fragment`.
    //    `const fragment = this.fragments[type.name];`
    //    If `User` has a fragment, it uses it.
    //    `createFragment` logic:
    //      fields = type.getFields().filter(no args && !isFields).
    //      User { id }. id matches.
    //      So `fragment user on User { id }`.
    //    Back to `createOutputFields`.
    //    `const fragmentOutput = ... ...user`.
    //    So `user` field will output `...user`.
    //    And `fields` (complex fields or args) are processed for children.
    //    `friend` is a complex field.
    //    It is in `fields`.
    //    Recursive call for `friend` (level 1).
    //      type `User`. fragment `user`.
    //      fragmentOutput: `...user`.
    //      It has complex field `friend`.
    //      Recursive call `friend` (level 2).
    //        2 > 1. Returns "".
    //      childOutput for level 1 `friend` is empty.
    //      It outputs: `friend { ...user }`.
    
    expect(result).toContain('user {');
    expect(result).toContain('...user');
    expect(result).toContain('friend {');
  });
});
