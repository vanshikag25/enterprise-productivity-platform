import { Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { StreamModule } from '../stream/stream.module';
import { UsersModule } from '../users/users.module';
import { ProjectsModule } from '../projects/projects.module';
import { SentimentService } from './sentiment.service';
import { SentimentController } from './sentiment.controller';
import { SENTIMENT_PROVIDER, SentimentProvider } from './sentiment.provider';
import { MockSentimentProvider } from './providers/mock-sentiment.provider';
import { OpenAiSentimentProvider } from './providers/openai-sentiment.provider';

/**
 * Provider selection is configurable via env (reusing the shared AI config):
 *   - AI_PROVIDER=mock (default) -> MockSentimentProvider
 *   - AI_PROVIDER=openai + OPENAI_API_KEY -> OpenAiSentimentProvider
 * OPENAI_MODEL and OPENAI_BASE_URL also apply.
 */
function buildProvider(configService: ConfigService): SentimentProvider {
  const provider = configService.get<string>('ai.provider') ?? 'mock';

  if (provider === 'gemini' || provider === 'openai') {
    const apiKey =
      configService.get<string>('ai.geminiApiKey') ??
      configService.get<string>('ai.openaiApiKey');
    if (apiKey) {
      return new OpenAiSentimentProvider(
        apiKey,
        configService.get<string>('ai.geminiBaseUrl') ??
          configService.get<string>('ai.openaiBaseUrl') ??
          'https://generativelanguage.googleapis.com/v1beta',
        configService.get<string>('ai.geminiModel') ??
          configService.get<string>('ai.openaiModel') ??
          'gemini-2.0-flash',
      );
    }
    new Logger('SentimentModule').warn(
      'AI_PROVIDER=gemini/openai is set but the API key is missing; falling back to the mock provider.',
    );
  }

  return new MockSentimentProvider();
}

@Module({
  imports: [DatabaseModule, StreamModule, UsersModule, ProjectsModule],
  controllers: [SentimentController],
  providers: [
    SentimentService,
    {
      provide: SENTIMENT_PROVIDER,
      useFactory: buildProvider,
      inject: [ConfigService],
    },
  ],
  exports: [SentimentService],
})
export class SentimentModule {}