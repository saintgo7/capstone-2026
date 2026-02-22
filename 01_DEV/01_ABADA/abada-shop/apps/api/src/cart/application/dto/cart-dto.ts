export interface CartItemDTO {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface CartDTO {
  userId: string;
  items: CartItemDTO[];
  totalAmount: number;
  totalQuantity: number;
}
