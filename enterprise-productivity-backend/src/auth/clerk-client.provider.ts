import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/backend';

export const CLERK_CLIENT = 'CLERK_CLIENT';

export const ClerkClientProvider: Provider = {
  provide: CLERK_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    return createClerkClient({
      secretKey: configService.get<string>('clerk.secretKey'),
      publishableKey: configService.get<string>('clerk.publishableKey'),
    });
  },
};
