import { Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { StreamModule } from '../stream/stream.module';
import { UsersModule } from '../users/users.module';
import { ConversationSummaryService } from './conversation-summary.service';
import { ConversationSummaryController } from './conversation-summary.controller';
import {
  CONVERSATION_SUMMARY_PROVIDER,
  ConversationSummaryProvider,
} from './conversation-summary.provider';
import { MockConversationSummaryProvider } from './providers/mock-conversation-summary.provider';
import { OpenAiConversationSummaryProvider } from './providers/openai-conversation-summary.provider';

/**
 * Provider selection is configurable via env:
 *   - AI_PROVIDER=mock  (default) -> MockConversationSummaryProvider
 *   - AI_PROVIDER=openai + OPENAI_API_KEY -> OpenAiConversationSummaryProvider
 */
function buildProvider(
  configService: ConfigService,
): ConversationSummaryProvider {
  const provider = configService.get<string>('ai.provider') ?? 'mock';

  if (provider === 'openai') {
    const apiKey = configService.get<string>('ai.openaiApiKey');
    if (apiKey) {
      return new OpenAiConversationSummaryProvider(
        apiKey,
        configService.get<string>('ai.openaiBaseUrl') ??
          'https://api.openai.com/v1',
        configService.get<string>('ai.openaiModel') ?? 'gpt-4o-mini',
      );
    }
    new Logger('ConversationSummaryModule').warn(
      'AI_PROVIDER=openai is set but OPENAI_API_KEY is missing; falling back to the mock provider.',
    );
  }

  return new MockConversationSummaryProvider();
}

@Module({
  imports: [DatabaseModule, StreamModule, UsersModule],
  controllers: [ConversationSummaryController],
  providers: [
    ConversationSummaryService,
    {
      provide: CONVERSATION_SUMMARY_PROVIDER,
      useFactory: buildProvider,
      inject: [ConfigService],
    },
  ],
  exports: [ConversationSummaryService],
})
export class ConversationSummaryModule {}
