import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<import("./auth.service").AuthSession>;
    register(dto: RegisterDto): Promise<import("./auth.service").AuthSession>;
    logout(): {
        ok: boolean;
    };
}
