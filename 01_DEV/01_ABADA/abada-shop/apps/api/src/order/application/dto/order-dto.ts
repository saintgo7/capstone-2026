export interface OrderItemDTO {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderDTO {
  orderId: string;
  customerId: string;
  status: string;
  items: OrderItemDTO[];
  totalAmount: number;
  shippingAddress: string;
  createdAt: string;
}
