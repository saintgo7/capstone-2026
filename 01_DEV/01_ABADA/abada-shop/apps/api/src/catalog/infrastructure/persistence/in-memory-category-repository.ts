import { Category } from '../../domain/model/category.js';
import { CategoryRepository } from '../../domain/repository/category-repository.js';

export class InMemoryCategoryRepository implements CategoryRepository {
  private readonly store = new Map<string, Category>();

  async save(category: Category): Promise<void> {
    this.store.set(category.id.value, category);
  }

  async findById(id: string): Promise<Category | null> {
    return this.store.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    for (const category of this.store.values()) {
      if (category.slug === slug) return category;
    }
    return null;
  }

  async findAll(filter?: { parentId?: string | null; isActive?: boolean }): Promise<Category[]> {
    const all = Array.from(this.store.values());
    return all.filter(c => {
      if (filter?.isActive !== undefined && c.isActive !== filter.isActive) return false;
      if (filter?.parentId !== undefined) {
        if (filter.parentId === null) return c.parentId === undefined;
        return c.parentId === filter.parentId;
      }
      return true;
    }).sort((a, b) => a.sortOrder - b.sortOrder);
  }
}
