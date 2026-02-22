import { AggregateRoot, DomainError } from '../../../shared/domain/index.js';
import { ShippingId } from './shipping-id.js';

export type ShippingStatus = 'PREPARING' | 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED';

export type CarrierCode = 'CJ' | 'LOTTE' | 'POST' | 'HANJIN' | 'FEDEX' | 'DHL' | 'EMS';

export interface ShippingAddress {
  recipientName: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2?: string;
}

export interface ShippingProps {
  id: string;
  orderId: string;
  address: ShippingAddress;
  status: ShippingStatus;
  carrier?: CarrierCode;
  trackingNumber?: string;
  deliveryNote?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Shipping extends AggregateRoot<ShippingId> {
  private _orderId: string;
  private _address: ShippingAddress;
  private _status: ShippingStatus;
  private _carrier?: CarrierCode;
  private _trackingNumber?: string;
  private _deliveryNote?: string;
  private _shippedAt?: Date;
  private _deliveredAt?: Date;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(id: ShippingId, props: Omit<ShippingProps, 'id'>) {
    super(id);
    this._orderId = props.orderId;
    this._address = props.address;
    this._status = props.status;
    this._carrier = props.carrier;
    this._trackingNumber = props.trackingNumber;
    this._deliveryNote = props.deliveryNote;
    this._shippedAt = props.shippedAt;
    this._deliveredAt = props.deliveredAt;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static create(props: {
    orderId: string;
    address: ShippingAddress;
    deliveryNote?: string;
  }): Shipping {
    const now = new Date();
    return new Shipping(ShippingId.create(), {
      orderId: props.orderId,
      address: props.address,
      status: 'PREPARING',
      deliveryNote: props.deliveryNote,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: ShippingProps): Shipping {
    return new Shipping(ShippingId.create(props.id), {
      orderId: props.orderId,
      address: props.address,
      status: props.status,
      carrier: props.carrier,
      trackingNumber: props.trackingNumber,
      deliveryNote: props.deliveryNote,
      shippedAt: props.shippedAt,
      deliveredAt: props.deliveredAt,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  ship(props: { carrier: CarrierCode; trackingNumber: string }): void {
    if (this._status !== 'PREPARING') {
      throw new DomainError(`Cannot ship: current status is ${this._status}`);
    }
    this._carrier = props.carrier;
    this._trackingNumber = props.trackingNumber;
    this._status = 'SHIPPED';
    this._shippedAt = new Date();
    this._updatedAt = new Date();
  }

  startTransit(): void {
    if (this._status !== 'SHIPPED') {
      throw new DomainError(`Cannot start transit: current status is ${this._status}`);
    }
    this._status = 'IN_TRANSIT';
    this._updatedAt = new Date();
  }

  deliver(): void {
    if (this._status !== 'IN_TRANSIT' && this._status !== 'SHIPPED') {
      throw new DomainError(`Cannot deliver: current status is ${this._status}`);
    }
    this._status = 'DELIVERED';
    this._deliveredAt = new Date();
    this._updatedAt = new Date();
  }

  get orderId(): string { return this._orderId; }
  get address(): ShippingAddress { return this._address; }
  get status(): ShippingStatus { return this._status; }
  get carrier(): CarrierCode | undefined { return this._carrier; }
  get trackingNumber(): string | undefined { return this._trackingNumber; }
  get deliveryNote(): string | undefined { return this._deliveryNote; }
  get shippedAt(): Date | undefined { return this._shippedAt; }
  get deliveredAt(): Date | undefined { return this._deliveredAt; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
}
