export interface ProductDTO {
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
