import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CatalogCommandHandlers } from '../../application/command/catalog-command-handlers.js';
import { CatalogQueryHandlers } from '../../application/query/catalog-query-handlers.js';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  parentId: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export function catalogRoutes(
  commandHandlers: CatalogCommandHandlers,
  queryHandlers: CatalogQueryHandlers,
) {
  return async (fastify: FastifyInstance) => {
    // GET /categories - list categories
    fastify.get('/categories', async (req: FastifyRequest, reply: FastifyReply) => {
      const query = req.query as { parentId?: string; isActive?: string };
      const filter: { parentId?: string | null; isActive?: boolean } = {};
      if (query.parentId === 'null') filter.parentId = null;
      else if (query.parentId) filter.parentId = query.parentId;
      if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';

      const categories = await queryHandlers.getCategories(filter);
      return reply.send({ data: categories });
    });

    // GET /categories/:id - get category by id
    fastify.get('/categories/:id', async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as { id: string };
      const category = await queryHandlers.getCategory({ id });
      return reply.send({ data: category });
    });

    // POST /categories - create category
    fastify.post('/categories', async (req: FastifyRequest, reply: FastifyReply) => {
      const body = createCategorySchema.parse(req.body);
      const category = await commandHandlers.createCategory(body);
      return reply.status(201).send({ data: category });
    });

    // PUT /categories/:id - update category
    fastify.put('/categories/:id', async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as { id: string };
      const body = updateCategorySchema.parse(req.body);
      const category = await commandHandlers.updateCategory({ id, ...body });
      return reply.send({ data: category });
    });
  };
}
