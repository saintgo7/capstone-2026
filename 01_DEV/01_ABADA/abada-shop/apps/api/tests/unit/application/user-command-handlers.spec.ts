import { describe, it, expect, beforeEach } from 'vitest';
import { UserCommandHandlers } from '../../../src/user/application/command/user-command-handlers.js';
import { UserQueryHandlers } from '../../../src/user/application/query/user-query-handlers.js';
import { InMemoryUserRepository } from '../../../src/user/infrastructure/persistence/in-memory-user-repository.js';
import { SimplePasswordHasher } from '../../../src/user/infrastructure/persistence/bcrypt-password-hasher.js';
import { SimpleTokenIssuer } from '../../../src/user/infrastructure/persistence/jwt-token-issuer.js';
import { DomainEvent } from '../../../src/shared/domain/domain-event.js';
import { EventPublisher } from '../../../src/user/application/port/event-publisher.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../../src/shared/domain/errors.js';

class SpyEventPublisher implements EventPublisher {
  readonly published: DomainEvent[] = [];
  async publish(e: DomainEvent): Promise<void> { this.published.push(e); }
  async publishAll(events: DomainEvent[]): Promise<void> { this.published.push(...events); }
  reset(): void { this.published.length = 0; }
  ofType(type: string): DomainEvent[] { return this.published.filter(e => e.eventType === type); }
}

describe('UserCommandHandlers', () => {
  let repo: InMemoryUserRepository;
  let publisher: SpyEventPublisher;
  let commandHandlers: UserCommandHandlers;
  let queryHandlers: UserQueryHandlers;

  beforeEach(() => {
    repo = new InMemoryUserRepository();
    publisher = new SpyEventPublisher();
    commandHandlers = new UserCommandHandlers(
      repo, publisher,
      new SimplePasswordHasher(),
      new SimpleTokenIssuer('test-secret'),
    );
    queryHandlers = new UserQueryHandlers(repo);
  });

  describe('register', () => {
    it('사용자를 등록하고 DTO를 반환한다', async () => {
      const dto = await commandHandlers.register({
        email: 'user@abada.kr',
        name: 'Hong GilDong',
        password: 'password123!',
      });

      expect(dto.email).toBe('user@abada.kr');
      expect(dto.name).toBe('Hong GilDong');
      expect(dto.status).toBe('ACTIVE');
      expect(dto.grade).toBe('NORMAL');
    });

    it('등록 후 UserRegistered 이벤트를 발행한다', async () => {
      await commandHandlers.register({ email: 'user@abada.kr', name: 'Test', password: 'pass1234!' });
      expect(publisher.ofType('UserRegistered')).toHaveLength(1);
    });

    it('중복 이메일로 등록 시 ConflictError', async () => {
      await commandHandlers.register({ email: 'user@abada.kr', name: 'Test', password: 'pass1234!' });
      await expect(
        commandHandlers.register({ email: 'user@abada.kr', name: 'Test2', password: 'pass1234!' })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await commandHandlers.register({ email: 'user@abada.kr', name: 'Test', password: 'password123!' });
    });

    it('올바른 인증정보로 로그인하면 토큰을 반환한다', async () => {
      const result = await commandHandlers.login({
        email: 'user@abada.kr',
        password: 'password123!',
      });
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('user@abada.kr');
    });

    it('잘못된 비밀번호로 로그인 시 UnauthorizedError', async () => {
      await expect(
        commandHandlers.login({ email: 'user@abada.kr', password: 'wrongpass' })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('존재하지 않는 이메일로 로그인 시 UnauthorizedError', async () => {
      await expect(
        commandHandlers.login({ email: 'no@abada.kr', password: 'pass' })
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('updateProfile', () => {
    it('프로필을 업데이트한다', async () => {
      const user = await commandHandlers.register({ email: 'user@abada.kr', name: 'Old Name', password: 'pass1234!' });
      const updated = await commandHandlers.updateProfile({ userId: user.userId, name: 'New Name' });
      expect(updated.name).toBe('New Name');
    });

    it('존재하지 않는 사용자 업데이트 시 NotFoundError', async () => {
      await expect(
        commandHandlers.updateProfile({ userId: 'non-existent' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('addAddress', () => {
    it('주소를 추가하고 전체 주소 목록을 반환한다', async () => {
      const user = await commandHandlers.register({ email: 'user@abada.kr', name: 'Test', password: 'pass1234!' });
      const addresses = await commandHandlers.addAddress({
        userId: user.userId,
        label: '집',
        recipientName: '홍길동',
        phone: '01012345678',
        zipCode: '12345',
        address1: '서울시 강남구',
        isDefault: true,
      });
      expect(addresses).toHaveLength(1);
      expect(addresses[0]!.isDefault).toBe(true);
    });
  });
});
