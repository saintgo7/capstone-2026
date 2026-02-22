import { UserRepository } from '../../domain/repository/user-repository.js';
import { EventPublisher } from '../port/event-publisher.js';
import { PasswordHasher } from '../port/password-hasher.js';
import { TokenIssuer } from '../port/token-issuer.js';
import { User } from '../../domain/model/user.js';
import { Email } from '../../domain/value-object/email.js';
import { UserId } from '../../domain/value-object/user-id.js';
import { UserAddress } from '../../domain/value-object/address.js';
import { UserDTO, AddressDTO, AuthResultDTO } from '../dto/user-dto.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../../shared/domain/index.js';

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

export class UserCommandHandlers {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly publisher: EventPublisher,
    private readonly hasher: PasswordHasher,
    private readonly tokenIssuer: TokenIssuer,
  ) {}

  async register(cmd: {
    email: string;
    name: string;
    password: string;
    phone?: string;
  }): Promise<UserDTO> {
    const email = Email.create(cmd.email);
    if (await this.userRepo.existsByEmail(email)) {
      throw new ConflictError(`Email already registered: ${cmd.email}`);
    }

    const hashedPassword = await this.hasher.hash(cmd.password);
    const user = User.register({
      email: cmd.email,
      name: cmd.name,
      hashedPassword,
      phone: cmd.phone,
    });

    await this.userRepo.save(user);
    await this.publisher.publishAll(user.collectEvents());

    return toUserDTO(user);
  }

  async login(cmd: {
    email: string;
    password: string;
  }): Promise<AuthResultDTO> {
    const email = Email.create(cmd.email);
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new UnauthorizedError('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedError('Account is not active');

    const valid = await this.hasher.verify(cmd.password, user.password.hash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    const tokens = await this.tokenIssuer.issueTokens({
      userId: user.id.value,
      email: user.email.value,
      grade: user.grade,
    });

    return { user: toUserDTO(user), ...tokens };
  }

  async changePassword(cmd: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    const user = await this.userRepo.findById(UserId.create(cmd.userId));
    if (!user) throw new NotFoundError('User', cmd.userId);

    const valid = await this.hasher.verify(cmd.currentPassword, user.password.hash);
    if (!valid) throw new UnauthorizedError('Current password is incorrect');

    const newHash = await this.hasher.hash(cmd.newPassword);
    user.changePassword(newHash);

    await this.userRepo.save(user);
    await this.publisher.publishAll(user.collectEvents());
  }

  async updateProfile(cmd: {
    userId: string;
    name?: string;
    phone?: string;
  }): Promise<UserDTO> {
    const user = await this.userRepo.findById(UserId.create(cmd.userId));
    if (!user) throw new NotFoundError('User', cmd.userId);

    user.updateProfile({ name: cmd.name, phone: cmd.phone });
    await this.userRepo.save(user);

    return toUserDTO(user);
  }

  async addAddress(cmd: {
    userId: string;
    label: string;
    recipientName: string;
    phone: string;
    zipCode: string;
    address1: string;
    address2?: string;
    isDefault?: boolean;
  }): Promise<AddressDTO[]> {
    const user = await this.userRepo.findById(UserId.create(cmd.userId));
    if (!user) throw new NotFoundError('User', cmd.userId);

    const address = UserAddress.create({
      label: cmd.label,
      recipientName: cmd.recipientName,
      phone: cmd.phone,
      zipCode: cmd.zipCode,
      address1: cmd.address1,
      address2: cmd.address2,
      isDefault: cmd.isDefault,
    });

    user.addAddress(address);
    await this.userRepo.save(user);

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

  async removeAddress(cmd: { userId: string; addressId: string }): Promise<void> {
    const user = await this.userRepo.findById(UserId.create(cmd.userId));
    if (!user) throw new NotFoundError('User', cmd.userId);

    user.removeAddress(cmd.addressId);
    await this.userRepo.save(user);
  }

  async refreshToken(cmd: { refreshToken: string }): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = await this.tokenIssuer.verifyRefreshToken(cmd.refreshToken);

    const user = await this.userRepo.findById(UserId.create(payload.userId));
    if (!user) throw new UnauthorizedError('User not found');
    if (!user.isActive) throw new UnauthorizedError('Account is not active');

    const tokens = await this.tokenIssuer.issueTokens({
      userId: user.id.value,
      email: user.email.value,
      grade: user.grade,
    });

    return tokens;
  }
}
