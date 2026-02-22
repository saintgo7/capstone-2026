import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ProductCommandHandlers } from '../../application/command/product-command-handlers.js';
import { ProductQueryHandlers } from '../../application/query/product-query-handlers.js';
import { z } from 'zod';

const createProductSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().default(''),
  priceAmount: z.number().int().nonnegative(),
  currency: z.string().default('KRW'),
  initialStock: z.number().int().nonnegative().default(0),
});

const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  discountRate: z.number().min(0).max(100).optional(),
});

const changePriceSchema = z.object({ newAmount: z.number().int().nonnegative() });
const addStockSchema = z.object({ quantity: z.number().int().positive() });

export function productRoutes(
  commandHandlers: ProductCommandHandlers,
  queryHandlers: ProductQueryHandlers,
) {
  return async (fastify: FastifyInstance) => {
    // GET /products - 상품 목록 (search, category, price range, pagination)
    fastify.get('/products', async (req: FastifyRequest, reply: FastifyReply) => {
      const { status, limit, offset, search, categoryId, minPrice, maxPrice, page } = req.query as any;

      // page-based pagination: if page is provided, convert to offset
      const pageNum = page ? Number(page) : undefined;
      const pageSize = limit ? Number(limit) : 20;
      const computedOffset = pageNum !== undefined
        ? (pageNum - 1) * pageSize
        : (offset ? Number(offset) : undefined);

      const products = await queryHandlers.getProducts({
        status,
        limit: pageSize,
        offset: computedOffset,
        search,
        categoryId,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
      });
      return reply.send({ data: products });
    });

    // GET /products/:productId - 상품 상세
    fastify.get('/products/:productId', async (req: FastifyRequest, reply: FastifyReply) => {
      const { productId } = req.params as { productId: string };
      const product = await queryHandlers.getProduct({ productId });
      return reply.send({ data: product });
    });

    // GET /products/category/:categoryId - 카테고리별 상품
    fastify.get('/categories/:categoryId/products', async (req: FastifyRequest, reply: FastifyReply) => {
      const { categoryId } = req.params as { categoryId: string };
      const products = await queryHandlers.getProductsByCategory({ categoryId });
      return reply.send({ data: products });
    });

    // POST /products - 상품 등록 (admin)
    fastify.post('/products', async (req: FastifyRequest, reply: FastifyReply) => {
      const body = createProductSchema.parse(req.body);
      const product = await commandHandlers.createProduct(body);
      return reply.status(201).send({ data: product });
    });

    // PATCH /products/:productId - 상품 수정
    fastify.patch('/products/:productId', async (req: FastifyRequest, reply: FastifyReply) => {
      const { productId } = req.params as { productId: string };
      const body = updateProductSchema.parse(req.body);
      const product = await commandHandlers.updateProduct({ productId, ...body });
      return reply.send({ data: product });
    });

    // POST /products/:productId/activate - 상품 활성화
    fastify.post('/products/:productId/activate', async (req: FastifyRequest, reply: FastifyReply) => {
      const { productId } = req.params as { productId: string };
      const product = await commandHandlers.activateProduct({ productId });
      return reply.send({ data: product });
    });

    // PATCH /products/:productId/price - 가격 변경
    fastify.patch('/products/:productId/price', async (req: FastifyRequest, reply: FastifyReply) => {
      const { productId } = req.params as { productId: string };
      const body = changePriceSchema.parse(req.body);
      const product = await commandHandlers.changePrice({ productId, ...body });
      return reply.send({ data: product });
    });

    // POST /products/:productId/stock - 재고 추가
    fastify.post('/products/:productId/stock', async (req: FastifyRequest, reply: FastifyReply) => {
      const { productId } = req.params as { productId: string };
      const body = addStockSchema.parse(req.body);
      const product = await commandHandlers.addStock({ productId, ...body });
      return reply.send({ data: product });
    });
  };
}
