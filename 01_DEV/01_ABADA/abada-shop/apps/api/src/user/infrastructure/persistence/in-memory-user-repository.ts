import { User } from '../../domain/model/user.js';
import { UserId } from '../../domain/value-object/user-id.js';
import { Email } from '../../domain/value-object/email.js';
import { UserRepository } from '../../domain/repository/user-repository.js';

export class InMemoryUserRepository implements UserRepository {
  private readonly store = new Map<string, User>();

  async save(user: User): Promise<void> {
    this.store.set(user.id.value, user);
  }

  async findById(id: UserId): Promise<User | null> {
    return this.store.get(id.value) ?? null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    for (const user of this.store.values()) {
      if (user.email.value === email.value) return user;
    }
    return null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    for (const user of this.store.values()) {
      if (user.email.value === email.value) return true;
    }
    return false;
  }

  async findAll(options?: { limit?: number; offset?: number; status?: string }): Promise<User[]> {
    let users = Array.from(this.store.values());
    if (options?.status) users = users.filter(u => u.status === options.status);
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    return users.slice(offset, offset + limit);
  }

  async countAll(options?: { status?: string }): Promise<number> {
    let users = Array.from(this.store.values());
    if (options?.status) users = users.filter(u => u.status === options.status);
    return users.length;
  }
}
