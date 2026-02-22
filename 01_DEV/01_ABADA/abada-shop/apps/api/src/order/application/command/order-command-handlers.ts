import { Order } from '../../domain/model/order.js';
import { OrderId } from '../../domain/value-object/order-ids.js';
import { OrderRepository } from '../../domain/repository/order-repository.js';
import { EventPublisher } from '../port/event-publisher.js';
import { OrderDTO, OrderItemDTO } from '../dto/order-dto.js';
import { NotFoundError } from '../../../shared/domain/index.js';

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

export class OrderCommandHandlers {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async createOrder(cmd: {
    customerId: string;
    shippingAddress: string;
  }): Promise<OrderDTO> {
    const order = Order.create({
      customerId: cmd.customerId,
      shippingAddress: cmd.shippingAddress,
    });

    await this.orderRepo.save(order);
    await this.publisher.publishAll(order.collectEvents());

    return toOrderDTO(order);
  }

  async addItem(cmd: {
    orderId: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPriceAmount: number;
    currency?: string;
  }): Promise<OrderDTO> {
    const order = await this.orderRepo.findById(OrderId.create(cmd.orderId));
    if (!order) throw new NotFoundError('Order', cmd.orderId);

    order.addItem({
      productId: cmd.productId,
      productName: cmd.productName,
      quantity: cmd.quantity,
      unitPriceAmount: cmd.unitPriceAmount,
      currency: cmd.currency,
    });

    await this.orderRepo.save(order);
    await this.publisher.publishAll(order.collectEvents());

    return toOrderDTO(order);
  }

  async removeItem(cmd: { orderId: string; itemId: string }): Promise<OrderDTO> {
    const order = await this.orderRepo.findById(OrderId.create(cmd.orderId));
    if (!order) throw new NotFoundError('Order', cmd.orderId);

    order.removeItem(cmd.itemId);

    await this.orderRepo.save(order);
    await this.publisher.publishAll(order.collectEvents());

    return toOrderDTO(order);
  }

  async confirmOrder(cmd: { orderId: string }): Promise<OrderDTO> {
    const order = await this.orderRepo.findById(OrderId.create(cmd.orderId));
    if (!order) throw new NotFoundError('Order', cmd.orderId);

    order.confirm();

    await this.orderRepo.save(order);
    await this.publisher.publishAll(order.collectEvents());

    return toOrderDTO(order);
  }

  async cancelOrder(cmd: { orderId: string; reason: string }): Promise<OrderDTO> {
    const order = await this.orderRepo.findById(OrderId.create(cmd.orderId));
    if (!order) throw new NotFoundError('Order', cmd.orderId);

    order.cancel(cmd.reason);

    await this.orderRepo.save(order);
    await this.publisher.publishAll(order.collectEvents());

    return toOrderDTO(order);
  }

  async markAsPaid(cmd: { orderId: string; paymentId: string }): Promise<OrderDTO> {
    const order = await this.orderRepo.findById(OrderId.create(cmd.orderId));
    if (!order) throw new NotFoundError('Order', cmd.orderId);

    order.markAsPaid(cmd.paymentId);

    await this.orderRepo.save(order);
    await this.publisher.publishAll(order.collectEvents());

    return toOrderDTO(order);
  }

  async startShipping(cmd: { orderId: string }): Promise<OrderDTO> {
    const order = await this.orderRepo.findById(OrderId.create(cmd.orderId));
    if (!order) throw new NotFoundError('Order', cmd.orderId);

    order.startShipping();

    await this.orderRepo.save(order);
    await this.publisher.publishAll(order.collectEvents());

    return toOrderDTO(order);
  }

  async deliverOrder(cmd: { orderId: string }): Promise<OrderDTO> {
    const order = await this.orderRepo.findById(OrderId.create(cmd.orderId));
    if (!order) throw new NotFoundError('Order', cmd.orderId);

    order.markDelivered();

    await this.orderRepo.save(order);
    await this.publisher.publishAll(order.collectEvents());

    return toOrderDTO(order);
  }
}
