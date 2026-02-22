import { randomUUID } from 'crypto';
import { ValueObject, DomainError } from '../../../shared/domain/index.js';

export class AddressId extends ValueObject<{ value: string }> {
  static create(value?: string): AddressId {
    return new AddressId({ value: value ?? randomUUID() });
  }
  get value(): string { return this.props.value; }
}

export class UserAddress extends ValueObject<{
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2: string;
  isDefault: boolean;
}> {
  static create(props: {
    label: string;
    recipientName: string;
    phone: string;
    zipCode: string;
    address1: string;
    address2?: string;
    isDefault?: boolean;
  }): UserAddress {
    if (!props.zipCode.match(/^\d{5}$/)) throw new DomainError('Invalid zip code');
    if (!props.address1.trim()) throw new DomainError('Address1 required');
    return new UserAddress({
      id: randomUUID(),
      label: props.label,
      recipientName: props.recipientName,
      phone: props.phone.replace(/\D/g, ''),
      zipCode: props.zipCode,
      address1: props.address1,
      address2: props.address2 ?? '',
      isDefault: props.isDefault ?? false,
    });
  }

  get id(): string { return this.props.id; }
  get label(): string { return this.props.label; }
  get recipientName(): string { return this.props.recipientName; }
  get phone(): string { return this.props.phone; }
  get zipCode(): string { return this.props.zipCode; }
  get address1(): string { return this.props.address1; }
  get address2(): string { return this.props.address2; }
  get isDefault(): boolean { return this.props.isDefault; }

  setDefault(): UserAddress {
    return new UserAddress({ ...this.props, isDefault: true });
  }

  unsetDefault(): UserAddress {
    return new UserAddress({ ...this.props, isDefault: false });
  }
}
