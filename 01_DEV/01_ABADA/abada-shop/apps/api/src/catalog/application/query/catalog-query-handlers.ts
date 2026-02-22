import { CategoryRepository } from '../../domain/repository/category-repository.js';
import { Category } from '../../domain/model/category.js';
import { CategoryDTO } from '../dto/category-dto.js';
import { NotFoundError } from '../../../shared/domain/index.js';

function toCategoryDTO(c: Category): CategoryDTO {
  return {
    id: c.id.value,
    name: c.name,
    slug: c.slug,
    parentId: c.parentId,
    description: c.description,
    imageUrl: c.imageUrl,
    depth: c.depth,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export class CatalogQueryHandlers {
  constructor(private readonly categoryRepo: CategoryRepository) {}

  async getCategories(filter?: { parentId?: string | null; isActive?: boolean }): Promise<CategoryDTO[]> {
    const categories = await this.categoryRepo.findAll(filter);
    return categories.map(toCategoryDTO);
  }

  async getCategory(query: { id: string }): Promise<CategoryDTO> {
    const category = await this.categoryRepo.findById(query.id);
    if (!category) throw new NotFoundError('Category', query.id);
    return toCategoryDTO(category);
  }
}
