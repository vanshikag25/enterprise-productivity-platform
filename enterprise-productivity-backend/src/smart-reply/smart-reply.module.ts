import { Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StreamModule } from '../stream/stream.module';
import { UsersModule } from '../users/users.module';
import { SmartReplyService } from './smart-reply.service';
import { SmartReplyController } from './smart-reply.controller';
import {
  SMART_REPLY_PROVIDER,
  SmartReplyProvider,
} from './smart-reply.provider';
import { MockSmartReplyProvider } from './providers/mock-smart-reply.provider';
import { OpenAiSmartReplyProvider } from './providers/openai-smart-reply.provider';

/**
 * Provider selection is configurable via env:
 *   - AI_PROVIDER=mock (default) -> MockSmartReplyProvider
 *   - AI_PROVIDER=openai + OPENAI_API_KEY -> OpenAiSmartReplyProvider
 */
function buildProvider(configService: ConfigService): SmartReplyProvider {
  const provider = configService.get<string>('ai.provider') ?? 'mock';

  if (provider === 'openai') {
    const apiKey = configService.get<string>('ai.openaiApiKey');
    if (apiKey) {
      return new OpenAiSmartReplyProvider(
        apiKey,
        configService.get<string>('ai.openaiBaseUrl') ??
          'https://api.openai.com/v1',
        configService.get<string>('ai.openaiModel') ?? 'gpt-4o-mini',
      );
    }
    new Logger('SmartReplyModule').warn(
      'AI_PROVIDER=openai is set but OPENAI_API_KEY is missing; falling back to the mock provider.',
    );
  }

  return new MockSmartReplyProvider();
}

@Module({
  imports: [StreamModule, UsersModule],
  controllers: [SmartReplyController],
  providers: [
    SmartReplyService,
    {
      provide: SMART_REPLY_PROVIDER,
      useFactory: buildProvider,
      inject: [ConfigService],
    },
  ],
  exports: [SmartReplyService],
})
export class SmartReplyModule {}
