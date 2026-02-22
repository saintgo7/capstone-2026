import { Category } from '../model/category.js';

export const CATEGORY_REPOSITORY = Symbol('CategoryRepository');

export interface CategoryRepository {
  save(category: Category): Promise<void>;
  findById(id: string): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  findAll(filter?: { parentId?: string | null; isActive?: boolean }): Promise<Category[]>;
}
