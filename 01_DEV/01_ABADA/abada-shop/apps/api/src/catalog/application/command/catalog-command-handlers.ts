import { CategoryRepository } from '../../domain/repository/category-repository.js';
import { Category } from '../../domain/model/category.js';
import { CategoryDTO } from '../dto/category-dto.js';
import { ConflictError, NotFoundError } from '../../../shared/domain/index.js';

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

export class CatalogCommandHandlers {
  constructor(private readonly categoryRepo: CategoryRepository) {}

  async createCategory(cmd: {
    name: string;
    slug: string;
    parentId?: string;
    description?: string;
    imageUrl?: string;
    sortOrder?: number;
  }): Promise<CategoryDTO> {
    const existing = await this.categoryRepo.findBySlug(cmd.slug);
    if (existing) throw new ConflictError(`Category slug '${cmd.slug}' already exists`);

    let depth = 0;
    if (cmd.parentId) {
      const parent = await this.categoryRepo.findById(cmd.parentId);
      if (!parent) throw new NotFoundError('Category', cmd.parentId);
      depth = parent.depth + 1;
    }

    const category = Category.create({ ...cmd, depth });
    await this.categoryRepo.save(category);
    return toCategoryDTO(category);
  }

  async updateCategory(cmd: {
    id: string;
    name?: string;
    description?: string;
    imageUrl?: string;
    sortOrder?: number;
  }): Promise<CategoryDTO> {
    const category = await this.categoryRepo.findById(cmd.id);
    if (!category) throw new NotFoundError('Category', cmd.id);

    category.update({
      name: cmd.name,
      description: cmd.description,
      imageUrl: cmd.imageUrl,
      sortOrder: cmd.sortOrder,
    });

    await this.categoryRepo.save(category);
    return toCategoryDTO(category);
  }
}
