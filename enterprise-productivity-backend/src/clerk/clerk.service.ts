import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, type ClerkClient } from '@clerk/backend';

@Injectable()
export class ClerkService implements OnModuleInit {
  private client!: ClerkClient;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const secretKey = this.configService.get<string>('clerk.secretKey');
    const publishableKey = this.configService.get<string>(
      'clerk.publishableKey',
    );

    this.client = createClerkClient({
      secretKey,
      publishableKey,
    });
  }

  getClient(): ClerkClient {
    return this.client;
  }
}
