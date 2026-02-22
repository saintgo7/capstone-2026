import { User } from '../model/user.js';
import { UserId } from '../value-object/user-id.js';
import { Email } from '../value-object/email.js';

export const USER_REPOSITORY = Symbol('UserRepository');

export interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  existsByEmail(email: Email): Promise<boolean>;
  findAll(options?: { limit?: number; offset?: number; status?: string }): Promise<User[]>;
  countAll(options?: { status?: string }): Promise<number>;
}
