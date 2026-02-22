import { describe, it, expect } from 'vitest';
import { User, UserStatus, UserGrade } from '../../../src/user/domain/model/user.js';
import { DomainError } from '../../../src/shared/domain/errors.js';

describe('User', () => {
  const makeUser = () => User.register({
    email: 'test@abada.kr',
    name: 'Test User',
    hashedPassword: 'sha256:' + 'a'.repeat(64),
  });

  describe('register', () => {
    it('ACTIVE 상태로 생성된다', () => {
      const user = makeUser();
      expect(user.status).toBe(UserStatus.ACTIVE);
    });

    it('NORMAL 등급으로 시작한다', () => {
      const user = makeUser();
      expect(user.grade).toBe(UserGrade.NORMAL);
    });

    it('포인트 0으로 시작한다', () => {
      const user = makeUser();
      expect(user.points).toBe(0);
    });

    it('UserRegistered 이벤트를 등록한다', () => {
      const user = makeUser();
      const events = user.collectEvents();
      expect(events).toHaveLength(1);
      expect(events[0]!.eventType).toBe('UserRegistered');
    });

    it('잘못된 이메일로 생성 시 DomainError', () => {
      expect(() => User.register({
        email: 'invalid-email',
        name: 'Test',
        hashedPassword: 'sha256:' + 'a'.repeat(64),
      })).toThrow(DomainError);
    });
  });

  describe('addAddress / removeAddress', () => {
    it('주소를 추가할 수 있다', async () => {
      const { UserAddress } = await import('../../../src/user/domain/value-object/address.js');
      const user = makeUser();
      const address = UserAddress.create({
        label: '집',
        recipientName: '홍길동',
        phone: '01012345678',
        zipCode: '12345',
        address1: '서울시 강남구',
      });
      user.addAddress(address);
      expect(user.addresses).toHaveLength(1);
    });

    it('10개 초과 주소 추가 시 DomainError', async () => {
      const { UserAddress } = await import('../../../src/user/domain/value-object/address.js');
      const user = makeUser();
      for (let i = 0; i < 10; i++) {
        user.addAddress(UserAddress.create({
          label: `주소${i}`,
          recipientName: '홍길동',
          phone: '01012345678',
          zipCode: '12345',
          address1: `서울시 ${i}`,
        }));
      }
      expect(() => user.addAddress(UserAddress.create({
        label: '추가',
        recipientName: '홍길동',
        phone: '01012345678',
        zipCode: '12345',
        address1: '서울시',
      }))).toThrow(DomainError);
    });
  });

  describe('earnPoints / usePoints', () => {
    it('포인트를 적립할 수 있다', () => {
      const user = makeUser();
      user.earnPoints(1000, '구매 적립');
      expect(user.points).toBe(1000);
    });

    it('포인트를 사용할 수 있다', () => {
      const user = makeUser();
      user.earnPoints(1000, '구매 적립');
      user.usePoints(500, 'order-001');
      expect(user.points).toBe(500);
    });

    it('잔액 부족 시 DomainError', () => {
      const user = makeUser();
      expect(() => user.usePoints(100, 'order-001')).toThrow(DomainError);
    });

    it('음수 포인트 적립 시 DomainError', () => {
      const user = makeUser();
      expect(() => user.earnPoints(-100, '잘못된 적립')).toThrow(DomainError);
    });
  });

  describe('등급 업그레이드', () => {
    it('100,000원 구매 시 SILVER로 업그레이드', () => {
      const user = makeUser();
      user.recordPurchase(100_000);
      const events = user.collectEvents();
      expect(events.some(e => e.eventType === 'UserGradeUpgraded')).toBe(true);
      expect(user.grade).toBe(UserGrade.SILVER);
    });
  });

  describe('상태 관리', () => {
    it('suspend() 호출 시 SUSPENDED 상태가 된다', () => {
      const user = makeUser();
      user.suspend();
      expect(user.status).toBe(UserStatus.SUSPENDED);
    });

    it('activate() 호출 시 ACTIVE 상태가 된다', () => {
      const user = makeUser();
      user.suspend();
      user.activate();
      expect(user.status).toBe(UserStatus.ACTIVE);
    });
  });
});
