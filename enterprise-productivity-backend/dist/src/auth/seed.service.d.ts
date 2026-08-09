import { OnApplicationBootstrap } from '@nestjs/common';
import { UsersService } from '../users/users.service';
export declare const DEMO_ADMIN: {
    username: string;
    password: string;
    email: string;
    firstName: string;
    lastName: string;
};
export declare class SeedService implements OnApplicationBootstrap {
    private readonly usersService;
    private readonly logger;
    constructor(usersService: UsersService);
    onApplicationBootstrap(): Promise<void>;
}
