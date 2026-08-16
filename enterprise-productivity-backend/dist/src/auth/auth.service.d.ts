import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import type { User } from '../database/schema/users.schema';
import { RegisterDto } from './dto/register.dto';
export declare const BCRYPT_ROUNDS = 10;
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
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly logger;
    constructor(usersService: UsersService, jwtService: JwtService);
    serializeUser(user: User): SerializedUser;
    private signToken;
    issueSession(user: User): AuthSession;
    login(identity: string, password: string): Promise<AuthSession>;
    register(dto: RegisterDto): Promise<AuthSession>;
    changePassword(username: string, currentPassword: string, newPassword: string): Promise<void>;
}
