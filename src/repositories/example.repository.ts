import { BaseRepository } from "./base.repository";
import { PaginationParams } from "../utils/cache-key.util";

// Example interfaces for demonstration
interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  category_id: string;
  is_active: boolean;
  created_at: Date;
}

interface CreateProductDTO {
  name: string;
  slug: string;
  price: number;
  category_id: string;
}

interface UpdateProductDTO {
  name?: string;
  slug?: string;
  price?: number;
  category_id?: string;
  is_active?: boolean;
}

/**
 * Example Product Repository demonstrating generic cache usage
 * This shows how any repository can extend BaseRepository for consistent caching
 */
class ProductRepository extends BaseRepository<Product, CreateProductDTO, UpdateProductDTO> {
  protected entityName = 'product';
  protected entityPluralName = 'products';

  // Example: Find product by ID with caching
  async findById(id: string): Promise<Product | null> {
    // Try cache first
    const cachedResult = await this.getFromCacheById(id);
    if (cachedResult) {
      return cachedResult;
    }

    // Fetch from database (this would be your actual database call)
    const result = await this.fetchFromDatabase(id);

    if (result) {
      // Cache the result with multiple access patterns
      await this.cacheMultiplePatterns(result, [
        { field: 'slug', value: result.slug }
      ]);
    }

    return result;
  }

  // Example: Find product by slug with caching
  async findBySlug(slug: string): Promise<Product | null> {
    // Try cache first
    const cachedResult = await this.getFromCacheByField('slug', slug);
    if (cachedResult) {
      return cachedResult;
    }

    // Fetch from database
    const result = await this.fetchBySlugFromDatabase(slug);

    if (result) {
      // Cache with multiple patterns
      await this.cacheMultiplePatterns(result, [
        { field: 'slug', value: result.slug }
      ]);
    }

    return result;
  }

  // Example: Find all products with caching
  async findAll(pagination?: PaginationParams, filters?: { category_id?: string; is_active?: boolean }): Promise<Product[]> {
    // Try cache first
    const cachedResult = await this.getListFromCache(pagination, filters);
    if (cachedResult) {
      return cachedResult;
    }

    // Fetch from database
    const result = await this.fetchListFromDatabase(pagination, filters);

    // Cache the result
    await this.cacheList(result, pagination, filters);

    return result;
  }

  // Example: Create product with cache invalidation
  async create(data: CreateProductDTO): Promise<Product> {
    // Create in database
    const result = await this.createInDatabase(data);

    // Invalidate list caches since a new product was added
    await this.invalidateListCaches();

    return result;
  }

  // Example: Update product with proper cache invalidation
  async update(id: string, data: UpdateProductDTO): Promise<Product> {
    // Get current product to know what caches to invalidate
    const currentProduct = await this.fetchFromDatabase(id);

    // Update in database
    const result = await this.updateInDatabase(id, data);

    // Invalidate relevant caches
    await this.invalidateMultiplePatterns(id, [
      {
        field: 'slug',
        oldValue: currentProduct?.slug,
        newValue: result.slug
      }
    ]);

    // Invalidate list caches since product data changed
    await this.invalidateListCaches();

    return result;
  }

  // Example: Delete product with cache cleanup
  async delete(id: string): Promise<Product> {
    // Get product before deletion to know what to invalidate
    const productToDelete = await this.fetchFromDatabase(id);

    // Delete from database
    const result = await this.deleteFromDatabase(id);

    // Clean up all related caches
    if (productToDelete) {
      await this.invalidateMultiplePatterns(id, [
        { field: 'slug', oldValue: productToDelete.slug }
      ]);
    }

    // Invalidate list caches
    await this.invalidateListCaches();

    return result;
  }

  // Example: Clear all product caches
  async clearAllCache(): Promise<void> {
    await this.invalidateAllCaches();
  }

  // Mock database methods (replace with actual database calls)
  private async fetchFromDatabase(id: string): Promise<Product | null> {
    // This would be your actual database query
    // Example: return prisma.product.findUnique({ where: { id } });
    return null;
  }

  private async fetchBySlugFromDatabase(slug: string): Promise<Product | null> {
    // Example: return prisma.product.findUnique({ where: { slug } });
    return null;
  }

  private async fetchListFromDatabase(pagination?: PaginationParams, filters?: any): Promise<Product[]> {
    // Example: return prisma.product.findMany({ where: filters, skip, take });
    return [];
  }

  private async createInDatabase(data: CreateProductDTO): Promise<Product> {
    // Example: return prisma.product.create({ data });
    throw new Error('Not implemented');
  }

  private async updateInDatabase(id: string, data: UpdateProductDTO): Promise<Product> {
    // Example: return prisma.product.update({ where: { id }, data });
    throw new Error('Not implemented');
  }

  private async deleteFromDatabase(id: string): Promise<Product> {
    // Example: return prisma.product.delete({ where: { id } });
    throw new Error('Not implemented');
  }
}

export default new ProductRepository();