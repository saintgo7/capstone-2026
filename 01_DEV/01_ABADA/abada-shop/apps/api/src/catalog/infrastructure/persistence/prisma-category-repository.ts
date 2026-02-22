import { PrismaClient } from '@prisma/client';
import { Category, CategoryProps } from '../../domain/model/category.js';
import { CategoryRepository } from '../../domain/repository/category-repository.js';

function toDomain(row: any): Category {
  return Category.reconstitute({
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parentId ?? undefined,
    description: row.description ?? undefined,
    imageUrl: row.imageUrl ?? undefined,
    depth: row.depth,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  } as CategoryProps);
}

export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly db: PrismaClient) {}

  async save(category: Category): Promise<void> {
    const db = this.db as any;
    await db.category.upsert({
      where: { id: category.id.value },
      create: {
        id: category.id.value,
        name: category.name,
        slug: category.slug,
        parentId: category.parentId ?? null,
        description: category.description ?? null,
        imageUrl: category.imageUrl ?? null,
        depth: category.depth,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
      },
      update: {
        name: category.name,
        description: category.description ?? null,
        imageUrl: category.imageUrl ?? null,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
        updatedAt: category.updatedAt,
      },
    });
  }

  async findById(id: string): Promise<Category | null> {
    const db = this.db as any;
    const row = await db.category.findUnique({ where: { id } });
    if (!row) return null;
    return toDomain(row);
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const db = this.db as any;
    const row = await db.category.findUnique({ where: { slug } });
    if (!row) return null;
    return toDomain(row);
  }

  async findAll(filter?: { parentId?: string | null; isActive?: boolean }): Promise<Category[]> {
    const db = this.db as any;
    const where: any = {};
    if (filter?.isActive !== undefined) where.isActive = filter.isActive;
    if (filter?.parentId !== undefined) where.parentId = filter.parentId;

    const rows = await db.category.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map(toDomain);
  }
}
