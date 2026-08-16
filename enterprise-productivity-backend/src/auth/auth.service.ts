import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import type { User } from '../database/schema/users.schema';
import { RegisterDto } from './dto/register.dto';

export const BCRYPT_ROUNDS = 10;

const DUMMY_HASH = bcrypt.hashSync('dummy-time-equalizer', BCRYPT_ROUNDS);

export interface SerializedUser {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string;
  imageUrl: string | null;
  role: string;
  preferredLanguage: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: SerializedUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  serializeUser(user: User): SerializedUser {
    return {
      id: user.username,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || '',
      email: user.email,
      imageUrl: user.imageUrl,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private signToken(user: User): string {
    const payload = {
      sub: user.username,
      username: user.username,
      name: this.serializeUser(user).fullName,
      sessionId: `sess_${user.username}_${Date.now()}`,
    };
    return this.jwtService.sign(payload);
  }

  /** Builds a fresh session for a user (used after their identity changes). */
  issueSession(user: User): AuthSession {
    return { token: this.signToken(user), user: this.serializeUser(user) };
  }

  async login(identity: string, password: string): Promise<AuthSession> {
    const username = identity.trim();
    const user = await this.usersService.findByUsername(username);

    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'This account has no password set yet. Please ask an administrator to set one.',
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid username or password');

    return { token: this.signToken(user), user: this.serializeUser(user) };
  }

  async register(dto: RegisterDto): Promise<AuthSession> {
    const username = dto.username.trim();
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.usersService.createUser({
      username,
      email,
      passwordHash,
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
    });

    this.logger.log(`New account registered: ${username}`);

    return { token: this.signToken(user), user: this.serializeUser(user) };
  }

  async changePassword(
    username: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersService.findByUsername(username);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('This account has no password set yet.');
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.usersService.updatePassword(username, passwordHash);
  }
}