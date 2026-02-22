import { AggregateRoot, DomainError } from '../../../shared/domain/index.js';
import { UserId } from '../value-object/user-id.js';
import { Email } from '../value-object/email.js';
import { Phone } from '../value-object/phone.js';
import { HashedPassword } from '../value-object/password.js';
import { UserAddress } from '../value-object/address.js';
import {
  UserRegistered,
  UserGradeUpgraded,
  PointEarned,
  PointUsed,
} from '../event/user-events.js';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum UserGrade {
  NORMAL = 'NORMAL',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  VIP = 'VIP',
  VVIP = 'VVIP',
}

const GRADE_THRESHOLDS: Record<UserGrade, number> = {
  [UserGrade.NORMAL]: 0,
  [UserGrade.SILVER]: 100_000,
  [UserGrade.GOLD]: 500_000,
  [UserGrade.VIP]: 1_000_000,
  [UserGrade.VVIP]: 5_000_000,
};

export class User extends AggregateRoot<UserId> {
  private _email!: Email;
  private _name!: string;
  private _phone!: Phone | null;
  private _password!: HashedPassword;
  private _status!: UserStatus;
  private _grade!: UserGrade;
  private _points: number;
  private _totalSpent: number;
  private _addresses: UserAddress[];
  private _createdAt!: Date;

  private constructor(id: UserId) {
    super(id);
    this._addresses = [];
    this._points = 0;
    this._totalSpent = 0;
  }

  static register(props: {
    email: string;
    name: string;
    hashedPassword: string;
    phone?: string;
  }): User {
    const user = new User(UserId.create());
    user._email = Email.create(props.email);
    user._name = props.name.trim();
    user._password = HashedPassword.fromHash(props.hashedPassword);
    user._phone = props.phone ? Phone.create(props.phone) : null;
    user._status = UserStatus.ACTIVE;
    user._grade = UserGrade.NORMAL;
    user._createdAt = new Date();

    user.addDomainEvent(new UserRegistered(user.id.value, user._email.value));
    return user;
  }

  static reconstitute(props: {
    id: string;
    email: string;
    name: string;
    hashedPassword: string;
    phone?: string;
    status: UserStatus;
    grade: UserGrade;
    points: number;
    totalSpent: number;
    addresses: UserAddress[];
    createdAt: Date;
  }): User {
    const user = new User(UserId.create(props.id));
    user._email = Email.create(props.email);
    user._name = props.name;
    user._password = HashedPassword.fromHash(props.hashedPassword);
    user._phone = props.phone ? Phone.create(props.phone) : null;
    user._status = props.status;
    user._grade = props.grade;
    user._points = props.points;
    user._totalSpent = props.totalSpent;
    user._addresses = props.addresses;
    user._createdAt = props.createdAt;
    return user;
  }

  changePassword(newHashedPassword: string): void {
    this._password = HashedPassword.fromHash(newHashedPassword);
  }

  updateProfile(props: { name?: string; phone?: string }): void {
    if (props.name !== undefined) {
      if (!props.name.trim()) throw new DomainError('Name cannot be empty');
      this._name = props.name.trim();
    }
    if (props.phone !== undefined) {
      this._phone = Phone.create(props.phone);
    }
  }

  addAddress(address: UserAddress): void {
    if (this._addresses.length >= 10) {
      throw new DomainError('Maximum 10 addresses allowed');
    }
    if (address.isDefault) {
      this._addresses = this._addresses.map(a => a.unsetDefault());
    }
    this._addresses.push(address);
  }

  removeAddress(addressId: string): void {
    const idx = this._addresses.findIndex(a => a.id === addressId);
    if (idx === -1) throw new DomainError(`Address ${addressId} not found`);
    this._addresses.splice(idx, 1);
  }

  setDefaultAddress(addressId: string): void {
    const idx = this._addresses.findIndex(a => a.id === addressId);
    if (idx === -1) throw new DomainError(`Address ${addressId} not found`);
    this._addresses = this._addresses.map((a, i) =>
      i === idx ? a.setDefault() : a.unsetDefault()
    );
  }

  earnPoints(amount: number, reason: string): void {
    if (amount <= 0) throw new DomainError('Points must be positive');
    this._points += amount;
    this.addDomainEvent(new PointEarned(this.id.value, amount, reason));
  }

  usePoints(amount: number, orderId: string): void {
    if (amount <= 0) throw new DomainError('Points must be positive');
    if (this._points < amount) throw new DomainError('Insufficient points');
    this._points -= amount;
    this.addDomainEvent(new PointUsed(this.id.value, amount, orderId));
  }

  recordPurchase(amount: number): void {
    if (amount <= 0) throw new DomainError('Amount must be positive');
    this._totalSpent += amount;
    this.tryUpgradeGrade();
  }

  private tryUpgradeGrade(): void {
    const grades = [UserGrade.VVIP, UserGrade.VIP, UserGrade.GOLD, UserGrade.SILVER, UserGrade.NORMAL];
    for (const grade of grades) {
      if (this._totalSpent >= GRADE_THRESHOLDS[grade] && this._grade !== grade) {
        const gradeOrder = Object.values(UserGrade);
        if (gradeOrder.indexOf(grade) > gradeOrder.indexOf(this._grade)) {
          const prev = this._grade;
          this._grade = grade;
          this.addDomainEvent(new UserGradeUpgraded(this.id.value, prev, grade));
        }
        break;
      }
    }
  }

  suspend(): void {
    if (this._status === UserStatus.WITHDRAWN) throw new DomainError('Withdrawn user cannot be suspended');
    this._status = UserStatus.SUSPENDED;
  }

  activate(): void {
    this._status = UserStatus.ACTIVE;
  }

  withdraw(): void {
    this._status = UserStatus.WITHDRAWN;
  }

  get email(): Email { return this._email; }
  get name(): string { return this._name; }
  get phone(): Phone | null { return this._phone; }
  get password(): HashedPassword { return this._password; }
  get status(): UserStatus { return this._status; }
  get grade(): UserGrade { return this._grade; }
  get points(): number { return this._points; }
  get totalSpent(): number { return this._totalSpent; }
  get addresses(): ReadonlyArray<UserAddress> { return this._addresses; }
  get createdAt(): Date { return this._createdAt; }
  get isActive(): boolean { return this._status === UserStatus.ACTIVE; }
}
