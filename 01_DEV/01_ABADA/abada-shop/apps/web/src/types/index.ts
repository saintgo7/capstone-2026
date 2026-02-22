export interface User {
  userId: string;
  email: string;
  name: string;
  phone: string | null;
  status: string;
  grade: string;
  points: number;
  totalSpent: number;
  createdAt: string;
}

export interface Product {
  productId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  finalPrice: number;
  discountRate: number;
  currency: string;
  stockAvailable: number;
  status: string;
  imageUrls: string[];
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  orderId: string;
  customerId: string;
  status: string;
  items: OrderItem[];
  totalAmount: number;
  shippingAddress?: string;
  recipientName?: string;
  recipientPhone?: string;
  createdAt: string;
}

export interface Category {
  categoryId: string;
  name: string;
  slug: string;
  parentId: string | null;
}

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

export interface Cart {
  cartId: string;
  userId: string;
  items: CartItem[];
  updatedAt: string;
}

export interface Payment {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  paidAt: string | null;
}

export interface Shipping {
  shippingId: string;
  orderId: string;
  carrier: string | null;
  trackingNumber: string | null;
  status: string;
}

export interface ApiResponse<T> {
  data: T;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
