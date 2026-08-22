import { Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { StreamModule } from '../stream/stream.module';
import { UsersModule } from '../users/users.module';
import { ActionDetectionService } from './action-detection.service';
import { ActionDetectionController } from './action-detection.controller';
import {
  ACTION_DETECTION_PROVIDER,
  ActionDetectionProvider,
} from './action-detection.provider';
import { MockActionDetectionProvider } from './providers/mock-action-detection.provider';
import { OpenAiActionDetectionProvider } from './providers/openai-action-detection.provider';

/**
 * Provider selection is configurable via env (shared with smart-reply):
 *   - AI_PROVIDER=mock (default) -> MockActionDetectionProvider
 *   - AI_PROVIDER=openai + OPENAI_API_KEY -> OpenAiActionDetectionProvider
 */
function buildProvider(configService: ConfigService): ActionDetectionProvider {
  const provider = configService.get<string>('ai.provider') ?? 'mock';

  if (provider === 'gemini' || provider === 'openai') {
    const apiKey =
      configService.get<string>('ai.geminiApiKey') ??
      configService.get<string>('ai.openaiApiKey');
    if (apiKey) {
      return new OpenAiActionDetectionProvider(
        apiKey,
        configService.get<string>('ai.geminiBaseUrl') ??
          configService.get<string>('ai.openaiBaseUrl') ??
          'https://generativelanguage.googleapis.com/v1beta',
        configService.get<string>('ai.geminiModel') ??
          configService.get<string>('ai.openaiModel') ??
          'gemini-2.0-flash',
      );
    }
    new Logger('ActionDetectionModule').warn(
      'AI_PROVIDER=gemini/openai is set but the API key is missing; falling back to the mock provider.',
    );
  }

  return new MockActionDetectionProvider();
}

@Module({
  imports: [DatabaseModule, StreamModule, UsersModule],
  controllers: [ActionDetectionController],
  providers: [
    ActionDetectionService,
    {
      provide: ACTION_DETECTION_PROVIDER,
      useFactory: buildProvider,
      inject: [ConfigService],
    },
  ],
  exports: [ActionDetectionService],
})
export class ActionDetectionModule {}
