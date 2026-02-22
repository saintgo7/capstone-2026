import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ProductCommandHandlers } from '../../application/command/product-command-handlers.js';
import { ProductQueryHandlers } from '../../application/query/product-query-handlers.js';
import { ok } from '../../../shared/infrastructure/response-helper.js';
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
    // GET /products - 상품 목록 with cursor-based pagination
    // Query params: ?cursor=<productId>&limit=20&search=...&categoryId=...&minPrice=...&maxPrice=...&status=...
    // Also supports legacy: ?page=1&limit=20&offset=0
    fastify.get('/products', async (req: FastifyRequest, reply: FastifyReply) => {
      const { status, limit, offset, cursor, search, categoryId, minPrice, maxPrice, page } = req.query as any;

      const limitNum = limit ? Number(limit) : 20;

      // Prefer cursor-based; fallback to page/offset for backward compatibility
      if (cursor !== undefined) {
        const result = await queryHandlers.getProductsWithCursor({
          status,
          limit: limitNum,
          cursor,
          search,
          categoryId,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
        });
        return reply.send(ok(result.products, {
          pagination: {
            limit: limitNum,
            nextCursor: result.nextCursor,
            hasMore: result.hasMore,
          },
        }));
      }

      // Legacy offset/page-based
      const pageNum = page ? Number(page) : undefined;
      const computedOffset = pageNum !== undefined
        ? (pageNum - 1) * limitNum
        : (offset ? Number(offset) : undefined);

      const products = await queryHandlers.getProducts({
        status,
        limit: limitNum,
        offset: computedOffset,
        search,
        categoryId,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
      });
      return reply.send(ok(products, {
        pagination: { limit: limitNum, offset: computedOffset ?? 0 },
      }));
    });

    // GET /products/:productId - 상품 상세
    fastify.get('/products/:productId', async (req: FastifyRequest, reply: FastifyReply) => {
      const { productId } = req.params as { productId: string };
      const product = await queryHandlers.getProduct({ productId });
      return reply.send(ok(product));
    });

    // GET /categories/:categoryId/products - 카테고리별 상품
    fastify.get('/categories/:categoryId/products', async (req: FastifyRequest, reply: FastifyReply) => {
      const { categoryId } = req.params as { categoryId: string };
      const products = await queryHandlers.getProductsByCategory({ categoryId });
      return reply.send(ok(products));
    });

    // POST /products - 상품 등록
    fastify.post('/products', async (req: FastifyRequest, reply: FastifyReply) => {
      const body = createProductSchema.parse(req.body);
      const product = await commandHandlers.createProduct(body);
      return reply.status(201).send(ok(product));
    });

    // PATCH /products/:productId - 상품 수정
    fastify.patch('/products/:productId', async (req: FastifyRequest, reply: FastifyReply) => {
      const { productId } = req.params as { productId: string };
      const body = updateProductSchema.parse(req.body);
      const product = await commandHandlers.updateProduct({ productId, ...body });
      return reply.send(ok(product));
    });

    // POST /products/:productId/activate - 상품 활성화
    fastify.post('/products/:productId/activate', async (req: FastifyRequest, reply: FastifyReply) => {
      const { productId } = req.params as { productId: string };
      const product = await commandHandlers.activateProduct({ productId });
      return reply.send(ok(product));
    });

    // PATCH /products/:productId/price - 가격 변경
    fastify.patch('/products/:productId/price', async (req: FastifyRequest, reply: FastifyReply) => {
      const { productId } = req.params as { productId: string };
      const body = changePriceSchema.parse(req.body);
      const product = await commandHandlers.changePrice({ productId, ...body });
      return reply.send(ok(product));
    });

    // POST /products/:productId/stock - 재고 추가
    fastify.post('/products/:productId/stock', async (req: FastifyRequest, reply: FastifyReply) => {
      const { productId } = req.params as { productId: string };
      const body = addStockSchema.parse(req.body);
      const product = await commandHandlers.addStock({ productId, ...body });
      return reply.send(ok(product));
    });
  };
}
