import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type ClerkClient } from '@clerk/backend';
export declare class ClerkService implements OnModuleInit {
    private readonly configService;
    private client;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    getClient(): ClerkClient;
}
