import { AggregateRoot } from '../../../shared/domain/index.js';
import { CategoryId } from './category-id.js';

export interface CategoryProps {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  description?: string;
  imageUrl?: string;
  depth: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Category extends AggregateRoot<CategoryId> {
  private _name: string;
  private _slug: string;
  private _parentId?: string;
  private _description?: string;
  private _imageUrl?: string;
  private _depth: number;
  private _sortOrder: number;
  private _isActive: boolean;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(id: CategoryId, props: Omit<CategoryProps, 'id'>) {
    super(id);
    this._name = props.name;
    this._slug = props.slug;
    this._parentId = props.parentId;
    this._description = props.description;
    this._imageUrl = props.imageUrl;
    this._depth = props.depth;
    this._sortOrder = props.sortOrder;
    this._isActive = props.isActive;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(props: {
    name: string;
    slug: string;
    parentId?: string;
    description?: string;
    imageUrl?: string;
    sortOrder?: number;
    depth?: number;
  }): Category {
    const now = new Date();
    return new Category(CategoryId.create(), {
      name: props.name,
      slug: props.slug,
      parentId: props.parentId,
      description: props.description,
      imageUrl: props.imageUrl,
      depth: props.depth ?? 0,
      sortOrder: props.sortOrder ?? 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: CategoryProps): Category {
    return new Category(CategoryId.create(props.id), {
      name: props.name,
      slug: props.slug,
      parentId: props.parentId,
      description: props.description,
      imageUrl: props.imageUrl,
      depth: props.depth,
      sortOrder: props.sortOrder,
      isActive: props.isActive,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  update(props: { name?: string; description?: string; imageUrl?: string; sortOrder?: number }): void {
    if (props.name !== undefined) this._name = props.name;
    if (props.description !== undefined) this._description = props.description;
    if (props.imageUrl !== undefined) this._imageUrl = props.imageUrl;
    if (props.sortOrder !== undefined) this._sortOrder = props.sortOrder;
    this._updatedAt = new Date();
  }

  deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  get name(): string { return this._name; }
  get slug(): string { return this._slug; }
  get parentId(): string | undefined { return this._parentId; }
  get description(): string | undefined { return this._description; }
  get imageUrl(): string | undefined { return this._imageUrl; }
  get depth(): number { return this._depth; }
  get sortOrder(): number { return this._sortOrder; }
  get isActive(): boolean { return this._isActive; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
}
