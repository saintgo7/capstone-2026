import { OrderRepository } from '../../domain/repository/order-repository.js';
import { OrderId } from '../../domain/value-object/order-ids.js';
import { OrderDTO, OrderItemDTO } from '../dto/order-dto.js';
import { NotFoundError } from '../../../shared/domain/index.js';
import { Order } from '../../domain/model/order.js';

function toOrderDTO(order: Order): OrderDTO {
  const items: OrderItemDTO[] = order.items.map(item => ({
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: item.unitPrice.amount,
    subtotal: item.subtotal.amount,
  }));

  return {
    orderId: order.id.value,
    customerId: order.customerId,
    status: order.status,
    items,
    totalAmount: order.total.amount,
    shippingAddress: order.shippingAddress,
    createdAt: order.createdAt.toISOString(),
  };
}

export class OrderQueryHandlers {
  constructor(private readonly orderRepo: OrderRepository) {}

  async getOrder(query: { orderId: string }): Promise<OrderDTO> {
    const order = await this.orderRepo.findById(OrderId.create(query.orderId));
    if (!order) throw new NotFoundError('Order', query.orderId);
    return toOrderDTO(order);
  }

  async getOrdersByCustomer(query: { customerId: string }): Promise<OrderDTO[]> {
    const orders = await this.orderRepo.findByCustomerId(query.customerId);
    return orders.map(toOrderDTO);
  }

  async getAllOrders(query: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: OrderDTO[]; total: number }> {
    const [orders, total] = await Promise.all([
      this.orderRepo.findAll(query),
      this.orderRepo.countAll({ status: query.status }),
    ]);
    return { orders: orders.map(toOrderDTO), total };
  }
}
