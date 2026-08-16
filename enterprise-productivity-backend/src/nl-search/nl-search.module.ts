import { Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StreamModule } from '../stream/stream.module';
import { UsersModule } from '../users/users.module';
import { NlSearchService } from './nl-search.service';
import { NlSearchController } from './nl-search.controller';
import { NL_SEARCH_PROVIDER, NlSearchProvider } from './nl-search.provider';
import { MockNlSearchProvider } from './providers/mock-nl-search.provider';
import { OpenAiNlSearchProvider } from './providers/openai-nl-search.provider';

/**
 * Provider selection is configurable via env (reusing the shared AI config):
 *   - AI_PROVIDER=mock (default) -> MockNlSearchProvider
 *   - AI_PROVIDER=openai + OPENAI_API_KEY -> OpenAiNlSearchProvider
 * OPENAI_MODEL and OPENAI_BASE_URL also apply.
 */
function buildProvider(configService: ConfigService): NlSearchProvider {
  const provider = configService.get<string>('ai.provider') ?? 'mock';

  if (provider === 'openai') {
    const apiKey = configService.get<string>('ai.openaiApiKey');
    if (apiKey) {
      return new OpenAiNlSearchProvider(
        apiKey,
        configService.get<string>('ai.openaiBaseUrl') ??
          'https://api.openai.com/v1',
        configService.get<string>('ai.openaiModel') ?? 'gpt-4o-mini',
      );
    }
    new Logger('NlSearchModule').warn(
      'AI_PROVIDER=openai is set but OPENAI_API_KEY is missing; falling back to the mock provider.',
    );
  }

  return new MockNlSearchProvider();
}

@Module({
  imports: [StreamModule, UsersModule],
  controllers: [NlSearchController],
  providers: [
    NlSearchService,
    {
      provide: NL_SEARCH_PROVIDER,
      useFactory: buildProvider,
      inject: [ConfigService],
    },
  ],
  exports: [NlSearchService],
})
export class NlSearchModule {}