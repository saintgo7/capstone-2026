import { UserRepository } from '../../domain/repository/user-repository.js';
import { UserId } from '../../domain/value-object/user-id.js';
import { Email } from '../../domain/value-object/email.js';
import { UserDTO, AddressDTO } from '../dto/user-dto.js';
import { NotFoundError } from '../../../shared/domain/index.js';
import { User } from '../../domain/model/user.js';

function toUserDTO(user: User): UserDTO {
  return {
    userId: user.id.value,
    email: user.email.value,
    name: user.name,
    phone: user.phone?.formatted ?? null,
    status: user.status,
    grade: user.grade,
    points: user.points,
    totalSpent: user.totalSpent,
    createdAt: user.createdAt.toISOString(),
  };
}

export class UserQueryHandlers {
  constructor(private readonly userRepo: UserRepository) {}

  async getUser(query: { userId: string }): Promise<UserDTO> {
    const user = await this.userRepo.findById(UserId.create(query.userId));
    if (!user) throw new NotFoundError('User', query.userId);
    return toUserDTO(user);
  }

  async getAddresses(query: { userId: string }): Promise<AddressDTO[]> {
    const user = await this.userRepo.findById(UserId.create(query.userId));
    if (!user) throw new NotFoundError('User', query.userId);

    return user.addresses.map(a => ({
      id: a.id,
      label: a.label,
      recipientName: a.recipientName,
      phone: a.phone,
      zipCode: a.zipCode,
      address1: a.address1,
      address2: a.address2,
      isDefault: a.isDefault,
    }));
  }

  async getAllUsers(query: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<{ users: UserDTO[]; total: number }> {
    const [users, total] = await Promise.all([
      this.userRepo.findAll(query),
      this.userRepo.countAll({ status: query.status }),
    ]);
    return { users: users.map(toUserDTO), total };
  }
}
