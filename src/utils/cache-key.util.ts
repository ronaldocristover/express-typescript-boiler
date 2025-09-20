/**
 * Generic Cache Key Utility
 * Provides reusable cache key generation patterns for different entity types
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export class CacheKeyGenerator {
  /**
   * Generate cache key for a single entity by ID
   * @param entityType - The type of entity (e.g., 'user', 'product', 'order')
   * @param id - The entity ID
   * @returns Cache key string
   */
  static entityById(entityType: string, id: string | number): string {
    return `${entityType}:${id}`;
  }

  /**
   * Generate cache key for an entity by a specific field
   * @param entityType - The type of entity
   * @param field - The field name (e.g., 'email', 'username', 'slug')
   * @param value - The field value
   * @returns Cache key string
   */
  static entityByField(entityType: string, field: string, value: string): string {
    return `${entityType}:${field}:${value}`;
  }

  /**
   * Generate cache key for a list of entities with optional pagination
   * @param entityType - The type of entity (plural form recommended, e.g., 'users', 'products')
   * @param pagination - Optional pagination parameters
   * @param filters - Optional additional filters as key-value pairs
   * @returns Cache key string
   */
  static entityList(entityType: string, pagination?: PaginationParams, filters?: Record<string, any>): string {
    const parts = [entityType, 'list'];

    // Add pagination if provided
    if (pagination?.page && pagination?.limit) {
      parts.push('page', pagination.page.toString(), 'limit', pagination.limit.toString());
    } else if (pagination?.page || pagination?.limit) {
      // Handle cases where only one pagination param is provided
      if (pagination.page) parts.push('page', pagination.page.toString());
      if (pagination.limit) parts.push('limit', pagination.limit.toString());
    } else {
      parts.push('all');
    }

    // Add filters if provided
    if (filters && Object.keys(filters).length > 0) {
      const filterKeys = Object.keys(filters).sort(); // Sort for consistent key generation
      for (const key of filterKeys) {
        if (filters[key] !== undefined && filters[key] !== null) {
          parts.push(key, String(filters[key]));
        }
      }
    }

    return parts.join(':');
  }

  /**
   * Generate cache key for entity relationships
   * @param parentEntity - The parent entity type
   * @param parentId - The parent entity ID
   * @param relation - The relation name (e.g., 'posts', 'comments', 'orders')
   * @param pagination - Optional pagination parameters
   * @returns Cache key string
   */
  static entityRelation(
    parentEntity: string,
    parentId: string | number,
    relation: string,
    pagination?: PaginationParams
  ): string {
    const parts = [parentEntity, parentId.toString(), relation];

    if (pagination?.page && pagination?.limit) {
      parts.push('page', pagination.page.toString(), 'limit', pagination.limit.toString());
    } else {
      parts.push('all');
    }

    return parts.join(':');
  }

  /**
   * Generate cache key for aggregated data
   * @param entityType - The type of entity
   * @param aggregationType - The type of aggregation (e.g., 'count', 'sum', 'avg')
   * @param field - Optional field being aggregated
   * @param filters - Optional filters
   * @returns Cache key string
   */
  static entityAggregation(
    entityType: string,
    aggregationType: string,
    field?: string,
    filters?: Record<string, any>
  ): string {
    const parts = [entityType, aggregationType];

    if (field) {
      parts.push(field);
    }

    // Add filters if provided
    if (filters && Object.keys(filters).length > 0) {
      const filterKeys = Object.keys(filters).sort();
      for (const key of filterKeys) {
        if (filters[key] !== undefined && filters[key] !== null) {
          parts.push(key, String(filters[key]));
        }
      }
    }

    return parts.join(':');
  }

  /**
   * Generate cache key for search results
   * @param entityType - The type of entity being searched
   * @param searchQuery - The search query string
   * @param pagination - Optional pagination parameters
   * @param filters - Optional additional search filters
   * @returns Cache key string
   */
  static entitySearch(
    entityType: string,
    searchQuery: string,
    pagination?: PaginationParams,
    filters?: Record<string, any>
  ): string {
    // Normalize search query for consistent caching
    const normalizedQuery = searchQuery.toLowerCase().trim().replace(/\s+/g, '_');
    const parts = [entityType, 'search', normalizedQuery];

    // Add pagination
    if (pagination?.page && pagination?.limit) {
      parts.push('page', pagination.page.toString(), 'limit', pagination.limit.toString());
    }

    // Add filters
    if (filters && Object.keys(filters).length > 0) {
      const filterKeys = Object.keys(filters).sort();
      for (const key of filterKeys) {
        if (filters[key] !== undefined && filters[key] !== null) {
          parts.push(key, String(filters[key]));
        }
      }
    }

    return parts.join(':');
  }

  /**
   * Generate pattern for deleting multiple cache keys
   * @param entityType - The type of entity
   * @param pattern - Optional additional pattern (e.g., 'list:*', 'user:123:*')
   * @returns Cache key pattern for deletion
   */
  static entityPattern(entityType: string, pattern: string = '*'): string {
    return `${entityType}:${pattern}`;
  }

  /**
   * Generate cache key for custom scenarios
   * @param parts - Array of key parts to join
   * @returns Cache key string
   */
  static custom(...parts: (string | number)[]): string {
    return parts.map(part => String(part)).join(':');
  }
}

// Export convenience functions for common patterns
export const CacheKey = {
  // Single entity patterns
  byId: CacheKeyGenerator.entityById,
  byField: CacheKeyGenerator.entityByField,

  // List patterns
  list: CacheKeyGenerator.entityList,
  relation: CacheKeyGenerator.entityRelation,

  // Aggregation patterns
  count: (entityType: string, filters?: Record<string, any>) =>
    CacheKeyGenerator.entityAggregation(entityType, 'count', undefined, filters),
  sum: (entityType: string, field: string, filters?: Record<string, any>) =>
    CacheKeyGenerator.entityAggregation(entityType, 'sum', field, filters),

  // Search patterns
  search: CacheKeyGenerator.entitySearch,

  // Pattern for deletion
  pattern: CacheKeyGenerator.entityPattern,

  // Custom patterns
  custom: CacheKeyGenerator.custom,
};