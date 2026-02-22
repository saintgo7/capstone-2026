import { DomainEvent } from '../../../shared/domain/index.js';

export class ProductCreated extends DomainEvent {
  readonly eventType = 'ProductCreated';
  constructor(public readonly productId: string, public readonly name: string) { super(); }
}
export class ProductActivated extends DomainEvent {
  readonly eventType = 'ProductActivated';
  constructor(public readonly productId: string) { super(); }
}
export class ProductPriceChanged extends DomainEvent {
  readonly eventType = 'ProductPriceChanged';
  constructor(
    public readonly productId: string,
    public readonly oldAmount: number,
    public readonly newAmount: number,
  ) { super(); }
}
export class ProductStockUpdated extends DomainEvent {
  readonly eventType = 'ProductStockUpdated';
  constructor(public readonly productId: string, public readonly newQuantity: number) { super(); }
}
