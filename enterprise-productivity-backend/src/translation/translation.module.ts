import { Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { StreamModule } from '../stream/stream.module';
import { UsersModule } from '../users/users.module';
import { TranslationService } from './translation.service';
import { TranslationController } from './translation.controller';
import {
  TRANSLATION_PROVIDER,
  TranslationProvider,
} from './translation.provider';
import { MockTranslationProvider } from './providers/mock-translation.provider';
import { OpenAiTranslationProvider } from './providers/openai-translation.provider';

/**
 * Provider selection is configurable via env:
 *   - AI_PROVIDER=mock (default) -> MockTranslationProvider
 *   - AI_PROVIDER=openai + OPENAI_API_KEY -> OpenAiTranslationProvider
 */
function buildProvider(configService: ConfigService): TranslationProvider {
  const provider = configService.get<string>('ai.provider') ?? 'mock';

  if (provider === 'gemini' || provider === 'openai') {
    const apiKey =
      configService.get<string>('ai.geminiApiKey') ??
      configService.get<string>('ai.openaiApiKey');
    if (apiKey) {
      return new OpenAiTranslationProvider(
        apiKey,
        configService.get<string>('ai.geminiBaseUrl') ??
          configService.get<string>('ai.openaiBaseUrl') ??
          'https://generativelanguage.googleapis.com/v1beta',
        configService.get<string>('ai.geminiModel') ??
          configService.get<string>('ai.openaiModel') ??
          'gemini-2.0-flash',
      );
    }
    new Logger('TranslationModule').warn(
      'AI_PROVIDER=gemini/openai is set but the API key is missing; falling back to the mock provider.',
    );
  }

  return new MockTranslationProvider();
}

@Module({
  imports: [DatabaseModule, StreamModule, UsersModule],
  controllers: [TranslationController],
  providers: [
    TranslationService,
    {
      provide: TRANSLATION_PROVIDER,
      useFactory: buildProvider,
      inject: [ConfigService],
    },
  ],
  exports: [TranslationService],
})
export class TranslationModule {}