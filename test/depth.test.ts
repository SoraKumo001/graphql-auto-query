import { describe, it, expect } from 'vitest';
import { generate } from '../src/index';

describe('graphql-auto-query depth settings', () => {
  const schema = `
    type User {
      id: ID
      friend: User
    }
    type Query {
      user: User
    }
    type Mutation {
      updateUser: User
    }
  `;

  it('should use default depth for all when depth is number', () => {
    // Depth 1: user { ...user friend { ...user } }
    const result = generate(schema, 1);
    expect(result).toContain('query User {');
    // Check for nesting in query
    expect(result).toContain('friend {'); // level 1 nesting
    
    expect(result).toContain('mutation UpdateUser {');
    expect(result).toContain('friend {'); // level 1 nesting in mutation
  });

  it('should respect specific mutationDepth', () => {
    // Query depth 1 (default), Mutation depth 0
    const result = generate(schema, { depth: 1, mutationDepth: 0 });
    
    // Query should have friend
    const queryPart = result.split('mutation')[0];
    expect(queryPart).toContain('friend {');
    
    // Mutation should NOT have friend (depth 0 means only ...user which has scalars)
    const mutationPart = result.split('mutation')[1];
    expect(mutationPart).not.toContain('friend {');
    expect(mutationPart).toContain('...user');
  });

  it('should respect specific queryDepth', () => {
    const result = generate(schema, { depth: 1, queryDepth: 0 });
    
    // Query should NOT have friend
    const queryPart = result.split('mutation')[0];
    expect(queryPart).not.toContain('friend {');
    
    // Mutation should have friend (depth 1)
    const mutationPart = result.split('mutation')[1];
    expect(mutationPart).toContain('friend {');
  });
});
