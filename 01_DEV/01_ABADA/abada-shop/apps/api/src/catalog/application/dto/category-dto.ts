export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  description?: string;
  imageUrl?: string;
  depth: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
