import { DomainEvent } from '../../../shared/domain/index.js';

export class UserRegistered extends DomainEvent {
  readonly eventType = 'UserRegistered' as const;
  constructor(
    public readonly userId: string,
    public readonly email: string,
  ) { super(); }
}

export class UserLoggedIn extends DomainEvent {
  readonly eventType = 'UserLoggedIn' as const;
  constructor(
    public readonly userId: string,
    public readonly loginAt: Date,
  ) { super(); }
}

export class UserPasswordChanged extends DomainEvent {
  readonly eventType = 'UserPasswordChanged' as const;
  constructor(public readonly userId: string) { super(); }
}

export class UserGradeUpgraded extends DomainEvent {
  readonly eventType = 'UserGradeUpgraded' as const;
  constructor(
    public readonly userId: string,
    public readonly fromGrade: string,
    public readonly toGrade: string,
  ) { super(); }
}

export class PointEarned extends DomainEvent {
  readonly eventType = 'PointEarned' as const;
  constructor(
    public readonly userId: string,
    public readonly amount: number,
    public readonly reason: string,
  ) { super(); }
}

export class PointUsed extends DomainEvent {
  readonly eventType = 'PointUsed' as const;
  constructor(
    public readonly userId: string,
    public readonly amount: number,
    public readonly orderId: string,
  ) { super(); }
}
