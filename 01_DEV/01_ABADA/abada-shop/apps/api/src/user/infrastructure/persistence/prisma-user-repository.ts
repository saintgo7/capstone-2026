import { PrismaClient } from '@prisma/client';
import { User } from '../../domain/model/user.js';
import { UserId } from '../../domain/value-object/user-id.js';
import { Email } from '../../domain/value-object/email.js';
import { UserRepository } from '../../domain/repository/user-repository.js';

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: PrismaClient) {}

  async save(user: User): Promise<void> {
    await this.db.user.upsert({
      where: { id: user.id.value },
      create: {
        id: user.id.value,
        email: user.email.value,
        passwordHash: user.password.hash,
        name: user.name,
        phone: user.phone?.value ?? null,
        status: user.status as any,
        grade: user.grade as any,
      },
      update: {
        email: user.email.value,
        passwordHash: user.password.hash,
        name: user.name,
        phone: user.phone?.value ?? null,
        status: user.status as any,
        grade: user.grade as any,
      },
    });
  }

  async findById(id: UserId): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { id: id.value } });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.db.user.findFirst({ where: { email: email.value } });
    if (!row) return null;
    return this.toDomain(row);
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const count = await this.db.user.count({ where: { email: email.value } });
    return count > 0;
  }

  private toDomain(row: any): User {
    return User.reconstitute({
      id: row.id,
      email: row.email,
      name: row.name,
      hashedPassword: row.passwordHash,
      phone: row.phone ?? undefined,
      status: row.status,
      grade: row.grade,
      points: 0,
      totalSpent: 0,
      addresses: [],
      createdAt: row.createdAt,
    });
  }
}
